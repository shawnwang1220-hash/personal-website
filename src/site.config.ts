/**
 * 站点全局配置 —— 改这里就够了，所有页面会自动同步。
 */
export const SITE = {
  /** 部署后的正式域名，用于 sitemap / canonical / RSS 的绝对地址 */
  url: "https://blog.tianxu.uk",

  /** 站点名称（用于 og:site_name、RSS、JSON-LD） */
  title: "王天旭 · 数字营销与 MarTech",

  /** 站点默认描述 */
  description:
    "王天旭的个人空间 —— B2B 数字营销与 MarTech 顾问，专注海外获客体系、GA4 数据追踪与营销自动化。",

  author: {
    name: "王天旭",
    alternateName: "Shawn Wang",
    role: "数字营销 & MarTech 顾问 · 海外 B2B 获客",
    /** 一句话简介，用于首页 hero 与 JSON-LD */
    summary:
      "7 年 B2B 数字营销经验，专注企业数字化获客体系与海外营销运营。这里记录营销实践、工具方法与可复用的思路。",
    location: "中国 · 北京",
    /**
     * 真实联系邮箱：简历页会渲染为 mailto 链接。
     * Cloudflare 的 Email Obfuscation 会对页面上的邮箱做混淆保护。
     */
    email: "shawnwang1220@gmail.com",
    /** 留空 → 简历页显示「电话待补充」。务必留空或填真实号码，不要填占位号码（会被公开渲染） */
    phone: "",
  },

  /**
   * 社交主页。BaseLayout 会把这里的每个地址自动纳入 JSON-LD 的 Person.sameAs ——
   * sameAs 是搜索引擎与 AI 判断「这些主页背后是同一个人」的主要依据，缺一个
   * 就少一条实体消歧的线索。新增账号只需在这里加一条，无需改布局。
   */
  social: {
    github: "https://github.com/shawnwang1220-hash",
    linkedin: "https://www.linkedin.com/in/tianxu-wang/",
  },

  /**
   * 默认社交分享图（1200×630 PNG，放 public/ 下）。
   *
   * 中英各一张：卡片上印的是姓名与方向，另一种语言的页面用中文卡片
   * （或反过来）会让分享出去的第一印象就是错的。
   * 单篇文章可用 frontmatter 的 cover 覆盖。
   *
   * 模板在 scripts/og-card.html，改动后用本机 Chrome 无头截图重新生成。
   */
  ogImage: {
    zh: "/og-default.png",
    en: "/og-default-en.png",
  },

  /** 分享图尺寸，供 og:image:width / height —— 平台首次抓取时按此比例裁剪，缺失易被裁错 */
  ogImageSize: { width: 1200, height: 630 },

  /** Google Tag Manager 容器 ID，留空则不注入 GTM */
  gtmId: "GTM-WL55WFH8",

  /** 首页 hero 下方的关键词标签 */
  stack: [
    "Google Ads",
    "LinkedIn Ads",
    "GA4",
    "GTM",
    "Salesforce",
    "Pardot",
    "6sense",
    "Looker Studio",
    "SQL",
    "Dify",
    "纷享销客",
    "Zoho",
  ],

  /** 「速览」卡片 */
  facts: [
    { label: "坐标", value: "中国 · 北京" },
    { label: "方向", value: "海外 B2B 数字营销 / Marketing Operations" },
    { label: "平台", value: "Google Ads · GA4 · Salesforce · Pardot" },
    { label: "爱好", value: "出海增长 · 数据驱动 · 自动化" },
  ],

  nav: [
    { label: "文章", href: "/posts/" },
    { label: "经历", href: "/experience/" },
    { label: "案例", href: "/case/" },
    { label: "简历", href: "/resume/" },
    /**
     * cta: true → Header 把它渲染成导航右侧的实心主按钮（不占文字链位）。
     * 英文导航是 i18n/ui.ts 里独立定义的 SITE_COPY_EN.nav，新增项要两边一起加。
     */
    { label: "Hire me", href: "/hire/", cta: true },
  ],

  /** 首页数据卡（中文；英文镜像在 i18n/ui.ts 的 SITE_COPY_EN.stats） */
  stats: [
    { value: "7+ 年", label: "B2B 数字营销经验" },
    { value: "3.87x", label: "Google Ads ROAS 提升" },
    { value: "0→1", label: "海外营销体系搭建" },
    { value: "UA→GA4", label: "迁移与追踪架构" },
  ],

  /**
   * Hire me CTA（首页底部 + /hire 页）的联系邮箱。
   * 填入真实邮箱后 HireCTA 自动渲染 mailto 按钮；若为占位值
   * （your@* / *@example.com）则降级为不可点按钮 + 说明文字。
   */
  hireEmail: "work@tianxu.uk",

  /**
   * /hire 表单的提交端点 —— 独立 Worker（源码在仓库 worker/hire-api/）。
   * 部署 Worker 后填入完整 URL，例如 "https://api.tianxu.uk/" 或
   * "https://hire-api.<你的子域>.workers.dev/"。
   * 留空 → /hire 页不渲染表单，只保留邮箱等兜底联系方式
   * （与 hireEmail 的占位降级同一思路：宁可少一个入口，也不留一个提交不了的表单）。
   */
  hireEndpoint: "",

  /**
   * 简历 PDF 的站点路径（文件放 public/ 下，填 "/xxx.pdf"）。
   * 留空 → 简历页只保留「下载 / 打印」按钮（浏览器打印导出 PDF）；
   * 填入路径 → 显示「下载 PDF」直链按钮 + 「打印」按钮。
   */
  resumePdf: "",
} as const;
