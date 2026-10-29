/**
 * 全站文案字典。
 *
 * 分两部分：
 * 1. `SiteCopy` —— 站点级元信息（标题、描述、作者、导航、工具栈、速览卡片、数据卡），
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
  /**
   * 与 SITE.social 同构 —— 直接取它的类型，新增账号时本文件无需改动。
   *
   * 2026-10-29：这里原本写死 `{ github: string; linkedin: string }`，
   * 加第三个平台就会编译报错，等于把「加账号」这件事锁在类型定义上。
   * 改为指向 site.config.ts 的同一份类型后，唯一真源回到 site.config。
   */
  social: typeof SITE.social;
  stack: readonly string[];
  facts: readonly { label: string; value: string }[];
  /** 首页数据卡：value 为衬线大字号成果数字，label 为口径说明 */
  stats: readonly { value: string; label: string }[];
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
  stats: SITE.stats,
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
  stats: [
    { value: "7+ yrs", label: "in B2B digital marketing" },
    { value: "3.87x", label: "Google Ads ROAS uplift" },
    { value: "0→1", label: "global marketing stack built" },
    { value: "UA→GA4", label: "migration & tracking architecture" },
  ],
  nav: [
    { label: "Writing", href: "/en/posts/" },
    { label: "Experience", href: "/en/experience/" },
    { label: "Case", href: "/en/case/" },
    { label: "Résumé", href: "/en/resume/" },
    /* 与 site.config.ts 的中文 nav 成对：cta 项在 Header 里渲染为实心按钮 */
    { label: "Hire me", href: "/en/hire/", cta: true },
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
    heroEyebrow: string;
    heroGreeting: string;
    heroName: string;
    heroWave: string;
    ctaPosts: string;
    ctaResume: string;
    socialsAria: string;
    statsAria: string;
    latestHeading: string;
    postCount: (n: number) => string;
    viewAll: string;
    experienceHeading: string;
    experienceAll: string;
    caseHeading: string;
    caseAll: string;
  };
  /** Hire me CTA：首页底部与 /hire 页共用（C6 落地完整服务页） */
  hire: {
    title: string;
    text: string;
    cta: string;
    /** 占位邮箱状态下按钮下方的说明 */
    note: string;
    services: readonly string[];
  };
  /**
   * /hire 服务页整页文案。
   *
   * 与上面的 hire 分开：hire 是「一句话 + 一个按钮」的 CTA 区块（首页底部在用），
   * hirePage 是整页内容。字段按页面区块顺序排列，视图里只做遍历与拼装，不出现字面量。
   */
  hirePage: {
    pageTitle: string;
    pageDescription: string;
    heroTitle: string;
    heroLead: string;
    heroCtaPrimary: string;
    heroCtaSecondary: string;
    /** 首屏信任点，一行内用 · 连接 */
    heroTrust: readonly string[];
    painsTitle: string;
    pains: readonly { problem: string; detail: string }[];
    servicesTitle: string;
    servicesLead: string;
    servicesHead: { line: string; scope: string; deliverable: string };
    services: readonly { line: string; scope: string; deliverable: string }[];
    proofTitle: string;
    proofLead: string;
    /** linkLabel / linkHref 可缺省 —— 没有可点的页面时只呈文字，不留死链 */
    proof: readonly { title: string; body: string; linkLabel?: string; linkHref?: string }[];
    modelsTitle: string;
    modelsHead: { label: string; project: string; retainer: string };
    models: readonly { label: string; project: string; retainer: string }[];
    stepsTitle: string;
    steps: readonly { title: string; text: string }[];
    faqTitle: string;
    faq: readonly { q: string; a: string }[];
    contactTitle: string;
    contactLead: string;
    form: {
      title: string;
      lead: string;
      nameLabel: string;
      namePlaceholder: string;
      /** 邮箱必填，电话选填 —— 拆成两个字段后不再有「邮箱或微信」合一输入 */
      emailLabel: string;
      emailPlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      messageLabel: string;
      messagePlaceholder: string;
      submit: string;
      submitting: string;
      successTitle: string;
      successText: string;
      error: string;
      privacy: string;
      fallback: string;
    };
  };
  experience: {
    pageTitle: string;
    pageDescription: string;
    heading: string;
    intro: string;
    detailsLabel: string;
    empty: string;
  };
  case: {
    pageTitle: string;
    pageDescription: string;
    heading: string;
    intro: string;
    backLink: string;
    resultLabel: string;
    /** 四段结构化小节标题 —— 与 frontmatter 的 problem/approach/result/learned 一一对应 */
    sectionProblem: string;
    sectionApproach: string;
    sectionResult: string;
    sectionLearned: string;
    /** 工具栈小节标题（frontmatter 的 stack / Stack） */
    stackLabel: string;
    /** 案例页专属 CTA 文案，复用 HireCTA 组件；固定在字典里，不随案例变化 */
    ctaTitle: string;
    ctaText: string;
    empty: string;
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
  /**
   * Cookie 同意横幅文案。
   *
   * 措辞原则（不是风格偏好，是合规要求）：
   *   - 「仅必要」与「全部接受」必须同等显眼，不能把拒绝做成次要选项误导点击；
   *   - 说明里要写清「用来做什么」「不同意有什么后果」，而不是笼统的
   *     「我们重视您的隐私」；
   *   - 不写「使用本站即视为同意」—— 那不是有效同意。
   */
  consent: {
    title: string;
    description: string;
    acceptAll: string;
    acceptNecessary: string;
    manage: string;
    prefsTitle: string;
    save: string;
    necessaryTitle: string;
    necessaryDesc: string;
    analyticsTitle: string;
    analyticsDesc: string;
    ga4Label: string;
    tableCaption: string;
    colName: string;
    colPurpose: string;
    colDuration: string;
    /** cookie 清单；名称与有效期是技术事实，用途随类别走 */
    rows: readonly { name: string; purpose: string; duration: string }[];
    /** 偏好中心右上角关闭按钮的无障碍标签 */
    close: string;
    /** 隐私政策链接文案（仅当 site.config 配了路径才渲染） */
    privacyLink: string;
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
    heroEyebrow: "B2B 数字营销 · MarTech · 数据驱动",
    heroGreeting: "你好，我是",
    heroName: "王天旭",
    heroWave: "👋",
    ctaPosts: "阅读我的文章",
    ctaResume: "查看简历",
    socialsAria: "社交链接",
    statsAria: "关键数据",
    latestHeading: "最新文章",
    postCount: (n) => `共 ${n} 篇`,
    viewAll: "查看全部 →",
    experienceHeading: "经历",
    experienceAll: "查看全部经历 →",
    caseHeading: "案例",
    caseAll: "查看全部案例 →",
  },
  hire: {
    title: "让获客体系可衡量、可复制",
    text: "无论你是要从 0 搭建海外获客体系、迁移 GA4，还是理顺 CRM 里的线索流转 —— 聊聊看，也许我能帮上。",
    cta: "Hire me",
    note: "（占位邮箱：在 site.config.ts 配置 hireEmail 后启用）",
    services: ["GA4 / GTM / Server-Side Tagging", "CRM 线索管理", "广告投放与归因", "AI 营销自动化"],
  },
  hirePage: {
    pageTitle: "合作方式",
    pageDescription:
      "GA4/GTM 追踪体系、营销自动化与 CRM、海外 B2B 获客 —— 项目制或月度顾问。看看我能接什么、怎么合作。",
    heroTitle: "营销数据与获客链路，我帮你搭成能跑的系统",
    heroLead:
      "7 年 B2B 数字营销经验，专注 GA4/GTM 追踪体系、营销自动化与 CRM、海外 B2B 获客。项目制或月度顾问，按你的节奏开始。",
    heroCtaPrimary: "说说你的需求",
    heroCtaSecondary: "先发邮件",
    heroTrust: [
      "现任独立顾问",
      "前 hireEZ Senior Marketing Operation",
      "曾主导海外数字营销体系 0-1 建设",
    ],
    painsTitle: "这些场景，你可能正在经历",
    pains: [
      { problem: "广告花出去，说不清哪个渠道带来线索", detail: "GA4 没配好，转化事件缺失，报表对不上账。" },
      { problem: "官网有流量，表单没线索", detail: "转化链路断档，用户在 CTA 到表单之间流失。" },
      { problem: "CRM 和营销平台各跑各的", detail: "Salesforce、Pardot 买了不会用，线索路由靠人工转发。" },
      { problem: "多渠道数据割裂", detail: "Google Ads、LinkedIn Ads 各自为政，归因说不清，优化靠猜。" },
    ],
    servicesTitle: "我接什么",
    servicesLead: "三条服务线，都落在可交付的东西上。",
    servicesHead: { line: "服务线", scope: "服务内容", deliverable: "交付物" },
    services: [
      {
        line: "营销数据与 Tracking",
        scope:
          "GA4 迁移与重建；事件、转化与回传追踪；Server-Side Tagging；归因体系",
        deliverable: "可直接使用的 GA4/GTM 配置；广告—官网—CRM 数据闭环；配置文档",
      },
      {
        line: "营销自动化与 CRM",
        scope:
          "Lead Routing 设计；线索培育流程；表单与数据同步；Salesforce / Pardot / 6sense 跨系统协同",
        deliverable: "线索流转与培育流程上线；CRM 对象、流程与报表配置",
      },
      {
        line: "海外获客体系",
        scope: "Google Ads / LinkedIn Ads 体系规划；官网转化链路优化；Marketing Stack 选型与搭建",
        deliverable: "投放与转化链路方案；Marketing Stack 部署清单",
      },
    ],
    proofTitle: "做过什么",
    proofLead: "只列事实，细节可以现场追问。",
    proof: [
      {
        title: "hireEZ：GA4/GTM 追踪体系",
        body: "全球 B2B AI 招聘 SaaS，负责北美及全球市场 Marketing Operations；主导 Universal Analytics 向 GA4 迁移，规划网站事件、广告归因与营销数据采集标准。",
      },
      {
        title: "Pardot / Salesforce：线索路由与 CRM 闭环",
        body: "设计营销自动化与 Lead Nurture 流程，建立线索培育、客户分层与自动化触达机制，打通 Marketing 与 Sales 的线索协同。",
        linkLabel: "相关文章：线索培育实践",
        linkHref: "/posts/pardot-nurture/",
      },
      {
        title: "GA4 page_view 丢失排查（自有项目）",
        body: "自己博客出的问题自己查：从 GTM 配置到上报链路逐段定位，复盘写成公开文章。",
        linkLabel: "文章：GA4 page_view 丢失排查",
        linkHref: "/posts/ga4-pageview-missing/",
      },
    ],
    modelsTitle: "怎么合作",
    modelsHead: { label: "对比项", project: "项目制", retainer: "月度顾问" },
    models: [
      {
        label: "适合",
        project: "目标明确的一次性工作：搭建、迁移、排查",
        retainer: "需求滚动的持续优化",
      },
      {
        label: "例子",
        project: "GA4 重建、追踪体系搭建、丢失排查",
        retainer: "追踪维护、数据报表、线索培育迭代",
      },
      { label: "周期", project: "按项目评估，书面确认后启动", retainer: "按月合作，随时可结束" },
      { label: "报价", project: "按需求评估后提供报价单", retainer: "按需求评估后提供报价单" },
    ],
    stepsTitle: "流程",
    steps: [
      { title: "沟通需求", text: "先讲清现状和目标 —— 邮件或通话都行。" },
      { title: "评估与报价", text: "明确范围、周期和价格，书面确认后开始。" },
      {
        title: "执行与交付",
        text: "按周同步进展；配置、方案、文档一并交付，你的团队能直接接手。",
      },
    ],
    faqTitle: "你可能想问",
    faq: [
      { q: "签合同 / 保密协议吗？", a: "可以。合同和保密协议按甲方要求来，都能配合。" },
      {
        q: "远程协作怎么进行？",
        a: "base 在北京（GMT+8），短期项目可以跨时区工作；协作工具用你们现有的，常用工具都能配合；同步频率按需求定。",
      },
    ],
    contactTitle: "直接联系我",
    contactLead: "也可以直接发邮件或加 LinkedIn —— 哪个方便用哪个。",
    form: {
      title: "说说你的需求",
      lead: "留个邮箱就能发，其余选填。我会在 2 个工作日内回复。",
      nameLabel: "姓名",
      namePlaceholder: "怎么称呼",
      emailLabel: "邮箱",
      emailPlaceholder: "you@company.com",
      phoneLabel: "电话（选填）",
      phonePlaceholder: "希望电话沟通的话留一个",
      messageLabel: "需求（选填）",
      messagePlaceholder: "现状 + 目标，例如：GA4 数据不准，想重建追踪体系",
      submit: "发送需求",
      submitting: "发送中…",
      successTitle: "已收到。",
      successText: "我会在 2 个工作日内回复。",
      error: "没发出去，可能是网络问题。",
      privacy:
        "邮箱用于回复本次咨询，电话只在你希望电话沟通时使用，都不转给第三方。提交时会一并带上浏览器里由 Google Analytics 生成的随机标识符（Client ID），只用来判断需求来自哪个页面或渠道，不含你的身份信息。",
      fallback: "也可以直接发邮件：",
    },
  },
  experience: {
    pageTitle: "经历",
    pageDescription: "王天旭的工作经历 —— 独立 MarTech 顾问、博睿数据海外数字营销、氦图科技 hireEZ 营销运营。",
    heading: "经历",
    intro: "按时间倒序排列。结论在前，要点与详情收在折叠里。",
    detailsLabel: "展开要点",
    empty: "还没有经历数据。",
  },
  case: {
    pageTitle: "案例",
    pageDescription: "王天旭的数字营销与 MarTech 案例 —— 获客体系搭建、GA4 迁移、CRM 线索管理与营销自动化。",
    heading: "案例",
    intro: "挑选有代表性的项目。每个案例按 问题 → 做法 → 结果 / 学到 展开。",
    backLink: "← 返回案例列表",
    resultLabel: "核心结果",
    sectionProblem: "问题",
    sectionApproach: "做法",
    sectionResult: "结果",
    sectionLearned: "学到",
    stackLabel: "工具栈",
    ctaTitle: "这个流程，我也能在你的项目里跑一遍",
    ctaText: "从问题定位到落地验证 —— 聊聊你现在的进度和卡点。",
    empty: "还没有案例。",
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
  consent: {
    title: "Cookie 与数据收集",
    description:
      "本站默认用 Google Analytics 4 统计阅读情况：哪些文章有人读、访客从哪里来。你可以随时关闭，关闭后立即停止收集并清除已写入的分析 Cookie。",
    acceptAll: "保持开启",
    acceptNecessary: "关闭分析",
    manage: "自定义",
    prefsTitle: "Cookie 偏好设置",
    save: "保存选择",
    necessaryTitle: "必要",
    necessaryDesc:
      "维持站点基本功能：记住你的深浅色主题选择，以及这次的 Cookie 决定。无法关闭。",
    analyticsTitle: "分析",
    analyticsDesc:
      "统计浏览量、来源渠道与阅读深度。默认开启，可随时关闭；关闭后本类别下的 Cookie 会被清除。数据以聚合形式使用，不用于广告投放，也不与第三方共享。",
    ga4Label: "Google Analytics 4",
    tableCaption: "本站写入的 Cookie",
    colName: "名称",
    colPurpose: "用途",
    colDuration: "有效期",
    rows: [
      { name: "_ga", purpose: "区分独立访客", duration: "2 年" },
      { name: "_ga_*", purpose: "维持 GA4 会话状态（* 为容器 ID）", duration: "2 年" },
    ],
    close: "关闭",
    privacyLink: "隐私政策",
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
    heroEyebrow: "B2B Digital Marketing · MarTech · Data-driven",
    heroGreeting: "Hi, I'm",
    heroName: "Shawn Wang",
    heroWave: "👋",
    ctaPosts: "Read my writing",
    ctaResume: "View résumé",
    socialsAria: "Social links",
    statsAria: "Key numbers",
    latestHeading: "Latest posts",
    postCount: (n) => `${n} post${n === 1 ? "" : "s"}`,
    viewAll: "View all →",
    experienceHeading: "Experience",
    experienceAll: "View full experience →",
    caseHeading: "Case work",
    caseAll: "View all cases →",
  },
  hire: {
    title: "Make your demand engine measurable",
    text: "Building global demand generation from scratch, migrating to GA4, or untangling lead flow in your CRM? Let's talk.",
    cta: "Hire me",
    note: "(Placeholder email — set hireEmail in site.config.ts to enable)",
    services: [
      "GA4 / GTM / Server-Side Tagging",
      "CRM lead management",
      "Paid ads & attribution",
      "AI marketing automation",
    ],
  },
  hirePage: {
    pageTitle: "Work with me",
    pageDescription:
      "GA4/GTM tracking, marketing automation and CRM, global B2B demand generation — as a project or a monthly retainer. What I take on, and how we'd work together.",
    heroTitle: "Marketing data and demand generation, built to run",
    heroLead:
      "7 years in B2B digital marketing, focused on GA4/GTM tracking, marketing automation and CRM, and global demand generation. Project-based or monthly retainer — at your pace.",
    heroCtaPrimary: "Tell me what you need",
    heroCtaSecondary: "Email me first",
    heroTrust: [
      "Independent consultant",
      "Former Senior Marketing Operation at hireEZ",
      "Led a global marketing stack from 0 to 1",
    ],
    painsTitle: "These probably sound familiar",
    pains: [
      {
        problem: "You can't tell which channel brought the lead",
        detail: "GA4 isn't set up properly, conversion events are missing, and the numbers don't add up.",
      },
      {
        problem: "Traffic comes in, but no leads come out",
        detail: "The conversion path breaks somewhere between the CTA and the form.",
      },
      {
        problem: "Your CRM and your marketing platform don't talk",
        detail: "Salesforce and Pardot are sitting unused, so lead routing is manual.",
      },
      {
        problem: "Channel data is fragmented",
        detail: "Google Ads and LinkedIn Ads each tell their own story, attribution is guesswork, and optimisation follows.",
      },
    ],
    servicesTitle: "What I take on",
    servicesLead: "Three service lines, each ending in something concrete you can keep.",
    servicesHead: { line: "Service line", scope: "Scope", deliverable: "What you get" },
    services: [
      {
        line: "Marketing data & tracking",
        scope:
          "GA4 migration and rebuild; event, conversion and offline conversion tracking; server-side tagging; attribution",
        deliverable: "A working GA4/GTM setup; an ads → site → CRM data loop; configuration docs",
      },
      {
        line: "Marketing automation & CRM",
        scope:
          "Lead routing design; nurture flows; form and data sync; Salesforce / Pardot / 6sense integration",
        deliverable: "Lead routing and nurture flows in production; CRM objects, processes and reports",
      },
      {
        line: "Global demand generation",
        scope:
          "Google Ads / LinkedIn Ads programme design; website conversion path; marketing stack selection and setup",
        deliverable: "A paid and conversion plan; a marketing stack deployment checklist",
      },
    ],
    proofTitle: "What I've built",
    proofLead: "Just the facts — ask me for the detail.",
    proof: [
      {
        title: "hireEZ: GA4/GTM tracking system",
        body: "Global B2B AI recruiting SaaS. Ran marketing operations for North America and global markets, led the migration from Universal Analytics to GA4, and defined the standard for site events, ad attribution and marketing data collection.",
      },
      {
        title: "Pardot / Salesforce: lead routing and a closed CRM loop",
        body: "Designed the marketing automation and lead nurture flows — nurturing, segmentation and automated outreach — connecting marketing and sales on one lead flow.",
        linkLabel: "Related post: lead nurture in practice",
        linkHref: "/en/posts/pardot-nurture/",
      },
      {
        title: "Tracking down a lost GA4 page_view (own project)",
        body: "My own blog, my own bug: traced it from the GTM configuration through the reporting path, then wrote up what I found.",
        linkLabel: "Post: the missing GA4 page_view",
        linkHref: "/en/posts/ga4-pageview-missing/",
      },
    ],
    modelsTitle: "How we'd work together",
    modelsHead: { label: "Compare", project: "Project", retainer: "Monthly retainer" },
    models: [
      {
        label: "Best for",
        project: "One-off work with a clear goal: setup, migration, diagnosis",
        retainer: "Continuous improvement with rolling needs",
      },
      {
        label: "Examples",
        project: "GA4 rebuild, tracking setup, lost-data diagnosis",
        retainer: "Tracking maintenance, reporting, nurture iteration",
      },
      {
        label: "Duration",
        project: "Scoped per project, starts after written sign-off",
        retainer: "Month to month, cancel any time",
      },
      {
        label: "Pricing",
        project: "Quoted after scoping",
        retainer: "Quoted after scoping",
      },
    ],
    stepsTitle: "Process",
    steps: [
      {
        title: "Scope the work",
        text: "Tell me where you are and what you want to fix — email or a call, either works.",
      },
      {
        title: "Quote and agree",
        text: "We settle scope, timeline and price in writing before anything starts.",
      },
      {
        title: "Build and hand over",
        text: "Weekly progress updates, then configs, documentation and a walkthrough so your team can take it from there.",
      },
    ],
    faqTitle: "You might be wondering",
    faq: [
      {
        q: "Do you sign contracts and NDAs?",
        a: "Yes. Contracts and NDAs are whatever the client requires — your templates are fine.",
      },
      {
        q: "How does remote collaboration work?",
        a: "I'm based in Beijing (GMT+8) and can work across time zones for short projects. I'll use whatever tools your team already has, and we'll set the sync cadence to suit the work.",
      },
    ],
    contactTitle: "Get in touch",
    contactLead: "Or just email me, or reach me on LinkedIn — whichever is easier.",
    form: {
      title: "Tell me what you need",
      lead: "Your email is all I need — the rest is optional. I reply within 2 working days.",
      nameLabel: "Name",
      namePlaceholder: "What should I call you",
      emailLabel: "Email",
      emailPlaceholder: "you@company.com",
      phoneLabel: "Phone (optional)",
      phonePlaceholder: "Leave one if you'd rather talk by phone",
      messageLabel: "What you need (optional)",
      messagePlaceholder:
        'Where you are and where you want to be — e.g. "GA4 numbers do not add up, we want to rebuild tracking"',
      submit: "Send",
      submitting: "Sending…",
      successTitle: "Got it.",
      successText: "I'll get back to you within 2 working days.",
      error: "That didn't go through — possibly a network issue.",
      privacy:
        "Your email is used only to reply; your phone number only if you asked for a call. Never shared with third parties. Your submission also carries the random identifier (Client ID) Google Analytics stores in your browser — used only to tell which page or campaign the enquiry came from.",
      fallback: "You can also email me directly:",
    },
  },
  experience: {
    pageTitle: "Experience",
    pageDescription:
      "Shawn Wang's professional experience — independent MarTech consulting, global marketing at Bonree Data, and marketing operations at hireEZ.",
    heading: "Experience",
    intro: "Reverse chronological. Lead with the conclusion; highlights and details sit in the collapsible section.",
    detailsLabel: "Expand highlights",
    empty: "No experience entries yet.",
  },
  case: {
    pageTitle: "Case work",
    pageDescription:
      "Selected digital marketing and MarTech case studies by Shawn Wang — demand generation systems, GA4 migration, CRM lead management and marketing automation.",
    heading: "Case work",
    intro: "Selected projects. Each case follows the same structure: problem → approach → results / what I learned.",
    backLink: "← Back to all cases",
    resultLabel: "Key result",
    sectionProblem: "Problem",
    sectionApproach: "Approach",
    sectionResult: "Results",
    sectionLearned: "What I learned",
    stackLabel: "Stack",
    ctaTitle: "I can run this same playbook on your project",
    ctaText: "From problem framing to verified results — let's talk about where you are today.",
    empty: "No cases yet.",
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
  consent: {
    title: "Cookies & data collection",
    description:
      "Google Analytics 4 runs by default to see which posts get read and where visitors come from. You can turn it off at any time — that stops collection and clears the analytics cookies already set.",
    acceptAll: "Keep it on",
    acceptNecessary: "Turn off analytics",
    manage: "Customize",
    prefsTitle: "Cookie preferences",
    save: "Save choices",
    necessaryTitle: "Necessary",
    necessaryDesc:
      "Keeps the site working: remembers your light/dark theme choice and this cookie decision. Cannot be switched off.",
    analyticsTitle: "Analytics",
    analyticsDesc:
      "Counts page views, referral sources and reading depth. On by default; turning it off clears the cookies in this category. Used in aggregate — never for advertising, never shared.",
    ga4Label: "Google Analytics 4",
    tableCaption: "Cookies set by this site",
    colName: "Name",
    colPurpose: "Purpose",
    colDuration: "Duration",
    rows: [
      { name: "_ga", purpose: "Distinguishes unique visitors", duration: "2 years" },
      { name: "_ga_*", purpose: "Maintains GA4 session state (* = container ID)", duration: "2 years" },
    ],
    close: "Close",
    privacyLink: "Privacy policy",
  },
};

export function getUiCopy(lang: Lang): UiCopy {
  return lang === "en" ? UI_EN : UI_ZH;
}
