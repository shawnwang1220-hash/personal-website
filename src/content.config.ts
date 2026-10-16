import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * 文章 frontmatter schema —— 中英两个集合共用同一套字段。
 * 英文文章的 pubDate 与中文原文保持一致，保证两侧排序相同。
 */
const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  /**
   * 内容管线给出的长尾关键词。只用于 JSON-LD 的 keywords，不参与站内标签聚合
   * （标签是导航维度，关键词是检索维度，两者不要混用）。
   */
  keywords: z.array(z.string()).default([]),
  /**
   * 文章专属社交分享图：public 下的路径（如 /og/ai-agent-wechat.png，1200×630）。
   * 留空则回落到站点默认图（site.config.ts 的 ogImage）。
   *
   * 用普通字符串而不是 Astro 的 image() 助手：图片由内容管线产出并直接放进
   * public/，不走 Astro 的资源管线，构建期不做二次裁剪压缩。
   * 代价是路径写错不会构建失败 —— 由构建后的 SEO 校验脚本兜底。
   */
  cover: z.string().optional(),
  /** 分享图的替代文本，输出为 og:image:alt / twitter:image:alt */
  coverAlt: z.string().optional(),
  draft: z.boolean().default(false),
});

/**
 * 中文文章：src/content/posts/*.md
 * 每个 .md 文件自动成为一个独立 URL（/posts/<文件名>），无需手写路由。
 *
 * 必须显式排除 en/ 子目录 —— 否则英文文章会被中文集合重复收录，
 * 生成 /posts/en/xxx 这类错误路由。
 */
const posts = defineCollection({
  loader: glob({ pattern: ["**/*.md", "!en/**"], base: "./src/content/posts" }),
  schema: postSchema,
});

/**
 * 英文文章：src/content/posts/en/*.md
 * loader 的 base 直接指向 en 目录，因此文件 id 与中文同名文件一致
 * （en/ga4-migration.md → id "ga4-migration"），保证中英 URL 路径镜像，
 * 也简化了语言切换与 hreflang 的推导。
 */
const postsEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts/en" }),
  schema: postSchema,
});

/**
 * 工作经历：src/content/experience/*.md（英文在 en/ 子目录，与文章同构）。
 * 首页 Experience 摘要与 /experience 时间线共用这一份数据；
 * markdown 正文在页面上以 <details> 折叠展示。
 */
const experienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  /** "2025.10" 形式的年月。字符串即可，倒序按字典序 */
  start: z.string(),
  /** "至今" / "Present" */
  end: z.string(),
  summary: z.string().optional(),
  highlights: z.array(z.string()).default([]),
});

const experience = defineCollection({
  loader: glob({ pattern: ["**/*.md", "!en/**"], base: "./src/content/experience" }),
  schema: experienceSchema,
});

const experienceEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/experience/en" }),
  schema: experienceSchema,
});

/**
 * 案例：src/content/cases/*.md（英文在 en/ 子目录，文件名同名成对）。
 *
 * 结构对齐「问题 → 做法 → 结果 / 学到」：
 *   - problem / approach 必填，1–3 句结论式纯文本，模板用 <p> 直出；
 *   - result / learned 各自可选，但至少填一段（superRefine 强制）—— 对应「结果 / 学到」；
 *   - metric 是列表卡与详情页头部的核心结果数字（如 "+214%"），原 result 改名；
 *   - stack 是工具栈；
 *   - 数据表、口径说明、延伸链接等细节一律写进 markdown 正文，走 <Content />。
 *
 * 四段刻意保持**纯文本**，不支持行内 markdown：支持它就得 set:html，
 * 而仓库没有可复用的构建期 markdown 渲染器（marked 只是传递依赖）。
 * 富文本本来就该进正文，两处分工比让四段也支持 markdown 更清晰。
 *
 * 这里的 z 来自 astro:content 内嵌的 zod v3，因此用 .superRefine +
 * z.ZodIssueCode.custom 这一 v3 写法。
 */
const caseSchema = z
  .object({
    title: z.string(),
    /** 列表卡摘要 + 详情页 meta description：一句话 = 背景 + 角色 + 核心结果 */
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    /** 核心结果数字，列表卡大字号展示；无量化结果时可省略 */
    metric: z.string().optional(),
    /** 问题（背景并入开头） */
    problem: z.string().trim().min(1),
    /** 做法 */
    approach: z.string().trim().min(1),
    /** 结果（与 learned 至少一段） */
    result: z.string().optional(),
    /** 学到（与 result 至少一段） */
    learned: z.string().optional(),
    /** 工具栈 */
    stack: z.array(z.string()).default([]),
    cover: z.string().optional(),
    /** 分享图的替代文本，输出为 og:image:alt / twitter:image:alt */
    coverAlt: z.string().optional(),
    date: z.coerce.date(),
  })
  .superRefine((d, ctx) => {
    if (!d.result?.trim() && !d.learned?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result"],
        message: "案例需要「结果」或「学到」至少一段（填 result 或 learned）",
      });
    }
  });

/**
 * 必须显式排除 en/ 子目录 —— 否则英文案例会被中文集合重复收录，
 * 生成 /case/en/xxx 这类错误路由（与 posts 同构）。
 *
 * 下面两个 collection 的 pattern 还排除了「下划线开头的文件」，为的是让
 * _template.md 留在同目录当填写骨架、却永不被收成条目：glob loader 不认
 * 下划线约定，若不排除，_template 会生成 /case/_template/，而它的 hreflang
 * 指向不存在的 /en/case/_template/ —— seo:check 直接 FAIL。
 * 不用 Astro 文档推荐的「[^_]*」写法：那会连 ga4_migration 这类含下划线的
 * 正常文件名一起丢掉。
 */
const cases = defineCollection({
  loader: glob({ pattern: ["**/*.md", "!en/**", "!**/_*"], base: "./src/content/cases" }),
  schema: caseSchema,
});

const casesEn = defineCollection({
  loader: glob({ pattern: ["**/*.md", "!**/_*"], base: "./src/content/cases/en" }),
  schema: caseSchema,
});

export const collections = { posts, postsEn, experience, experienceEn, cases, casesEn };
