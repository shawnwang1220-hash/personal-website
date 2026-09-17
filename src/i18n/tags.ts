/**
 * 标签的中英映射。
 *
 * 标签是内容里自由填写的字符串，中英文章各用各的语言写标签，因此两边的
 * 标签集合并不相同。hreflang / 语言切换需要知道「这个中文标签对应的英文标签是谁」，
 * 就有了这张映射表。
 *
 * 维护规则：
 * - 新增标签时，如果不打算翻译（如 GA4、Pardot 这类产品名），两边直接写同一个词，
 *   无需登记在此表 —— 查不到映射时按「同名标签」处理。
 * - 只有中英用词不同的标签才需要在这里登记，且必须成对出现（双向推导）。
 */

/** 中文标签 → 英文标签 */
export const TAG_ZH_TO_EN: Record<string, string> = {
  海外营销: "Global Marketing",
  获客体系: "Demand Generation",
  营销自动化: "Marketing Automation",
};

/** 英文标签 → 中文标签（由上表反转生成，保证双向一致） */
export const TAG_EN_TO_ZH: Record<string, string> = Object.fromEntries(
  Object.entries(TAG_ZH_TO_EN).map(([zh, en]) => [en, zh])
);

/** 把中文标签翻成英文；未登记则原样返回（同名标签） */
export function translateTagToEn(tag: string): string {
  return TAG_ZH_TO_EN[tag] ?? tag;
}

/** 把英文标签翻回中文；未登记则原样返回（同名标签） */
export function translateTagToZh(tag: string): string {
  return TAG_EN_TO_ZH[tag] ?? tag;
}
