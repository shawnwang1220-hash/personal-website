// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  // sitemap / canonical / RSS 的绝对地址来源
  site: "https://blog.tianxu.uk",

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
});
