/**
 * 全站文案字典。
 *
 * 分两部分：
 * 1. `SiteCopy` —— 站点级元信息（标题、描述、作者、导航、工具栈、速览卡片），
 *    中文取自 site.config.ts（避免两处维护），英文在这里独立定义。
 * 2. `UiCopy`   —— 界面固定文案（按钮、aria 标签、区块标题、页脚）。
 *
 * 页面里一律写 `t.home.ctaPosts` 这种引用，不要硬编码文字 —— 否则新增语言时会漏。
 */

import { SITE } from "../site.config";
import type { Lang } from "./config";

export interface SiteCopy {
  title: string;
  description: string;
  author: {
    name: string;
    alternateName: string;
    role: string;
    summary: string;
    location: string;
    email: string;
    phone: string;
  };
  /** 与 SITE.social 同构；新增社交账号时这里与 site.config.ts 需同步 */
  social: { github: string; linkedin: string };
  stack: readonly string[];
  facts: readonly { label: string; value: string }[];
  /** cta: true 的项在导航里渲染为实心主按钮（Hire me），其余为文字链 */
  nav: readonly { label: string; href: string; cta?: boolean }[];
}

const SITE_COPY_ZH: SiteCopy = {
  title: SITE.title,
  description: SITE.description,
  author: { ...SITE.author },
  social: { ...SITE.social },
  stack: SITE.stack,
  facts: SITE.facts,
  nav: SITE.nav,
};

const SITE_COPY_EN: SiteCopy = {
  title: "Shawn Wang · Digital Marketing & MarTech",
  description:
    "Shawn Wang's personal site — B2B digital marketing and MarTech consultant focused on global demand generation, GA4 tracking and marketing automation.",
  author: {
    name: "Shawn Wang",
    alternateName: "王天旭",
    role: "Digital Marketing & MarTech Consultant · Global B2B Demand Generation",
    summary:
      "7 years in B2B digital marketing, focused on building data-driven demand generation systems and running global marketing operations. Notes on marketing practice, tooling and reusable playbooks.",
    location: "Beijing, China",
    email: SITE.author.email,
    phone: SITE.author.phone,
  },
  social: { ...SITE.social },
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
    "ShareCRM",
    "Zoho",
  ],
  facts: [
    { label: "Based in", value: "Beijing, China" },
    { label: "Focus", value: "Global B2B digital marketing / Marketing Operations" },
    { label: "Platforms", value: "Google Ads · GA4 · Salesforce · Pardot" },
    { label: "Interests", value: "Global growth · Data-driven · Automation" },
  ],
  nav: [
    { label: "Home", href: "/en/" },
    { label: "Writing", href: "/en/posts/" },
    { label: "Résumé", href: "/en/resume/" },
  ],
};

export function getSiteCopy(lang: Lang): SiteCopy {
  return lang === "en" ? SITE_COPY_EN : SITE_COPY_ZH;
}

export interface UiCopy {
  brandName: string;
  brandAria: string;
  navAria: string;
  /** 主题按钮的无障碍标签按「点击后的动作」取值，由脚本按当前主题刷新 */
  themeToDarkAria: string;
  themeToLightAria: string;
  menuAria: string;
  /** 导航里的 Hire me 实心按钮（配置了 nav.cta 项时渲染） */
  hireCta: string;
  readMore: string;
  backToTop: string;
  footer: {
    copyright: (year: number) => string;
    rss: string;
  };
  home: {
    heroPortraitAlt: string;
    heroGreeting: string;
    heroName: string;
    heroWave: string;
    ctaPosts: string;
    ctaResume: string;
    socialsAria: string;
    aboutHeading: string;
    factsHeading: string;
    stackHeading: string;
    latestHeading: string;
    postCount: (n: number) => string;
    viewAll: string;
  };
  posts: {
    pageTitle: string;
    pageDescription: string;
    heading: string;
    count: (n: number) => string;
    metaSuffix: string;
    emptyPrefix: string;
  };
  post: {
    backLink: string;
  };
  tags: {
    pageTitle: (tag: string) => string;
    pageDescription: (tag: string, n: number) => string;
    backLink: string;
    count: (n: number) => string;
  };
  notFound: {
    pageTitle: string;
    pageDescription: string;
    heading: string;
    message: string;
    home: string;
    posts: string;
  };
}

