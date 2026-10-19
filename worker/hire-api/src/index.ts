/**
 * /hire 联系表单提交端点 —— 独立 Cloudflare Worker（不属于站点构建产物）。
 *
 * 职责边界：只做「接收 → 校验 → 落库 → 分发」。页面渲染在 Astro 侧，
 * 这里不产出任何 HTML（无 JS 提交时只做一次 303 跳回）。
 *
 * 处理顺序与容错（关键设计，勿随意调换）：
 *   ① 校验 Origin
 *   ② 解析 body（JSON 或原生表单）
 *   ③ 字段校验 + 长度截断
 *   ④ 写 D1            ← 这一步成功即视为「已收到」，直接返回成功
 *   ⑤ 写 Notion        ← 独立 try，失败只记日志
 *   ⑥ 发通知邮件        ← 独立 try，失败只记日志
 *
 * 为什么 ④ 成功就返回成功：数据已经落袋，Notion 或邮件挂掉不该让访客看到报错、
 * 也不该让他重填。失败的两步在 D1 里留下 notion_synced / mail_sent = 0 的痕迹，
 * 后续要补一个 Cron 重投也是从这两列捞。
 * 只有 ④ 本身失败才返回 5xx —— 此时前端会提示改用邮件兜底。
 */

/** D1 的最小类型声明：避免为端点引入 @cloudflare/workers-types 依赖 */
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<{ success: boolean }>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  DB: D1Database;
  /** 以下两项走 Secret，不进仓库 */
  NOTION_TOKEN: string;
  RESEND_API_KEY: string;
  /** 以下四项是普通 vars，写在 wrangler.toml */
  NOTION_DATABASE_ID: string;
  NOTIFY_TO: string;
  FROM_EMAIL: string;
  /** 逗号分隔可配多个来源域（主域迁移期两个域都要放行） */
  ALLOWED_ORIGIN: string;
}

/** 字段长度上限 —— 超出即截断，防止超长内容写进库 / Notion / 邮件 */
const MAX = { name: 100, email: 200, phone: 50, message: 5000 } as const;

const corsHeaders = (origin: string): Record<string, string> => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const jsonResponse = (data: unknown, status: number, origin: string): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });

/** 邮件正文里的用户输入必须转义，否则内容里的标签会被邮件客户端当结构解析 */
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clip = (s: string, max: number): string => s.trim().slice(0, max);

/**
 * 邮箱格式校验。前端 type="email" 只是第一道关（可被绕过），服务端必须自己判。
 * 规则刻意宽松：有且只有一个 @、两侧非空、域名含点、顶级域至少两位 ——
 * 目的是挡住手误（漏 @、漏域名），不是实现 RFC 5322。
 * 校验通过的值同时拿去做 reply_to —— 能回复才叫联系方式。
 */
const isEmail = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(s);

interface Submission {
  id: string;
  created_at: string;
  name: string;
  /** 必填且已过格式校验 */
  email: string;
  /** 选填，可能为空串 */
  phone: string;
  /** 选填，可能为空串 */
  message: string;
  ip: string;
  user_agent: string;
  referer: string;
  /** 无 JS 提交时用来跳回正确的语言版本 */
  backPath: string;
}

/** ⑤ Notion：每次提交在数据库里创建一个 page */
async function pushToNotion(env: Env, r: Submission): Promise<void> {
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      // 版本头固定住行为。升级前先核对 database_id / data source 的新写法 —— 待核实
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: env.NOTION_DATABASE_ID },
      /**
       * 属性名必须与 Notion 数据库里的一模一样，差一个字就是 400。
       *
       * 2026-10 起联系方式拆成 Email（email 类型）/ Phone（phone_number 类型）两列，
       * 由 MCP 直接建列，类型与下面这里必须对得上。
       * 历史「联系方式」列保留不删、新记录不再写入 —— 空值就是空值，
       * 不去猜旧的「邮箱或微信」哪个是哪个。
       */
      properties: {
        姓名: { title: [{ text: { content: r.name } }] },
        Email: { email: r.email },
        Phone: { phone_number: r.phone ? r.phone : null },
        需求: { rich_text: r.message ? [{ text: { content: r.message } }] : [] },
        时间: { date: { start: r.created_at } },
        来源: { select: { name: "hire 表单" } },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`notion ${res.status}: ${await res.text()}`);
  }
}

