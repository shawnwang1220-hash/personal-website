# blog.tianxu.uk — Astro 静态博客

内容优先的静态博客，中英双语。每篇 `.md` 自动生成一个独立 URL，纯 HTML 输出、零客户端 JS。

- 中文站：`/`（默认语言，无路径前缀）
- 英文站：`/en`
- 正式域名：https://blog.tianxu.uk

## 分支与部署

**唯一活跃分支是 `main`。** 推送到 `main` 即由 Cloudflare Pages 自动构建并部署到 blog.tianxu.uk。
（CF Pages 上该仓库也会为其他分支生成 preview 部署，用于预览改动，属正常行为。）

> ### ⚠️ `gh-pages-test` 分支已废弃（2026-09-17）
>
> **不要重建、不要往这个分支上开发。** 该分支已在本地和远程一并删除，随它一起删除的还有
> `.github/workflows/deploy.yml`（GitHub Pages 部署 workflow）。
>
> **它当初是干什么的**：为排查「Cloudflare 缓存层（页面缓存 / Rocket Loader）与 GTM 加载冲突」
> 而搭的 GitHub Pages 平行部署 —— `shawnwang1220-hash.github.io/personal-website`，
> 靠 `astro.config.mjs` 里的 `site` / `base: "/personal-website"` + 全站 `noindex` +
> 把所有内部链接改写成 `import.meta.env.BASE_URL` 拼接，把同一份站点跑在子路径上做对照。
>
> **为什么废弃**：排查目的已达成；而该方案要求代码里到处带路径前缀，与 `main`（无前缀）
> 形成两套写法，每次改功能都要同步两边并分别适配，维护成本大于收益。
>
> **将来若确实需要独立测试站**：用 Cloudflare Pages 的分支 preview 部署即可（推分支自动出 preview URL），
> 不要再用 GitHub Pages 的 `base` 子路径方案。

推送方式（GitHub 连接器为只读，写操作需走 SSH 直连）：

```bash
GIT_SSH_COMMAND="ssh -o ProxyCommand=none -o BatchMode=yes" \
  git push git@github.com:shawnwang1220-hash/personal-website.git main:main
```

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # 产物输出到 dist/
```

> 本机环境（WorkBuddy 沙箱）装依赖需串行化补丁：`NODE_OPTIONS="--require /path/to/serial-fs.cjs" npm install`。普通机器直接 `npm install` 即可。

## 写文章

中文放 `src/content/posts/`，英文放 `src/content/posts/en/`。

```markdown
---
title: "标题"
description: "用于 SEO 描述与列表摘要"
pubDate: 2026-09-02
tags: ["ga4", "marketing"]
---
正文用 Markdown 写。
```

保存即生成 `/posts/<文件名>/` 独立页面（英文对应 `/en/posts/<文件名>/`），自动进 sitemap 与 RSS。

> **中英文件名必须一致**（如两边都叫 `ga4-migration.md`）。语言切换和 hreflang 靠「英文路径 = `/en` + 中文路径」
> 推导，文件名不一致会导致切换按钮跳到 404。

## 多语言

- 页面是**真·目录镜像**：`src/pages/xxx.astro` ↔ `src/pages/en/xxx.astro`，**新增页面必须成对创建**
- 文案统一从 `src/i18n/ui.ts` 取（`getSiteCopy(lang)` / `getUiCopy(lang)`），页面里不要硬编码文字
- 语言元信息（`html lang` / `og:locale` / 切换按钮文案）在 `src/i18n/config.ts`
- 标签中英用词不同的，登记到 `src/i18n/tags.ts`
- 共用组件（BaseLayout / Header / Footer / PostCard）通过 `lang` prop 切换语言，中文页面渲染结果不应改变

## 改站点信息

`src/site.config.ts`：站点标题、作者、社交链接、导航、GTM 容器 ID。**邮箱与手机号默认留空**，填了才会显示在简历页（Cloudflare 会自动做 Email Obfuscation 保护）。

## 打印简历

`/resume` 与 `/en/resume` 页面带「下载 / 打印 PDF」按钮。打印样式在 `src/styles/global.css` 的 `@media print` 块。

> ⚠️ **不要给 `.r-section` 加 `break-inside: avoid`**。「工作经历」整块高度远超一页，
> 强制「内部不断页」会把它整体推到下一页、留下整页空白。分页控制只作用在
> 「单条 bullet / 单条教育经历」这一级，`.job` 允许跨页。

## 部署到 Cloudflare Pages

1. 推到 GitHub 的 `main`。
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
  components/        Header / Footer / PostCard
  content/posts/     中文文章 .md
  content/posts/en/  英文文章 .md（与中文同名）
  data/about.md      首页「关于我」（中文）
  data/about.en.md   首页「关于我」（英文）
  i18n/              config（语言与路径推导）/ ui（文案字典）/ tags（标签中英映射）
  layouts/           BaseLayout（head / SEO / GTM / hreflang / 深色模式）
  pages/             index / posts / tags / resume / 404 / rss.xml
  pages/en/          英文站镜像页面
  site.config.ts     站点配置（GTM ID / 作者 / 导航）
  styles/global.css  全站样式（含打印样式）
public/              robots.txt / 头像 / favicon
```