const UI_ZH: UiCopy = {
  brandName: "王天旭 · Shawn",
  brandAria: "返回首页",
  navAria: "主导航",
  themeToDarkAria: "切换到深色模式",
  themeToLightAria: "切换到浅色模式",
  menuAria: "打开菜单",
  hireCta: "Hire me",
  readMore: "阅读全文",
  backToTop: "返回顶部",
  footer: {
    copyright: (year) => `© ${year} 王天旭`,
    rss: "RSS 订阅",
  },
  home: {
    heroPortraitAlt: "王天旭的头像",
    heroGreeting: "你好，我是",
    heroName: "王天旭",
    heroWave: "👋",
    ctaPosts: "阅读我的文章",
    ctaResume: "查看简历",
    socialsAria: "社交链接",
    aboutHeading: "关于我",
    factsHeading: "📌 速览",
    stackHeading: "🛠️ 工具栈",
    latestHeading: "最新文章",
    postCount: (n) => `共 ${n} 篇`,
    viewAll: "查看全部 →",
  },
  posts: {
    pageTitle: "文章",
    pageDescription: "王天旭关于海外 B2B 数字营销、GA4 数据追踪与营销自动化的实践记录。",
    heading: "文章",
    count: (n) => `共 ${n} 篇`,
    metaSuffix: "全部以 Markdown 维护，",
    emptyPrefix: "还没有文章。在",
  },
  post: {
    backLink: "← 返回文章列表",
  },
  tags: {
    pageTitle: (tag) => `标签：${tag}`,
    pageDescription: (tag, n) => `与「${tag}」相关的全部文章，共 ${n} 篇。`,
    backLink: "← 返回文章列表",
    count: (n) => `共 ${n} 篇`,
  },
  notFound: {
    pageTitle: "页面不存在",
    pageDescription: "请求的页面不存在。",
    heading: "这个页面不存在",
    message: "链接可能已失效或输入有误。",
    home: "返回首页",
    posts: "浏览文章",
  },
};

const UI_EN: UiCopy = {
  brandName: "Shawn Wang",
  brandAria: "Back to home",
  navAria: "Main navigation",
  themeToDarkAria: "Switch to dark mode",
  themeToLightAria: "Switch to light mode",
  menuAria: "Open menu",
  hireCta: "Hire me",
  readMore: "Read more",
  backToTop: "Back to top",
  footer: {
    copyright: (year) => `© ${year} Shawn Wang`,
    rss: "RSS feed",
  },
  home: {
    heroPortraitAlt: "Portrait of Shawn Wang",
    heroGreeting: "Hi, I'm",
    heroName: "Shawn Wang",
    heroWave: "👋",
    ctaPosts: "Read my writing",
    ctaResume: "View résumé",
    socialsAria: "Social links",
    aboutHeading: "About",
    factsHeading: "📌 Quick facts",
    stackHeading: "🛠️ Tool stack",
    latestHeading: "Latest posts",
    postCount: (n) => `${n} post${n === 1 ? "" : "s"}`,
    viewAll: "View all →",
  },
  posts: {
    pageTitle: "Writing",
    pageDescription:
      "Notes by Shawn Wang on global B2B digital marketing, GA4 tracking and marketing automation.",
    heading: "Writing",
    count: (n) => `${n} post${n === 1 ? "" : "s"}`,
    metaSuffix: "All maintained in Markdown,",
    emptyPrefix: "No posts yet. Add a .md file under",
  },
  post: {
    backLink: "← Back to all posts",
  },
  tags: {
    pageTitle: (tag) => `Tag: ${tag}`,
    pageDescription: (tag, n) =>
      `All ${n} post${n === 1 ? "" : "s"} tagged “${tag}”.`,
    backLink: "← Back to all posts",
    count: (n) => `${n} post${n === 1 ? "" : "s"}`,
  },
  notFound: {
    pageTitle: "Page not found",
    pageDescription: "The requested page does not exist.",
    heading: "This page doesn't exist",
    message: "The link may be broken or mistyped.",
    home: "Back to home",
    posts: "Browse posts",
  },
};

export function getUiCopy(lang: Lang): UiCopy {
  return lang === "en" ? UI_EN : UI_ZH;
}
