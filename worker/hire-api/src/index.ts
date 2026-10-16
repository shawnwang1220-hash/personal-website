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
const MAX = { name: 100, contact: 200, message: 5000 } as const;

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

/** 宽松的邮箱识别：只用于决定要不要设 reply_to，不用于校验字段合法性 */
const looksLikeEmail = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

interface Submission {
  id: string;
  created_at: string;
  name: string;
  contact: string;
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
      // 属性名必须与 Notion 数据库里的一模一样，差一个字就是 400
      properties: {
        姓名: { title: [{ text: { content: r.name } }] },
        联系方式: { rich_text: [{ text: { content: r.contact } }] },
        需求: { rich_text: [{ text: { content: r.message } }] },
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
  const summary = r.message.replace(/\s+/g, " ").slice(0, 40);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [env.NOTIFY_TO],
      // 联系方式是邮箱时直接可回复；是微信就退回默认收件箱
      ...(looksLikeEmail(r.contact) ? { reply_to: r.contact } : {}),
      subject: `[Hire] ${r.name} — ${summary}`,
      html: [
        `<p><strong>姓名：</strong>${escapeHtml(r.name)}</p>`,
        `<p><strong>联系方式：</strong>${escapeHtml(r.contact)}</p>`,
        `<p><strong>需求：</strong></p>`,
        `<p style="white-space:pre-wrap">${escapeHtml(r.message)}</p>`,
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

    // ③ 校验
    const name = clip(String(payload.name ?? ""), MAX.name);
    const contact = clip(String(payload.contact ?? ""), MAX.contact);
    const message = clip(String(payload.message ?? ""), MAX.message);
    if (!name || !contact || !message) {
      return jsonResponse({ ok: false, error: "missing_fields" }, 422, responseOrigin);
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
      contact,
      message,
      ip: request.headers.get("CF-Connecting-IP") ?? "",
      user_agent: clip(request.headers.get("User-Agent") ?? "", 300),
      referer: clip(referer, 300),
      backPath,
    };

    // ④ 写 D1 —— 全部走参数化绑定，不做字符串拼接
    try {
      await env.DB.prepare(
        `INSERT INTO submissions (id, created_at, name, contact, message, ip, user_agent, referer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          record.id,
          record.created_at,
          record.name,
          record.contact,
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
