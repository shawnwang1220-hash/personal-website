import { SITE } from "../site.config";

/**
 * 社交链接的展示元数据 —— 图标 + 显示名的唯一真源。
 *
 * 地址不在这里：地址在 `site.config.ts` 的 `social`，那里同时喂 BaseLayout 的
 * JSON-LD `Person.sameAs`。本文件只负责「这个账号怎么显示」。
 *
 * 两边靠 key 关联（github / linkedin …）：
 *   site.config.ts 有、这里没有 → 不会渲染（首页会在构建期打印告警）
 *   这里有、site.config.ts 没有 → 不渲染，等于死配置
 * **新增账号时两处都要动。**
 *
 * 图标内联而非引 public/*.svg：省一次请求，且 `currentColor` 能跟随链接的
 * hover / 主题色变化，外部 <img> 做不到。
 */

type SocialKey = keyof typeof SITE.social;

export interface SocialMeta {
  /** 显示名。产品名不翻译（LinkedIn 在中文界面里也是 LinkedIn） */
  label: string;
  /** 无障碍标签与 title 的语义（组件按语言拼装） */
  aria: (name: string) => string;
  /** 24×24 viewBox 的单路径填充图标 */
  icon: string;
}

/**
 * 只为「名字本身就是英文词」的账号特殊处理冠词（在 GitHub 上 / 在 LinkedIn 上）。
 * 其余账号按字面拼接 —— 真要加一个中文名平台（知乎、公众号…）时，在这里补一条。
 */
const PARTICLES: Record<string, string> = { linkedin: "LinkedIn" };

const build = (defs: Record<SocialKey, { label: string; icon: string }>): Record<SocialKey, SocialMeta> =>
  Object.fromEntries(
    Object.entries(defs).map(([key, v]) => [
      key,
      {
        ...v,
        aria: (name: string) => `在 ${PARTICLES[key] ?? v.label} 上关注 ${name}`,
      },
    ])
  ) as Record<SocialKey, SocialMeta>;

export const SOCIAL_META = build({
  github: {
    label: "GitHub",
    // ⚠ 多行拼接时，断点必须落在**空格处**。若前一行的尾字符与后一行的首字符
    // 都是数字（含以 - / . 开头），两段会粘连成一个数字：整条命令少一个参数，
    // 浏览器静默渲染成残缺错位的图形，只在 Console 报
    // `<path> attribute d: Expected number`。改完务必核对渲染结果。
    icon:
      "M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.62 8.21 11.18.6.11.82-.26.82-.58 " +
      "0-.29-.01-1.04-.02-2.05-3.34.72-4.04-1.6-4.04-1.6-.55-1.38-1.34-1.75-1.34-1.75" +
      "-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.82 2.81 1.29 3.5.99" +
      ".11-.77.42-1.29.76-1.59-2.67-.3-5.47-1.32-5.47-5.87 0-1.3.47-2.36 1.24-3.19" +
      "-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.22a11.6 11.6 0 0 1 6 0c2.29-1.54" +
      " 3.3-1.22 3.3-1.22.66 1.64.25 2.86.12 3.16.77.83 1.23 1.89 1.23 3.19 0 4.56" +
      "-2.81 5.56-5.49 5.86.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7" +
      ".82.58A12.01 12.01 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z",
  },
  linkedin: {
    label: "LinkedIn",
    icon:
      "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94" +
      "v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28z" +
      "M5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" +
      "M22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72" +
      "V1.72C24 .77 23.2 0 22.22 0z",
  },
});
