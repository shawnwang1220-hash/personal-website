#!/usr/bin/env node
/**
 * 构建产物 SEO 自检 —— 读 dist/，逐项断言，退出码非 0 即失败。
 *
 * 为什么需要它：`content.config.ts` 里 `cover` 用的是普通字符串而不是 Astro 的
 * `image()` 助手（图片由内容管线直接放进 public/，不走资源管线），代价是**路径写错
 * 不会构建失败**；同理 canonical / hreflang / 结构化数据的错误也全都是「页面照常
 * 渲染，只有搜索引擎受影响」，本地肉眼看不出来。这个脚本就是那层兜底。
 *
 * 用法：
 *   npm run build && npm run seo:check
 *   node scripts/seo-check.mjs --meta      # 追加元数据长度审计（非阻塞）
 *   node scripts/seo-check.mjs --dir=dist  # 改产物目录
 *
 * 设计约束：
 * - 只用 node 内置模块，不引第三方依赖（与本仓库「不加新依赖」的一贯做法一致）。
 * - 路径比较前一律 percent-解码：产物里的 canonical / hreflang 写的是
 *   `/tags/%E5%85%AC%E4%BC%97%E5%8F%B7%20API/`，而磁盘上的目录是 `/tags/公众号 API/`。
 *   不解码就把全部带空格和中文的标签页误报成死链。
 * - JSON-LD 一律 JSON.parse 后做结构化断言，**不要用正则**：产物是
 *   `JSON.stringify(x, null, 2)`，实际形态是 `"@type": "BlogPosting"`（冒号后有空格），
 *   用紧凑形态的正则会全部误报「缺失」。
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

// ─────────────────────────── 配置 ───────────────────────────

const SITE = "https://blog.tianxu.uk";
const DIST = resolve(
  process.cwd(),
  (process.argv.find((a) => a.startsWith("--dir=")) ?? "--dir=dist").slice("--dir=".length)
);
const WITH_META = process.argv.includes("--meta");

/** 元数据长度经验值：超过就被 SERP 截断。只提示、不拦截（内容侧的事）。 */
const META_LIMIT = {
  zh: { title: 34, description: 80 },
  en: { title: 60, description: 160 },
};

/** 文章页路径形态：/posts/<slug>/ 与 /en/posts/<slug>/ */
const POST_RE = /^\/(en\/)?posts\/([^/]+)\/$/;

// ─────────────────────────── 输出 ───────────────────────────

let fails = 0;
let warns = 0;
const fail = (m) => {
  console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
  fails++;
};
const warn = (m) => {
  console.log(`  \x1b[33mwarn\x1b[0m  ${m}`);
  warns++;
};
const ok = (m) => console.log(`  \x1b[32m ok \x1b[0m  ${m}`);
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

// ─────────────────────────── 工具 ───────────────────────────

