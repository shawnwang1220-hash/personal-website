/* =========================================================
   李明的个人博客 — 交互逻辑
   依赖：assets/marked.min.js
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. 配置 Markdown 解析器 ---------- */
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: true });
  }
  const renderMD = (md) => (window.marked ? marked.parse(md || "") : "<p>（Markdown 解析器未加载）</p>");

  /* ---------- 2. 内容数据（可在此自定义 / 扩展） ---------- */
  const ABOUT_MD = `## 你好，我是李明 👋

我是一名 **全栈开发者**，目前专注于 Web 前端与 Node.js 服务端。
平时喜欢把踩过的坑、读过的书、做过的项目整理成文字，于是有了这个博客。

### 我正在做的事
- 打磨一个面向小团队的 **任务协作工具**
- 学习 **Rust**，尝试用它写些命令行小工具
- 每周写一篇技术随笔，保持输出

### 我的信条
> 把复杂的事情做简单，是一种稀缺的能力。

如果你也在折腾有趣的东西，欢迎随时找我聊聊。`;

  const POSTS = [
    {
      id: "intro",
      title: "为什么我决定写博客",
      date: "2026-08-10",
      tags: ["随笔", "成长"],
      excerpt: "写作是最好的思考方式之一。这篇文章聊聊我开通这个博客的初衷……",
      markdown: `## 为什么我决定写博客

写作是最好的思考方式之一。很多东西你以为自己懂了，一旦要**写下来讲清楚**，才发现逻辑里全是漏洞。

### 三个小目标
1. **倒逼输入**：为了有东西可写，会更认真地去读、去试。
2. **沉淀经验**：把踩过的坑留在这里，下次不再重复。
3. **认识同好**：公开写作，让志同道合的人能找到我。

### 一段小代码
下面是我常用的「防抖」函数，简单却实用：

\`\`\`javascript
function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
\`\`\`

> 先完成，再完美。第一篇总是最难写的，但写完就好了。

欢迎在下方用编辑器试试 Markdown，看看实时排版效果 🙂`
    },
    {
      id: "markdown-guide",
      title: "Markdown 速查（本博客支持）",
      date: "2026-08-12",
      tags: ["教程", "Markdown"],
      excerpt: "标题、列表、代码块、表格、引用……一份可对照的 Markdown 写法清单。",
      markdown: `## Markdown 速查

本博客支持标准 **GitHub 风格 Markdown（GFM）**。下面列举常用语法。

### 标题与强调
\`# 一级标题\` · \`## 二级标题\`
**加粗**、*斜体*、\`行内代码\`、~~删除线~~。

### 列表
- 无序项 A
- 无序项 B
  - 嵌套项

1. 有序一
2. 有序二

### 表格
| 语法 | 说明 |
| --- | --- |
| \`#\` | 标题 |
| \`>\` | 引用 |
| \`-\` | 列表 |

### 引用
> 简洁清晰，比花哨更重要。

### 任务列表
- [x] 搭建博客
- [ ] 写满 10 篇文章`
    },
    {
      id: "tooling",
      title: "我的前端工具链 2026",
      date: "2026-08-18",
      tags: ["前端", "工具"],
      excerpt: "从编辑器到构建工具，聊聊我在 2026 年仍在坚持（或刚换上）的那套装备。",
      markdown: `## 我的前端工具链 2026

工具是手段，不是目的。下面是当前让我**最舒服**的一组合。

### 核心栈
- **语言**：TypeScript 优先
- **框架**：React + Vite
- **样式**：原生 CSS 变量 + 少量工具类

### 为什么偏爱纯静态
像这个博客一样，纯 HTML/CSS/JS 的好处是：

> 零构建、零依赖、双击即开，十年后还能跑。

当然，工程化项目另说。关键是**按需取舍**。

\`\`\`bash
# 本地预览（任选其一）
python -m http.server 8000
npx serve .
\`\`\`

![头像示意](${'assets/avatar.svg'})`
    }
  ];

  /* ---------- 3. 渲染「关于我」 ---------- */
  const aboutEl = document.getElementById("aboutContent");
  if (aboutEl) aboutEl.innerHTML = renderMD(ABOUT_MD);

  /* ---------- 4. 渲染文章列表 ---------- */
  const grid = document.getElementById("postGrid");
  if (grid) {
    POSTS.forEach((p) => {
      const card = document.createElement("article");
      card.className = "post-card reveal";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "阅读：" + p.title);
      card.innerHTML = `
        <h3>${p.title}</h3>
        <p class="excerpt">${p.excerpt}</p>
        <div class="post-tags">${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <div class="post-meta"><span>${p.date}</span><span class="dot"></span><span>点击阅读</span></div>`;
      const open = () => openReader(p);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
      grid.appendChild(card);
    });
  }

  /* ---------- 5. 阅读弹层 ---------- */
  const reader = document.getElementById("reader");
  const readerContent = document.getElementById("readerContent");
  function openReader(post) {
    if (!reader || !readerContent) return;
    readerContent.innerHTML = renderMD(post.markdown);
    reader.classList.add("open");
    reader.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeReader() {
    if (!reader) return;
    reader.classList.remove("open");
    reader.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  document.querySelectorAll("[data-close-reader]").forEach((el) =>
    el.addEventListener("click", closeReader)
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && reader && reader.classList.contains("open")) closeReader();
  });

  /* ---------- 6. Markdown 编辑器（实时预览） ---------- */
  const SAMPLE_MD = `# 实时 Markdown 编辑器

在左侧输入，右侧**即时**看到带样式的 HTML。

## 功能一览
- 支持 *斜体*、**加粗** 与 \`代码\`
- 支持列表、引用、表格
- 一键导出 .md 或复制 HTML

> 试着改改看，排版会立刻更新。

\`\`\`js
console.log("Hello, Markdown!");
\`\`\`
`;
  const mdInput = document.getElementById("mdInput");
  const mdPreview = document.getElementById("mdPreview");
  const editorHint = document.getElementById("editorHint");
  function updatePreview() {
    if (!mdInput || !mdPreview) return;
    mdPreview.innerHTML = renderMD(mdInput.value);
    const words = (mdInput.value.trim().match(/\S+/g) || []).length;
    if (editorHint) editorHint.textContent = `实时预览 · ${words} 词`;
  }
  if (mdInput) {
    mdInput.value = SAMPLE_MD;
    mdInput.addEventListener("input", updatePreview);
    updatePreview();
  }
  const bind = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener("click", fn); };
  bind("insertSample", () => { if (mdInput) { mdInput.value = SAMPLE_MD; updatePreview(); mdInput.focus(); } });
  bind("clearEditor", () => { if (mdInput) { mdInput.value = ""; updatePreview(); mdInput.focus(); } });
  bind("downloadMd", () => {
    if (!mdInput) return;
    const blob = new Blob([mdInput.value], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "my-post.md"; a.click();
    URL.revokeObjectURL(url);
  });
  bind("copyHtml", async () => {
    if (!mdPreview) return;
    try {
      await navigator.clipboard.writeText(mdPreview.innerHTML);
      flash("已复制 HTML 到剪贴板");
    } catch (_) {
      flash("复制失败，请手动选择");
    }
  });
  function flash(msg) {
    if (!editorHint) return;
    const old = editorHint.textContent;
    editorHint.textContent = msg;
    setTimeout(() => { editorHint.textContent = old; }, 1600);
  }

  /* ---------- 7. 主题切换（深色 / 浅色） ---------- */
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = themeToggle ? themeToggle.querySelector(".theme-icon") : null;
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    try { localStorage.setItem("blog-theme", theme); } catch (_) {}
  }
  const saved = (() => { try { return localStorage.getItem("blog-theme"); } catch (_) { return null; } })();
  applyTheme(saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  if (themeToggle) themeToggle.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  });

  /* ---------- 8. 移动端菜单 ---------- */
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      hamburger.classList.toggle("open", open);
      hamburger.setAttribute("aria-expanded", String(open));
    });
    navLinks.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        navLinks.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- 9. 返回顶部 ---------- */
  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("show", window.scrollY > 400);
    });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ---------- 10. 滚动揭示 ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- 11. 页脚年份 ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
