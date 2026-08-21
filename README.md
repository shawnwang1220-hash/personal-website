# 个人博客网站（单页面 · 个人介绍）

基于 GitHub 模板 [EruptionGuy/markdown-blog](https://github.com/EruptionGuy/markdown-blog)（HTML/CSS/JS + marked.js）二次开发而成的**单页面个人介绍博客**。

## 特性

- **Markdown 渲染**：文章与「关于我」由本地内置的 `marked.js` 解析为带样式的 HTML，支持标题、列表、代码、引用、表格、图片等。
- **实时编辑器**：内置双栏 Markdown 编辑器（输入 / 实时预览），支持插入示例、清空、下载 `.md`、复制 HTML。
- **响应式设计**：移动端汉堡菜单、栅格自适应；桌面端双栏编辑与多列文章卡片。
- **阅读体验**：文章点击弹出阅读层；深 / 浅色主题切换（记忆偏好）；返回顶部；滚动渐显动画；锚点导航。
- **零依赖离线**：内容内嵌、解析器本地化，直接双击 `index.html` 即可运行（无需服务器、无 CDN、无 CORS 问题）。

## 目录结构

```
.
├── index.html            # 单页面主文件（导航 / Hero / 关于 / 文章 / 编辑器 / 联系 / 页脚）
├── assets/
│   ├── style.css         # 响应式样式 + 浅/深双主题 + Markdown 排版
│   ├── app.js            # 交互逻辑（渲染 / 阅读层 / 编辑器 / 主题 / 菜单 / 渐显）
│   ├── marked.min.js     # 本地 Markdown 解析器（离线可用）
│   └── avatar.svg        # 内嵌头像（无外部图片）
└── README.md
```

## 本地预览

```bash
cd 项目目录
python -m http.server 8000
# 浏览器打开 http://localhost:8000
# 或直接双击 index.html
```

## 自定义

- **个人资料**：编辑 `index.html` 中的姓名 / 简介 / 社交链接，以及 `assets/avatar.svg`。
- **文章与「关于我」**：编辑 `assets/app.js` 顶部的 `ABOUT_MD` 与 `POSTS` 数组（Markdown 字符串）。
- **配色**：修改 `assets/style.css` 中 `:root` 与 `[data-theme="dark"]` 的 CSS 变量。

## 部署

本项目为纯静态站点，可直接托管到任意静态托管服务（如 Cloudflare Pages、GitHub Pages、Vercel 等）。以 Cloudflare Pages 为例：

```bash
npx wrangler pages deploy ./dist --project-name=personal-blog
```