/** 递归收集文件；默认只收 .html，传 true 收全部（sitemap / RSS / llms.txt 不是 .html） */
function walk(dir, all = false, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, all, out);
    else if (all || e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** 产物文件路径 → 页面 URL（/a/b/index.html → /a/b/；/404.html → /404.html） */
const fileToUrl = (f) => {
  const r = "/" + relative(DIST, f).split("\\").join("/");
  return r.endsWith("/index.html") ? r.slice(0, -"index.html".length) : r;
};

/** URL（绝对或相对）→ dist 下真实文件路径，先百分号解码 */
const urlToFile = (u) =>
  join(DIST, decode(u.replace(SITE, "").split(/[?#]/)[0]).replace(/^\//, ""));

const meta = (html, re) => (html.match(re) ?? [])[1];

// ─────────────────────────── 读取产物 ───────────────────────────

if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
  console.error(`产物目录不存在：${DIST}\n先跑 npm run build。`);
  process.exit(1);
}
if (!existsSync(join(DIST, "sitemap-0.xml"))) {
  console.error(
    `找不到 ${join(DIST, "sitemap-0.xml")}。\n` +
      `注意：若构建输出为空且退出码为 0，多半是构建被跑在沙箱里 —— ` +
      `@astrojs/sitemap 在构建结束后异步写盘，沙箱会静默拦掉。请在非沙箱下重跑构建。`
  );
  process.exit(1);
}

const htmlFiles = walk(DIST);
const pages = htmlFiles.map((f) => {
  const html = readFileSync(f, "utf8");
  const url = fileToUrl(f);
  const canonical = meta(html, /<link rel="canonical" href="([^"]+)"/);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const lang = url === "/en/" || url.startsWith("/en/") ? "en" : "zh";
  return { file: f, url, html, canonical, noindex, lang };
});

console.log(
  `\x1b[1mSEO 自检\x1b[0m  产物目录 ${relative(process.cwd(), DIST) || "."}  ·  ` +
    `${pages.length} 个页面`
);

// ─────────────────────────── 1. 路由成对 ───────────────────────────

section("1. 中英文章成对（缺一侧 = 另一侧 hreflang 与语言切换指向 404）");

const postUrls = new Set(pages.map((p) => p.url).filter((u) => POST_RE.test(u)));
const posts = { zh: [], en: [] };
for (const u of postUrls) {
  const m = POST_RE.exec(u);
  posts[m[1] ? "en" : "zh"].push(m[2]);
}
const unpaired = [
  ...posts.zh.filter((s) => !posts.en.includes(s)).map((s) => `缺英文稿：/posts/${s}/`),
  ...posts.en.filter((s) => !posts.zh.includes(s)).map((s) => `缺中文稿：/en/posts/${s}/`),
];
unpaired.length
  ? unpaired.forEach(fail)
  : ok(`${posts.zh.length} 篇文章中英成对（共 ${posts.zh.length * 2} 条路由）`);

// ─────────────────────────── 2. 逐页 head ───────────────────────────

section("2. 每页 canonical / hreflang / h1 / 分享图");

const pageByUrl = new Map(pages.map((p) => [p.url, p]));
const failsBefore = fails;

for (const p of pages) {
  const bad = [];

  // h1 唯一（布局渲染 <h1>{title}</h1>，正文若残留 `# 标题` 就会出两个）
  const h1n = (p.html.match(/<h1[\s>]/g) ?? []).length;
  if (h1n !== 1) bad.push(`h1 数量 = ${h1n}（应为 1）`);

  // 分享图：og:image / twitter:image 存在，且自托管图在 public/ 里真实存在
  const ogImage = meta(p.html, /<meta property="og:image" content="([^"]+)"/);
  const twImage = meta(p.html, /<meta name="twitter:image" content="([^"]+)"/);
  const card = meta(p.html, /<meta name="twitter:card" content="([^"]+)"/);
  if (!ogImage) bad.push("缺 og:image");
  if (ogImage !== twImage) bad.push("og:image 与 twitter:image 不一致");
  if (card !== "summary_large_image") bad.push(`twitter:card = ${card}`);
  if (!meta(p.html, /<meta property="og:image:alt" content="([^"]+)"/)) bad.push("缺 og:image:alt");
  if (ogImage?.startsWith(SITE) && !existsSync(urlToFile(ogImage)))
    bad.push(`og:image 文件不存在：${decode(ogImage.replace(SITE, ""))}`);

  // canonical / hreflang 对 noindex 页面无意义（布局本身也不输出 hreflang）
  if (!p.noindex) {
    // 比较前一律 percent-解码：产物里是 /tags/AI%20Agent/，而 URL 集合里是 /tags/AI Agent/
    const selfUrl = decode(SITE + p.url);
    if (decode(p.canonical ?? "") !== selfUrl)
      bad.push(`canonical = ${decode(p.canonical ?? "(无)")}，应为 ${selfUrl}`);
    // 解码后相等还不够：href 里若写的是原文（裸空格 / 中文），URL 本身是非法的，
    // 必须确认产物里存的是合法编码形态。
    if (p.canonical && (p.canonical.includes(" ") || /[^\x00-\x7F]/.test(p.canonical)))
      bad.push(`canonical 含未编码字符：${p.canonical}`);
    if (p.canonical && !p.canonical.endsWith("/") && !/\.[a-z0-9]+$/.test(p.canonical))
      bad.push(`canonical 缺尾斜杠：${decode(p.canonical)}`);

    const hl = {};
    for (const m of p.html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)) hl[m[1]] = decode(m[2]);
    const z = hl["zh-CN"] ?? "";
    const e = hl.en ?? "";
    const xd = hl["x-default"] ?? "";

    /**
     * 断言方式：**不要拿 hreflang 自己算期望值** —— 那样写出来的规则永远测不到。
     * 改为验证四条可独立查证的性质：
     *   ① 三个 hreflang 齐全；
     *   ② 目标页面真实存在；
     *   ③ 目标的语言与声明的 hreflang 相符（zh-CN 不能指向 /en/，反之亦然）；
     *   ④ **本页必须在自己的 hreflang 组里，且对侧页面必须指回本页** ——
     *      单边的互链对搜索引擎无效，这是最容易被写漏、也最值得强断言的一条。
     * 文章页额外强断言镜像规则 /posts/<slug>/ ↔ /en/posts/<slug>/。
     */
    if (!z) bad.push('缺 hreflang="zh-CN"');
    if (!e) bad.push('缺 hreflang="en"');
    if (!xd) bad.push('缺 hreflang="x-default"');

    const pair = [z, e].filter(Boolean);
    if (pair.length === 2) {
      if (!pair.includes(selfUrl))
        bad.push(`hreflang 组里没有本页地址 ${selfUrl.replace(SITE, "")} —— 本页在互链中成了孤儿`);

      const isEnUrl = (u) => u === `${SITE}/en/` || u.startsWith(`${SITE}/en/`);
      if (isEnUrl(z)) bad.push(`hreflang zh-CN 指向了英文页：${z.replace(SITE, "")}`);
      if (!isEnUrl(e)) bad.push(`hreflang en 指向了中文页：${e.replace(SITE, "")}`);
      for (const u of pair)
        if (!existsSync(urlToFile(u))) bad.push(`hreflang 指向不存在的页面：${u.replace(SITE, "")}`);
      if (xd !== z) bad.push(`x-default 未指向中文页（${xd.replace(SITE, "") || "(缺)"}）`);

      const otherUrl = pair.find((u) => u !== selfUrl);
      const otherPage = otherUrl ? pageByUrl.get(otherUrl.replace(SITE, "")) : undefined;
      if (otherPage && !otherPage.noindex) {
        const back = {};
        for (const m of otherPage.html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)) back[m[1]] = decode(m[2]);
        const wantTag = otherPage.lang === "en" ? "zh-CN" : "en";
        if (back[wantTag] !== selfUrl)
          bad.push(`${otherPage.url} 未反向指回本页（它为 ${wantTag} 指向 ${(back[wantTag] ?? "(缺)").replace(SITE, "")}）`);
      }
    }

    const mp = POST_RE.exec(p.url);
    if (mp) {
      const wantZ = `${SITE}/posts/${mp[2]}/`;
      const wantE = `${SITE}/en/posts/${mp[2]}/`;
      if (z && z !== wantZ) bad.push(`hreflang zh-CN 应为 ${wantZ.replace(SITE, "")}，实际 ${z.replace(SITE, "")}`);
      if (e && e !== wantE) bad.push(`hreflang en 应为 ${wantE.replace(SITE, "")}，实际 ${e.replace(SITE, "")}`);
    }
  }

  bad.forEach((b) => fail(`${p.url}  ${b}`));
}
if (fails === failsBefore)
  ok(`${pages.length} 个页面 canonical 自指、hreflang 互为镜像、h1 唯一、分享图齐全`);

