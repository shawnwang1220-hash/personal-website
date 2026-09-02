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
     * 占位符（非真实信息）：部署前替换为真实邮箱/电话，或保持留空。
     * Cloudflare 会对邮箱做 Email Obfuscation 保护，留空则简历页显示「待补充」。
     */
    email: "user@example.com",
    /** 占位符：替换为真实手机号，或保持留空 */
    phone: "138-0000-0000",
  },

  social: {
    github: "https://github.com/shawnwang1220-hash",
  },

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
    { label: "首页", href: "/" },
    { label: "文章", href: "/posts" },
    { label: "编辑器", href: "/editor" },
    { label: "简历", href: "/resume" },
  ],
} as const;
