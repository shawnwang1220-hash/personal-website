/* =========================================================
   王天旭的个人博客 — 交互逻辑
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
  const ABOUT_MD = `## 你好，我是王天旭 👋

我是一名 **B2B 数字营销与 MarTech 顾问**，专注企业数字化获客体系与海外营销运营。

过去 7 年里，我既服务过成熟的 B2B SaaS 企业，也主导过传统企业的**海外数字营销体系 0-1 建设**——从官网、广告平台、Marketing Stack 到 Lead Management，搭起完整的数字化获客基础设施。

### 我擅长的事
- **数字化获客**：Google Ads、LinkedIn Ads 等海外渠道的规划与优化，建立广告与 CRM 的数据闭环
- **营销数据与 Tracking**：GA4 / GTM / Server-Side Tagging，主导 UA 向 GA4 迁移与归因体系建设
- **营销自动化 & CRM**：Pardot、Salesforce、6sense 等平台的跨系统协同与 Lead Management 全流程优化

### 我的信条
> 营销的尽头是增长，而增长的前提是可衡量的数据。

欢迎通过上方「简历」查看完整经历，或用下方编辑器试试 Markdown 🙂`;

  const POSTS = [
    {
      id: "b2b-funnel-0to1",
      title: "海外 B2B 数字营销体系：从 0 到 1 怎么搭",
      date: "2026-08-10",
      tags: ["海外营销", "获客体系"],
      excerpt: "传统企业出海，第一步不是投广告，而是先把数字化获客基础设施立起来……",
      markdown: `## 海外 B2B 数字营销体系：从 0 到 1 怎么搭

很多传统企业出海，第一步不是投广告，而是先把**获客基础设施**立起来。

### 四个核心模块
1. **官网与落地页**：承载流量与转化，是 Tracking 的起点
2. **广告平台**：Google Ads + LinkedIn Ads 组合覆盖搜索与决策人群
3. **Marketing Stack**：GA4、GTM、表单工具（如 Zoho Forms）打通数据流
4. **Lead Management**：从表单到 CRM 的路由与培育机制

### 一个最小可行的数据流
官网埋点 → GTM 采集 → GA4 汇聚 → 回传广告平台 → CRM 跟进

> 没有数据闭环，再多预算也只是"买曝光"。

把这套底座搭稳，后续优化才有抓手。`
    },
    {
      id: "ga4-migration",
      title: "GA4 事件追踪与归因：迁移 UA 的实战清单",
      date: "2026-08-12",
      tags: ["GA4", "Tracking"],
      excerpt: "迁移不是“换个工具”，而是重新定义你要衡量的事。一份可直接照做的清单。",
      markdown: `## GA4 事件追踪与归因：迁移 UA 的实战清单

Universal Analytics 已退役，GA4 是现在的事实标准。迁移不是“换个工具”，而是**重新定义你要衡量的事**。

### 迁移三步走
- **梳理业务目标**：先想清楚要追踪哪些关键动作（试用、演示申请、白皮书下载）
- **规划事件 schema**：用 \`event_name\` + \`params\` 而非 UA 的固化维度
- **配置归因**：默认数据驱动归因，必要时对比末次点击

### 常用事件示例
| 事件名 | 触发时机 | 关键参数 |
| --- | --- | --- |
| \`generate_lead\` | 表单提交 | \`lead_source\` |
| \`book_demo\` | 预约演示 | \`product\` |
| \`page_view\` | 页面浏览 | \`page_title\` |

\`\`\`js
gtag('event', 'generate_lead', {
  lead_source: 'linkedin_ads',
  value: 1
});
\`\`\`

> Tracking 的精度，决定了优化的上限。`
    },
    {
      id: "pardot-nurture",
      title: "用 Pardot 搭一条 Lead Nurture 自动化流程",
      date: "2026-08-18",
      tags: ["营销自动化", "Pardot"],
      excerpt: "线索不是“收到就转销售”，而是要在合适的时间、用合适的内容培育到 readiness。",
      markdown: `## 用 Pardot 搭一条 Lead Nurture 自动化流程

线索不是“收到就转销售”，而是要在合适的时间、用合适的内容**培育**到 readiness。

### 流程骨架
1. **捕获**：落地页表单 → 写入 Prospect
2. **评分**：按行为（打开、点击、访问定价页）累积分值
3. **分层**：达到阈值进入 MQL，自动路由给对应销售
4. **触达**：自动化邮件序列持续培育未达标线索

### 为什么值得做
- 销售只接"热的"线索，转化率更高
- 市场可量化每条内容的贡献
- Marketing 与 Sales 共用一套语言

> 自动化不是为了少做事，而是把人放在更该用力的地方。`
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
