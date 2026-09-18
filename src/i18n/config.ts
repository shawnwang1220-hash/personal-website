/**
 * 多语言配置 —— 全站中英双语的唯一真源。
 *
 * 路由约定（务必保持镜像）：
 *   中文（默认语言，无前缀）→  /            /posts            /tags/GA4      /resume
 *   英文（/en 前缀）        →  /en          /en/posts         /en/tags/GA4   /en/resume
 *
 * 「英文路径 = /en + 中文路径」这条规则是语言切换、hreflang alternate 的推导依据。
 * 因此新增页面时必须成对创建：src/pages/xxx.astro ↔ src/pages/en/xxx.astro。
 * 唯一的例外是标签页 —— 标签本身会被翻译（见 tags.ts），需要显式传 altPath。
 */

export type Lang = "zh" | "en";

/** 默认语言：中文（无路径前缀，保持既有 URL 不变） */
export const DEFAULT_LANG: Lang = "zh";

export const LANGS: readonly Lang[] = ["zh", "en"] as const;

/** 英文站的路径前缀 */
export const EN_PREFIX = "/en";

/**
 * 各语言的元信息：html lang 属性、og:locale，以及语言切换按钮的文案。
 *
 * switchShort / switchAria 的取值视角是「当前语言」：
 * 中文页面读 LANG_META.zh → 按钮显示 "EN"（点了跳去英文）；
 * 英文页面读 LANG_META.en → 按钮显示 "中"（点了跳回中文）。
 * Header 里必须用 LANG_META[lang]，别拿成另一语言的 meta，否则标签和跳转方向会相反。
 */
export const LANG_META = {
  zh: {
    /** <html lang="..."> */
    htmlLang: "zh-CN",
    /** <meta property="og:locale"> */
    ogLocale: "zh_CN",
    /** Header 语言切换按钮上的紧凑标签 */
    switchShort: "EN",
    /** 语言切换按钮的 aria-label / title */
    switchAria: "Switch to English",
  },
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    switchShort: "中",
    switchAria: "切换到中文",
  },
} as const satisfies Record<Lang, unknown>;

/** 去掉尾部斜杠（根路径 "/" 除外），用于路径比较与镜像推导 */
function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/** 从路径判断当前语言 */
export function getLangFromPath(path: string): Lang {
  const p = normalizePath(path);
  return p === EN_PREFIX || p.startsWith(`${EN_PREFIX}/`) ? "en" : "zh";
}

/**
 * 把任意路径转换成目标语言的等价路径。
 * 依赖中英页面目录镜像的约定；标签页因标签被翻译，需单独处理。
 */
export function localizePath(path: string, target: Lang): string {
  const p = normalizePath(path);
  const bare =
    p === EN_PREFIX ? "/" : p.startsWith(`${EN_PREFIX}/`) ? p.slice(EN_PREFIX.length) : p;

  if (target === "zh") return bare;
  return bare === "/" ? EN_PREFIX : `${EN_PREFIX}${bare}`;
}

/** 路径的语言互换（当前语言 → 另一语言） */
export function swapLangPath(path: string): string {
  const current = getLangFromPath(path);
  return localizePath(path, current === "zh" ? "en" : "zh");
}

/** 带语言前缀的内部链接：zh 返回 "/posts/"，en 返回 "/en/posts/" */
export function localeUrl(path: string, lang: Lang): string {
  return withTrailingSlash(localizePath(path, lang));
}

/**
 * 页面 URL 一律以 "/" 结尾。
 *
 * 依据：build.format 为 "directory"，产物是 <route>/index.html，Cloudflare Pages
 * 会把不带斜杠的 <route> 308 到 <route>/。因此 canonical / hreflang / 站内链接
 * 都必须直接指向带斜杠的最终地址（200），否则：
 *   - canonical 指向重定向目标，规范化信号被浪费；
 *   - hreflang 目标不是 200，整组互译关系被搜索引擎忽略。
 *
 * 带扩展名的文件路由（/rss.xml、/favicon.svg）原样返回，不加斜杠。
 */
export function withTrailingSlash(path: string): string {
  if (path.endsWith("/")) return path;
  if (/\.[a-z0-9]+$/i.test(path)) return path;
  return `${path}/`;
}
