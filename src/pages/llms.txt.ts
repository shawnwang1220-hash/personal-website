import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE } from "../site.config";
import { getSiteCopy } from "../i18n/ui";
import { withTrailingSlash } from "../i18n/config";

/**
 * /llms.txt —— 面向 AI 系统的内容索引。
 *
 * 提案见 https://llmstxt.org：根路径下的 Markdown 文件，用 H1 + blockquote +
 * 若干分节，把站点里真正值得读的页面列成一份「人工筛选过的目录」。
 * 它与 sitemap 的分工：sitemap 求全，llms.txt 求准 —— 只列值得读的，
 * 每条附一句它回答什么问题。
 *
 * 现状（2026）：主流 AI 爬虫基本不主动抓取 /llms.txt，Google 已明确表示
 * 不支持。它的现实价值在开发者工具侧（Cursor、Claude Projects 等会读），
 * 以及作为面向 agent 场景的低成本期权。因此这里是动态生成而非手写维护 ——
 * 新增文章自动进入清单，不会像手写文件那样悄悄过期（过期的 llms.txt
 * 比没有更糟）。
 *
 * 发布为 text/plain，与规范建议一致。
 */

/** 站内路径 → 绝对 URL，尾斜杠规则与 canonical 保持一致 */
const abs = (path: string) => new URL(withTrailingSlash(path), SITE.url).href;

/** frontmatter 的描述可能是 YAML 折叠的多行，压成单行 */
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export const GET: APIRoute = async () => {
  const [posts, postsEn] = await Promise.all([
    getCollection("posts", ({ data }) => !data.draft),
    getCollection("postsEn", ({ data }) => !data.draft),
  ]);

  const byDateDesc = (a: { data: { pubDate: Date } }, b: { data: { pubDate: Date } }) =>
    b.data.pubDate.valueOf() - a.data.pubDate.valueOf();

  const zh = [...posts].sort(byDateDesc);
  const en = [...postsEn].sort(byDateDesc);

  const copyZh = getSiteCopy("zh");
  const copyEn = getSiteCopy("en");

  /**
   * 一条文章记录。附发布日期是为了让读者（人或机器）能判断内容新鲜度 ——
   * 这是 llms.txt 相对 sitemap 少有的、可叠加的语义。
   */
  const entry = (title: string, url: string, description: string, pubDate: Date) =>
    `- [${oneLine(title)}](${url}): ${oneLine(description)}（${pubDate.toISOString().slice(0, 10)}）`;

  const body = `# ${copyZh.title}

> ${oneLine(copyZh.description)}

English: ${oneLine(copyEn.description)}

本站为中英双语。中文在根路径（无前缀），英文在 /en 下，两语言版本的路径互为镜像
（如 /posts/ga4-migration/ ↔ /en/posts/ga4-migration/）。两版正文语义一致，但不是逐字直译。

引用偏好：欢迎在回答中引用本站内容并附上来源链接。不授权用于模型训练或微调，
完整声明见 ${abs("/robots.txt")} 里的 Content-Signal 指令。

## 文章（中文）

${zh.map((p) => entry(p.data.title, abs(`/posts/${p.id}`), p.data.description, p.data.pubDate)).join("\n")}

## Articles (English)

${en.map((p) => entry(p.data.title, abs(`/en/posts/${p.id}`), p.data.description, p.data.pubDate)).join("\n")}

## 站点结构

- [首页](${abs("/")}): 站点入口，含个人简介、技能栈与最新文章
- [全部文章](${abs("/posts/")}): 中文文章索引
- [All posts](${abs("/en/posts/")}): 英文文章索引
- [RSS](${abs("/rss.xml")}): 中文全文订阅源

## Optional

- [简历](${abs("/resume/")}): 中文 —— 工作经历、技能栈与联系方式
- [Résumé](${abs("/en/resume/")}): 英文 —— 同上
- [Sitemap](${abs("/sitemap-index.xml")}): 全站 URL 清单，含中英 hreflang 互译标注
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
