// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  // sitemap / canonical / RSS 的绝对地址来源
  site: "https://blog.tianxu.uk",

  // 中英双语：中文为默认语言、不带路径前缀（保持既有 URL 不变）；
  // 英文挂在 /en 下。页面是真·镜像目录（src/pages/en/），这里只做声明。
  i18n: {
    defaultLocale: "zh",
    locales: ["zh", "en"],
    routing: { prefixDefaultLocale: false },
  },

  // 保留构建产物（dist/*.html）的换行与缩进，便于人工查看 / 调试。
  // 默认 true 会把整个 <head>、<main> 压成一整行；本站体积小，关掉几乎无成本。
  compressHTML: false,

  integrations: [
    sitemap({
      // 404 页不进 sitemap
      filter: (page) => !page.includes("404"),
      // 为中英互译页面生成 <xhtml:link rel="alternate"> 标注
      i18n: {
        defaultLocale: "zh",
        locales: { zh: "zh-CN", en: "en" },
      },
    }),
  ],

  // 页面 URL 一律带尾斜杠 —— 与 Cloudflare Pages 的实际行为对齐。
  // Pages 会把 /posts/xxx（无斜杠）308 跳到 /posts/xxx/；
  // 若 canonical / hreflang 仍输出无斜杠地址，等于指向重定向目标，hreflang 会被引擎忽略。
  trailingSlash: "always",

  // 输出 /posts/xxx/index.html 形式，Cloudflare Pages 可直接以 /posts/xxx/ 访问
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
