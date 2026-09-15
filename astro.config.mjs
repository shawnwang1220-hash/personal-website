// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  // sitemap / canonical / RSS 的绝对地址来源
  site: "https://blog.tianxu.uk",

  // 保留构建产物（dist/*.html）的换行与缩进，便于人工查看 / 调试。
  // 默认 true 会把整个 <head>、<main> 压成一整行；本站体积小，关掉几乎无成本。
  compressHTML: false,

  integrations: [
    sitemap({
      // 404 页不进 sitemap
      filter: (page) => !page.includes("404"),
    }),
  ],

  // 输出 /posts/xxx/index.html 形式，Cloudflare Pages 可直接以 /posts/xxx 访问
  build: {
    format: "directory",
  },

  markdown: {
    shikiConfig: {
      theme: "github-light",
      wrap: true,
    },
  },

  // 只放开 CSS 压缩：样式是自己写的，未压缩后约 20KB，便于人工阅读。
  // JS 保持压缩（默认 esbuild）——产物里 90% 是第三方 marked 库，
  // 把 vendor 代码反压缩只是白白涨 33KB，对可读性没有价值。
  vite: {
    build: {
      cssMinify: false,
    },
  },
});
