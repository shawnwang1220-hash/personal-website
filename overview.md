# 个人博客网站（单页面 · 个人介绍主题）

## 完成内容
基于 GitHub 模板 [EruptionGuy/markdown-blog](https://github.com/EruptionGuy/markdown-blog)（HTML/CSS/JS + marked.js）二次开发，改造成**单页面个人介绍博客**。

## 交付文件
- `index.html` —— 单页面主文件（导航 / Hero / 关于 / 文章 / Markdown 编辑器 / 联系 / 页脚）
- `assets/style.css` —— 响应式样式，含浅色/深色双主题、自定义 Markdown 排版
- `assets/app.js` —— 交互逻辑（Markdown 渲染、文章阅读弹层、实时编辑器、主题切换、移动端菜单、滚动揭示）
- `assets/marked.min.js` —— 本地内置的 Markdown 解析器（离线可用，无需 CDN）
- `assets/avatar.svg` —— 内嵌头像（无外部图片依赖）
- `blog-template/` —— 原始 GitHub 模板克隆（仅作来源参考，可删除）

## 核心能力
1. **Markdown 渲染**：所有文章与「关于我」均由 marked.js 解析为带样式的 HTML；自定义 `.markdown-body` 样式覆盖标题/列表/代码/引用/表格/图片等，已用 Node 验证渲染正确。
2. **用户输入 → 即时 HTML**：内置「Markdown 编辑器」双栏（输入 / 实时预览），支持插入示例、清空、下载 `.md`、复制 HTML。
3. **响应式**：移动端汉堡菜单、栅格自适应；桌面端双栏编辑与多列文章卡片。
4. **阅读体验**：文章点击弹出阅读层；深色/浅色主题切换（记忆偏好）；返回顶部；滚动渐显动画；跳转锚点导航。
5. **零依赖离线**：内容内嵌、解析器本地化，直接双击 `index.html` 即可运行（无需服务器、无 CORS 问题）。

## 如何自定义
- 个人资料：编辑 `index.html` 中的姓名/简介/社交链接，以及 `assets/avatar.svg`。
- 文章与「关于我」内容：编辑 `assets/app.js` 顶部的 `ABOUT_MD` 与 `POSTS` 数组（Markdown 字符串）。
- 配色：修改 `assets/style.css` 中 `:root` 与 `[data-theme="dark"]` 的 CSS 变量。

## 验证
- `node --check` 通过 `app.js` / `marked.min.js` 语法检查。
- 经 Node 调用 marked 渲染样例 Markdown，h1/strong/code/ul/blockquote/table/pre 均正确生成。
- 本地 `python -m http.server` 验证 `/`、`style.css`、`app.js`、`marked.min.js`、`avatar.svg` 均返回 200。

## 附：本地预览
```
cd 项目目录
python -m http.server 8000   # 浏览器打开 http://localhost:8000
# 或直接双击 index.html
```