/** ⑥ Resend：给站长发一条通知 */
async function sendNotification(env: Env, r: Submission): Promise<void> {
  /** 主题里塞一句需求摘要；没填需求就退回「只有邮箱的提交」，不让主题空着 */
  const summary = r.message
    ? r.message.replace(/\s+/g, " ").slice(0, 40)
    : "no message";
  const empty = '<span style="color:#888">未填写</span>';
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [env.NOTIFY_TO],
      // 邮箱必填且已过校验，直接能回；电话只作补充，不做 reply_to
      reply_to: r.email,
      subject: `[Hire] ${r.name} — ${summary}`,
      html: [
        `<p><strong>姓名：</strong>${escapeHtml(r.name)}</p>`,
        `<p><strong>邮箱：</strong>${escapeHtml(r.email)}</p>`,
        `<p><strong>电话：</strong>${r.phone ? escapeHtml(r.phone) : empty}</p>`,
        `<p><strong>需求：</strong></p>`,
        r.message
          ? `<p style="white-space:pre-wrap">${escapeHtml(r.message)}</p>`
          : `<p>${empty}</p>`,
        `<hr />`,
        `<p style="color:#888;font-size:12px">提交时间 ${escapeHtml(r.created_at)} · 记录 ${escapeHtml(r.id)}</p>`,
      ].join("\n"),
    }),
  });
  if (!res.ok) {
    throw new Error(`resend ${res.status}: ${await res.text()}`);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";

    /**
     * Origin 白名单，**支持逗号分隔多个**。主域迁移期要同时放行 blog.tianxu.uk
     * 与 tianxu.uk：访客可能仍从旧域打开页面，只放行新域会让提交必然 403。
     *
     * 注意它挡不住脚本直连（伪造 Origin 零成本），作用只是不让别的网站把本站
     * 端点当成自己的表单后端。
     * 本地预览（localhost / 127.0.0.1）一并放行，便于 wrangler dev 联调。
     * 因此这里不把「缺少 Origin」当作拒绝理由 —— curl 联调就没有这个头。
     */
    const allowedOrigins = env.ALLOWED_ORIGIN.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    /** 白名单首个：既做 403 响应头的兜底，也做无 JS 提交回跳的基址 */
    const allowed = allowedOrigins[0] ?? "";
    const originOk =
      allowedOrigins.includes(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const responseOrigin = originOk ? origin : allowed;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(responseOrigin) });
    }
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, responseOrigin);
    }
    if (origin && !originOk) {
      return jsonResponse({ ok: false, error: "origin_not_allowed" }, 403, responseOrigin);
    }

    // ② 解析 body：带 JS 走 JSON，无 JS 的原生表单提交走 form-data
    const contentType = request.headers.get("Content-Type") ?? "";
    let payload: Record<string, unknown> = {};
    let isNativeFormPost = false;
    try {
      if (contentType.includes("application/json")) {
        payload = (await request.json()) as Record<string, unknown>;
      } else if (
        contentType.includes("form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        isNativeFormPost = true;
        payload = Object.fromEntries((await request.formData()).entries());
      } else {
        return jsonResponse({ ok: false, error: "unsupported_content_type" }, 415, responseOrigin);
      }
    } catch {
      return jsonResponse({ ok: false, error: "bad_payload" }, 400, responseOrigin);
    }

    // ③ 校验：email 必填且格式正确，phone / message 允许为空
    const name = clip(String(payload.name ?? ""), MAX.name);
    /**
     * 过渡兼容：2026-10 之前的前端发的是 contact（邮箱或微信合一）。
     * 留这条 fallback，worker 与页面就不必同时切换 —— 谁先上线都不会让表单报错。
     * 等新页面全量生效后可以删掉，微信 ID 会被下面的邮箱校验挡下，不会混进来。
     */
    const email = clip(String(payload.email ?? payload.contact ?? ""), MAX.email).toLowerCase();
    const phone = clip(String(payload.phone ?? ""), MAX.phone);
    const message = clip(String(payload.message ?? ""), MAX.message);
    if (!name || !email) {
      return jsonResponse({ ok: false, error: "missing_fields" }, 422, responseOrigin);
    }
    if (!isEmail(email)) {
      return jsonResponse({ ok: false, error: "invalid_email" }, 422, responseOrigin);
    }

    const referer = request.headers.get("Referer") ?? "";
    /** 无 JS 提交后的回跳地址：只认本站 /hire 或 /en/hire，避免开放重定向 */
    let backPath = "/hire/";
    try {
      const u = new URL(referer);
      if (allowedOrigins.includes(u.origin) && /^\/(en\/)?hire\/?$/.test(u.pathname)) {
        backPath = `${u.pathname.replace(/\/+$/, "")}/`;
      }
    } catch {
      /* Referer 缺失或非法 → 用默认值 */
    }

    const record: Submission = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      name,
      email,
      phone,
      message,
      ip: request.headers.get("CF-Connecting-IP") ?? "",
      user_agent: clip(request.headers.get("User-Agent") ?? "", 300),
      referer: clip(referer, 300),
      backPath,
    };

    // ④ 写 D1 —— 全部走参数化绑定，不做字符串拼接
    // contact 是 2026-10 前的历史列（NOT NULL），新记录填邮箱即可：既满足约束，
    // 也让按老列导出的脚本不至于拿到空值。结构化查询请用 email / phone。
    try {
      await env.DB.prepare(
        `INSERT INTO submissions (id, created_at, name, contact, email, phone, message, ip, user_agent, referer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          record.id,
          record.created_at,
          record.name,
          record.email,
          record.email,
          record.phone,
          record.message,
          record.ip,
          record.user_agent,
          record.referer
        )
        .run();
    } catch (err) {
      console.error("d1_insert_failed", err instanceof Error ? err.message : String(err));
      return jsonResponse({ ok: false, error: "storage_failed" }, 500, responseOrigin);
    }

    // ⑤⑥ 两个下游各自容错，互不阻塞
    let notionOk = false;
    let mailOk = false;
    try {
      await pushToNotion(env, record);
      notionOk = true;
    } catch (err) {
      console.error("notion_failed", err instanceof Error ? err.message : String(err));
    }
    try {
      await sendNotification(env, record);
      mailOk = true;
    } catch (err) {
      console.error("resend_failed", err instanceof Error ? err.message : String(err));
    }

    if (notionOk || mailOk) {
      // 补记同步状态；这一步失败不影响已经返回给访客的「已收到」
      await env.DB.prepare(`UPDATE submissions SET notion_synced = ?, mail_sent = ? WHERE id = ?`)
        .bind(notionOk ? 1 : 0, mailOk ? 1 : 0, record.id)
        .run()
        .catch(() => {});
    }

    if (isNativeFormPost) {
      // 无 JS 降级：303 跳回页面并带成功标记，避免访客重复提交
      return Response.redirect(`${allowed}${record.backPath}?sent=1`, 303);
    }

    return jsonResponse({ ok: true, id: record.id }, 200, responseOrigin);
  },
};
