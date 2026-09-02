# blog.tianxu.uk — Astro 静态博客

内容优先的静态博客。每篇 `.md` 自动生成一个独立 URL，纯 HTML 输出、零客户端 JS（仅 `/editor` 页加载 Markdown 渲染器）。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 产物输出到 dist/
```

> 本机环境（WorkBuddy 沙箱）装依赖需串行化补丁：`NODE_OPTIONS="--require /path/to/serial-fs.cjs" npm install`。普通机器直接 `npm install` 即可。

## 写文章

在 `src/content/posts/` 新建一个 `.md`：

```markdown
---
title: "标题"
description: "用于 SEO 描述与列表摘要"
pubDate: 2026-09-02
tags: ["ga4", "marketing"]
---
正文用 Markdown 写。
```

保存即生成 `/posts/<文件名>/` 独立页面，自动进 sitemap 与 RSS。

## 改站点信息

`src/site.config.ts`：站点标题、作者、社交链接、导航。**邮箱与手机号默认留空**，填了才会显示在简历页（Cloudflare 会自动做 Email Obfuscation 保护）。

## 部署到 Cloudflare Pages

1. 推到 GitHub。
2. CF Pages 新建项目 → 连接该仓库。
3. 构建设置：
   - Framework preset：**Astro**
   - Build command：`npm run build`
   - Output directory：`dist`
4. 部署完成后，Google Search Console 提交 `sitemap-index.xml`，并对首页点「请求编入索引」。

> 不要选 SPA 预设。Astro 输出的是纯静态文件，`dist` 里缺的文件 CF 会正确返回 404（原站 SPA fallback 吞 404 的坑已根治）。

## 目录结构

```
src/
  components/        Header / Footer / PostCard / MarkdownEditor
  content/posts/     文章 .md 源文件
  data/about.md      首页「关于我」
  layouts/           BaseLayout（head / SEO / 深色模式）
  pages/             index / posts / tags / editor / resume / 404 / rss.xml
  site.config.ts     站点配置
public/              robots.txt / 头像 / favicon
```