// ─────────────────────────── 3. 结构化数据 ───────────────────────────

section("3. JSON-LD：同图注入、无悬空引用");

const jsonLdFailsBefore = fails;

for (const p of pages) {
  const blocks = [...p.html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (!blocks.length) {
    fail(`${p.url}  缺 JSON-LD`);
    continue;
  }

  let nodes = [];
  let parsed = true;
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      nodes = nodes.concat(Array.isArray(j["@graph"]) ? j["@graph"] : [j]);
    } catch (e) {
      fail(`${p.url}  JSON-LD 解析失败：${e.message}`);
      parsed = false;
    }
  }
  if (!parsed) continue;

  const ids = new Set(nodes.map((n) => n["@id"]).filter(Boolean));
  const types = new Set(nodes.map((n) => String(n["@type"])));

  // 悬空 @id：只在同页 @graph 内解析。搜索引擎按页面独立处理 JSON-LD，
  // 不会跨页面去找 /#person —— 悬空等于作者与发布者信息整段失效。
  const dangling = [];
  const scan = (o, k) => {
    if (Array.isArray(o)) return o.forEach((v) => scan(v, k));
    if (o && typeof o === "object") {
      if (o["@id"] && Object.keys(o).length === 1 && !ids.has(o["@id"])) dangling.push(`${k} → ${o["@id"]}`);
      for (const [key, v] of Object.entries(o)) scan(v, key);
    }
  };
  scan(nodes, "root");

  const bad = [];
  if (dangling.length) bad.push(`悬空 @id：${dangling.join("、")}`);
  if (!types.has("Person")) bad.push("缺 Person（全站作者实体）");
  if (!types.has("WebSite")) bad.push("缺 WebSite");

  // 文章页：BlogPosting 的必填与强推荐项
  const bp = nodes.find((n) => String(n["@type"]).includes("BlogPosting"));
  if (POST_RE.test(p.url)) {
    if (!bp) bad.push("缺 BlogPosting");
    else {
      const none = ["headline", "description", "datePublished", "author", "publisher", "image", "mainEntityOfPage"].filter(
        (f) => !bp[f]
      );
      if (none.length) bad.push(`BlogPosting 缺字段：${none.join("、")}`);
      if (bp.url !== SITE + p.url) bad.push(`BlogPosting.url 与 canonical 不一致：${bp.url}`);
      const want = p.lang === "en" ? "en" : "zh-CN";
      if (bp.inLanguage !== want) bad.push(`BlogPosting.inLanguage = ${bp.inLanguage}（应为 ${want}）`);
      // keywords 在产物里是逗号连接的字符串（schema.org 接受 Text 形态），也可能是数组 ——
      // 两种形态都接受，但「缺失」与「空值」都算问题：内容管线给了关键词就该输出。
      const kw = bp.keywords;
      if (!kw || (Array.isArray(kw) ? kw.length === 0 : String(kw).trim() === ""))
        bad.push("BlogPosting 缺 keywords（内容管线给了就应输出）");
    }
  }
  bad.forEach((b) => fail(`${p.url}  ${b}`));
}
if (fails === jsonLdFailsBefore)
  ok("所有页面含 Person + WebSite，文章页含完整 BlogPosting，无悬空引用");

