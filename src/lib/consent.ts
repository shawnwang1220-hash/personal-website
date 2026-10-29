/**
 * 同意管理（CMP）的单一真源。
 *
 * 为什么单独抽一个文件而不是写在组件里：
 *   - BaseLayout 的 inline script 要在 **GTM 之前同步** 拿到「版本号 / 存储键名」。
 *     它跑在浏览器里，不能 import 任何模块；
 *   - ConsentBanner 初始化时要同一份取值；
 *   - 两处各写一遍，改一个忘一个 → 版本号错位，旧授权被误判为有效。
 *
 * 因此常量在这里定义：inline script 用 define:vars 注入，组件直接 import。
 */

export const CMP = {
  /**
   * 存储键名（即 cookie 名）。
   * 改它等于让所有既有授权一次性失效 —— 非必要不要动，改配置请改 revision。
   */
  storageKey: "cc_cookie",

  /**
   * 同意版本号。**只要数据处理方式有实质变化就必须 +1**：
   * 新增第三方服务、新增类别、扩大收集范围、更换分析平台。
   *
   * +1 之后两端同时生效：库把旧授权判为失效并重新询问；
   * BaseLayout 的 inline script 据此把默认信号判为 denied。
   * 两端共用本值，不允许只改一边。
   */
  revision: 1,

  /**
   * 授权有效期（天），到期重新询问。
   * 182 天 ≈ 半年，GDPR 实务中的常见区间。
   */
  expiresAfterDays: 182,
} as const;

/**
 * 可选类别 —— 站内所有「需要同意才生效」的收集范围。
 *
 * 当前只有 analytics：站点仅通过 GTM 注入 GA4，没有广告、没有再营销、
 * 没有第三方嵌入内容、没有跨站追踪。所以只需要一个可选类别。
 *
 * 将来新增（广告 / 嵌入视频 / 评论系统）时四处同改，漏一处就是合规缺口：
 *   1. 本数组
 *   2. CONSENT_GRANT_MAP（类别 → Consent Mode 信号）
 *   3. ui.ts 的 consent.categories（用户可见的说明文案）
 *   4. CMP.revision +1
 */
export const CONSENT_CATEGORIES = ["analytics"] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

/**
 * 类别 → Google Consent Mode v2 信号。
 *
 * 信号名严格按 Google 定义的 7 项，不要自创。analytics 只映射
 * analytics_storage —— 本站没有广告业务，ad_* 三项恒为 denied。
 */
export const CONSENT_GRANT_MAP: Record<ConsentCategory, readonly string[]> = {
  analytics: ["analytics_storage"],
};
