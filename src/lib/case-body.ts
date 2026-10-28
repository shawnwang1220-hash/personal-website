/**
 * 案例详情页的正文切分 —— 让 markdown 正文回到「问题 / 做法 / 结果 / 学到」四段里。
 *
 * 起因：案例的四段结论句放在 frontmatter（纯文本，模板直出 <p>），细节写进
 * markdown 正文。但 Astro 每个内容条目只有一个 <Content /> 插槽，正文只能整块
 * 渲染在四段之后 —— 结果就是「做法」的四步细节被甩到页面最底部，与所属小节
 * 隔了「结果」和「学到」两段，读起来是断的。
 *
 * 做法：渲染前按 `## ` 标题把正文切成块，标题命中四段之一的块跟随该小节渲染，
 * 其余块（附录、小结、旧案例的「数据口径」之类）仍按原顺序落在四段之后。
 * 不按此约定写的旧案例行为完全不变，因此是加法而不是破坏性改动。
 *
 * 只用 marked 解析 markdown（构建期执行，数据全来自仓库内的 md，可信）。
 * 不用 Astro 的 render：一个条目只能渲染一次，切不出分段。
 */

import { marked } from "marked";

export type CaseSectionId = "problem" | "approach" | "result" | "learned";

/**
 * 标题别名。匹配规则是「归一化后以关键词开头」，所以
 * `## 问题：如何…`、`## 一、问题`、`### 1. The problem: …` 都能命中。
 */
const ALIASES: Record<CaseSectionId, string[]> = {
  problem: ["问题", "背景", "problem", "context"],
  approach: ["做法", "方法", "approach"],
  result: ["结果", "result", "outcome"],
  learned: ["学到", "复盘", "反思", "learned", "lessons", "takeaways"],
};

/** 去掉「一、」「1.」「（1）」这类编号前缀，便于用关键词开头匹配 */
function normalizeHeading(heading: string): string {
  return heading
    .replace(/^[（(]?[一二三四五六七八九十百]+[）)、.．]\s*/, "")
    .replace(/^\d+(\.\d+)*[、.．)]\s*/, "")
    .trim()
    .toLowerCase();
}

export function classifyHeading(heading: string): CaseSectionId | null {
  const normalized = normalizeHeading(heading);
  if (!normalized) return null;
  for (const id of Object.keys(ALIASES) as CaseSectionId[]) {
    if (ALIASES[id].some((keyword) => normalized.startsWith(keyword))) return id;
  }
  return null;
}

export interface SplitCaseBody {
  /** 四段各自的细节 HTML；某段没写细节就没有对应 key */
  sections: Partial<Record<CaseSectionId, string>>;
  /** 未命中四段的块（含首个 `##` 之前的引言），拼好的 HTML，按原顺序 */
  rest: string;
}

function toHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true }) as string;
}

/**
 * @param body  Astro 内容条目的原始 markdown（`entry.body`）
 */
export function splitCaseBody(body: string | undefined): SplitCaseBody {
  if (!body || !body.trim()) return { sections: {}, rest: "" };

  // split 会吃掉分隔用的 `## `，所以标题自己就是每块的第一行
  const [lead, ...parts] = body.split(/^## +/m);
  const sections: Partial<Record<CaseSectionId, string>> = {};
  const rest: string[] = [];

  if (lead.trim()) rest.push(toHtml(lead.trim()));

  for (const part of parts) {
    const newline = part.indexOf("\n");
    const heading = (newline === -1 ? part : part.slice(0, newline)).trim();
    const markdown = newline === -1 ? "" : part.slice(newline + 1).trim();
    const id = classifyHeading(heading);

    if (id) {
      // 小节标题由模板出（四段各有一个 h2），这里把 `## xxx` 去掉只留内容
      sections[id] = (sections[id] ?? "") + toHtml(markdown);
    } else {
      // 未命中的块保留自己的 `## xxx`，否则标题会凭空消失
      rest.push(toHtml(`## ${heading}\n\n${markdown}`.trim()));
    }
  }

  return { sections, rest: rest.join("\n") };
}