// ─────────────────────────── 4. sitemap ───────────────────────────

section("4. sitemap 与页面集合一致");

const smLocs = [...readFileSync(join(DIST, "sitemap-0.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => decode(m[1])
);
const smSet = new Set(smLocs);
const expectSet = new Set(pages.filter((p) => !p.noindex).map((p) => SITE + p.url));

const missing = [...expectSet].filter((u) => !smSet.has(u));
const extra = [...smSet].filter((u) => !expectSet.has(u));
if (missing.length) fail(`sitemap 缺 ${missing.length} 条：${missing.slice(0, 5).map((u) => u.replace(SITE, "")).join("、")}`);
if (extra.length) fail(`sitemap 多 ${extra.length} 条：${extra.slice(0, 5).map((u) => u.replace(SITE, "")).join("、")}`);
if (!missing.length && !extra.length) ok(`${smLocs.length} 条 loc 与可索引页面集合完全一致`);

// ─────────────────────────── 5. RSS 与 llms.txt ───────────────────────────

section("5. RSS / llms.txt 收录");

for (const [file, lang] of [["rss.xml", "zh"], ["en/rss.xml", "en"]]) {
  const path = join(DIST, file);
  if (!existsSync(path)) {
    fail(`缺 ${file}`);
    continue;
  }
  const xml = readFileSync(path, "utf8");
  const links = [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => decode(m[1])).filter((u) => u.startsWith(SITE));
  const bad = [];
  for (const slug of posts[lang]) {
    const want = `${SITE}/${lang === "en" ? "en/" : ""}posts/${slug}/`;
    if (!links.includes(want)) bad.push(`未收录 ${want.replace(SITE, "")}`);
  }
  const noSlash = links.filter((u) => !u.endsWith("/") && !/\.[a-z0-9]+$/.test(u));
  if (noSlash.length) bad.push(`链接缺尾斜杠（会多一跳 308）：${noSlash.join("、")}`);
  bad.length ? bad.forEach((b) => fail(`${file}  ${b}`)) : ok(`${file} 收录全部 ${posts[lang].length} 篇${lang === "zh" ? "中" : "英"}文，链接均为最终地址`);
}

const llmsPath = join(DIST, "llms.txt");
if (!existsSync(llmsPath)) warn("无 llms.txt");
else {
  const txt = decode(readFileSync(llmsPath, "utf8"));
  const miss = [...postUrls].filter((u) => !txt.includes(u));
  miss.length
    ? fail(`llms.txt 未收录：${miss.map((u) => decode(u)).join("、")}`)
    : ok(`llms.txt 收录全部 ${postUrls.size} 条文章路由`);
}

// ─────────────────────────── 6. 元数据长度（可选） ───────────────────────────

if (WITH_META) {
  section("6. 元数据长度审计（非阻塞，内容侧决策）");
  let n = 0;
  for (const p of pages) {
    const limit = META_LIMIT[p.lang];
    const title = meta(p.html, /<title>([^<]*)<\/title>/) ?? "";
    const desc = meta(p.html, /<meta name="description" content="([^"]*)"/) ?? "";
    if (title.length > limit.title) {
      warn(`${p.url}  <title> ${title.length} 字（超 ${limit.title}）`);
      n++;
    }
    if (desc.length > limit.description) {
      warn(`${p.url}  description ${desc.length} 字（超 ${limit.description}）`);
      n++;
    }
  }
  if (!n) ok("无超长标题或描述");
}

// ─────────────────────────── 汇总 ───────────────────────────

console.log(
  `\n${fails === 0 ? "\x1b[32m通过\x1b[0m" : "\x1b[31m未通过\x1b[0m"}  ` +
    `${fails} 项失败 · ${warns} 项提示` +
    (WITH_META ? "" : "（加 --meta 可审计标题/描述长度）")
);
process.exit(fails === 0 ? 0 : 1);
