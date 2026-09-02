import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * 文章集合：src/content/posts/*.md
 * 每个 .md 文件自动成为一个独立 URL（/posts/<文件名>），无需手写路由。
 */
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
