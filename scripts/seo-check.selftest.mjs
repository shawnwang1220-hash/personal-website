#!/usr/bin/env node
/**
 * seo-check.mjs 的负向测试。
 *
 * 只跑正向校验有个致命盲区：断言写错了也会一路打印 ok —— 一个「永远通过」的检查脚本
 * 比没有检查更危险，因为它让人以为已经验过了。这里往产物**副本**里逐个注入已知缺陷，
 * 要求每一条都被报出、且退出码为 1；漏掉任何一条，就说明那条断言是假的。
 *
 * 用法：
 *   npm run build && node scripts/seo-check.selftest.mjs
 *
 * 注入目标从 dist/ 里动态挑选（首篇中文文章、首个中英成对标签），所以增删文章不会让
 * 测试失效；目标找不到时该条标记为「跳过」并计入汇总 —— 跳过必须显式可见，不能静默通过。
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const TMP = join(ROOT, "dist-selftest");
const CHECK = join(ROOT, "scripts", "seo-check.mjs");
const SITE = "https://blog.tianxu.uk";

if (!existsSync(DIST)) {
  console.error(`产物目录不存在：${DIST}\n先跑 npm run build。`);
  process.exit(1);
}

const subdirs = (d) => {
  try {
    return readdirSync(d).filter((n) => statSync(join(d, n)).isDirectory());
  } catch {
    return [];
  }
};

const zhSlugs = subdirs(join(DIST, "posts"));
const zhTags = subdirs(join(DIST, "tags"));
const pairedTag = subdirs(join(DIST, "en", "tags")).find((t) => zhTags.includes(t));

const slug = zhSlugs[0];
const otherSlug = zhSlugs[1];
const otherTag = zhTags.find((t) => t !== pairedTag);

/** 改产物副本里的文件；返回 false 表示内容没变（= 注入目标不在产物里，本条无法验证） */
const edit = (rel, fn) => {
  const p = join(TMP, rel);
  if (!existsSync(p)) return false;
  const before = readFileSync(p, "utf8");
  const after = fn(before);
  if (after === before) return false;
  writeFileSync(p, after);
  return true;
};

const drop = (rel) => {
  const p = join(TMP, rel);
  if (!existsSync(p)) return false;
  unlinkSync(p);
  return true;
};

const post = (s) => `posts/${s}/index.html`;
const enPost = (s) => `en/posts/${s}/index.html`;

const cases = [
  // ── 分享图与 hreflang 齐全性 ──
  ["缺 og:image:alt", "og:image:alt", () =>
    edit("en/index.html", (h) => h.replace(/<meta property="og:image:alt"[^>]*>\s*/g, ""))],

  ['缺 hreflang="en"', '缺 hreflang="en"', () =>
    edit("index.html", (h) => h.replace(/<link rel="alternate" hreflang="en"[^>]*>\s*/g, ""))],

  // ── canonical 形态 ──
  ["canonical 去尾斜杠", "缺尾斜杠", () =>
    edit(post(slug), (h) => h.replace(`href="${SITE}/posts/${slug}/"`, `href="${SITE}/posts/${slug}"`))],

  ["canonical 含未编码字符", "未编码字符", () =>
    edit(`tags/${pairedTag}/index.html`, (h) =>
      h.replace(/(<link rel="canonical" href=")([^"]+)(")/, (m, a, u, b) => a + u.slice(0, -1) + " /" + b)
    )],

  // ── 结构化数据 ──
  ["JSON-LD 悬空 @id", "悬空", () =>
    edit(post(slug), (h) => h.replace(`"@id": "${SITE}/#person"`, `"@id": "${SITE}/#ghost"`))],

  ["BlogPosting 缺 keywords", "keywords", () =>
    edit(post(slug), (h) => h.replace(/,\s*"keywords":\s*("[^"]*"|\[[^\]]*\])/, ""))],

  // ── 正文结构 ──
  ["正文多出一个 h1", "h1 数量", () =>
    edit(post(slug), (h) => h.replace(/<body([^>]*)>/, "<body$1><h1>注入的重复标题</h1>"))],

  // ── hreflang 正确性 ──
  ["hreflang 指向不存在的页", "不存在的页面", () =>
    edit(post(slug), (h) =>
      h.replace(/(<link rel="alternate" hreflang="en" href=")[^"]+(")/, `$1${SITE}/en/posts/__nonexistent__/$2`)
    )],

  ["文章 hreflang 镜像写错", "应为", () =>
    edit(enPost(slug), (h) => h.replace(/(hreflang="zh-CN" href=")[^"]+(")/, `$1${SITE}/posts/${otherSlug}/$2`))],

  ["标签页失去互指", "未反向指回本页", () =>
    edit(`en/tags/${pairedTag}/index.html`, (h) =>
      h.replace(/(hreflang="zh-CN" href=")[^"]+(")/, `$1${SITE}/tags/${encodeURIComponent(otherTag)}/$2`)
    )],

  // ── 收录面 ──
  ["sitemap 漏一条", "sitemap 缺", () =>
    edit("sitemap-0.xml", (h) => h.replace(new RegExp(`<url>\\s*<loc>[^<]*/posts/${slug}/</loc>[\\s\\S]*?</url>`), ""))],

  ["RSS 漏一篇", "未收录", () =>
    edit("rss.xml", (h) => h.replace(new RegExp(`<item>[\\s\\S]*?/posts/${slug}/[\\s\\S]*?</item>`), ""))],

  ["少一篇英文稿", "缺英文稿", () => drop(enPost(slug))],
];

let caught = 0;
const missed = [];
const skipped = [];

for (const [name, needle, mutate] of cases) {
  rmSync(TMP, { recursive: true, force: true });
  cpSync(DIST, TMP, { recursive: true });

  let injected = false;
  try {
    injected = mutate() !== false;
  } catch {
    injected = false;
  }

  if (!injected) {
    console.log(` 跳过  ${name}  —— 产物里找不到注入目标，本条未验证`);
    skipped.push(name);
    continue;
  }

  let out = "";
  let code = 0;
  try {
    out = execFileSync(process.execPath, [CHECK, "--dir=dist-selftest"], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    out = (e.stdout ?? "") + (e.stderr ?? "");
    code = e.status ?? -1;
  }

  const hit = out.includes(needle) && code === 1;
  console.log(
    `${hit ? "\x1b[32m 捕获\x1b[0m" : "\x1b[31m 漏检\x1b[0m"}  ${name.padEnd(22)} 退出码=${code}` +
      (hit ? "" : `  期望命中：${needle}`)
  );
  hit ? caught++ : missed.push(name);
}

rmSync(TMP, { recursive: true, force: true });

const ran = cases.length - skipped.length;
console.log(
  `\n负向测试：${caught}/${ran} 个注入缺陷被捕获` +
    (skipped.length ? ` · ${skipped.length} 条跳过` : "") +
    (missed.length ? ` · \x1b[31m漏检：${missed.join("、")}\x1b[0m` : "")
);
process.exit(missed.length ? 1 : 0);
