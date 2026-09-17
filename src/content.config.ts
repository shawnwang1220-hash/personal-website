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

export const collections = { posts, postsEn };
