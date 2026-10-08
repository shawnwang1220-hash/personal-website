---
title: "从 Cloudflare 查到 GTM 容器：一次 GA4 page_view 丢失的完整复盘"
description: "GA4 收不到 page_view，同一个容器里其他事件却全部正常，而且只在长期使用的浏览器 profile 里复现。七天排查从 Cloudflare、Astro 一路走到容器，而答案其实在三天前就被逐字记录过，当时被当成了「常用做法」。"
pubDate: 2026-09-23
tags: ["GA4", "GTM", "Tracking", "Post-mortem"]
keywords: ["GA4 page_view 不发送", "GA4 收不到数据", "GTM 事件设置变量", "Analytics Storage", "session_id 覆盖", "GA4 静默丢包", "GA4 page_view not sent"]
---

## 背景：一个看起来就很奇怪的 page_view 丢失

站点是 `blog.tianxu.uk`，Astro 构建、Cloudflare Pages 托管，GA4 通过 GTM 容器部署。

这件事从一开始就不像常见的「GA4 没数据」。常见的那些是埋点没装、ID 写错、被插件拦了，总能找到一处坏掉的东西。这次有三件事我一开始就说不通：

- 同一个容器、同一次加载，`page_view` 没了，其他事件一个不少
- 同一台浏览器、同一个容器，换一个窗口就正常
- Console 没报错，Network 没记录，Tag Assistant 说标签已触发

**看不出来哪里坏了，但数据就是没到。**

这三条把排查变成了一场跨层拉锯，一直到落回容器才被解释掉。

---

## 症状：没有 `/g/collect`，甚至没有发送尝试

普通模式加载页面、静置 60 秒后，页面状态是这样的：

```
dataLayer                              : gtm.js → gtm.dom → gtm.load   （容器跑完）
gtm.js?id=GTM-WL55WFH8                 : HTTP 200
gtag/js?id=G-BWQYG6F2G3                : HTTP 200（由 gtm.js 拉起，说明 Google Tag 已触发）
JS 报错                                 : 无
performance.getEntriesByType('resource') 过滤 /g/collect : []
```

**最后一行是整个案子的锚点。**

我特意没用 DevTools 的 Network 面板，而是查 `performance.getEntriesByType('resource')`。它不受「面板有没有提前打开」「Network 面板类型过滤」这类事影响。它为空，就是这一页一条 collect 都没发出去。

同页面的对照更进一步：

- Console 里手动构造 `collect` 请求，成功，GA4 Realtime 里看得见
- 页面滚动触发的 `scroll` 增强测量，正常发出

失败点因此收敛成一句话：gtag 活着、能发、能到 GA4，唯独 `page_view` 连队都没入。

依据是一次 BEFORE / AFTER 实验。`scroll` 触发队列 flush 之后，队列里只有 `scroll`，没有 `page_view`。所以不是「入了队发不出去」，是压根没进去。

**同一个 gtag 实例、同一个队列，一个事件进去了、另一个连门都没进。**这是本案最反常识的一条观察，后面每一个候选假设都得先过它这一关。

### 环境差异

| 环境 | `page_view` |
|---|---|
| Chrome 普通模式（长期使用的 profile） | 不发，反复复现 |
| Chrome 无痕 | 发 |
| Chrome 访客 | 发 |
| Edge（同机同网） | 发 |
| 无头 Chromium | 发 |

---

## 排查过程：托管 → 渲染 → 浏览器 → 预渲染 → 状态 → 容器配置

六个方向，全部走空。每一个都有它的道理。

### 托管层：Cloudflare、仓库、构建链路

第一个嫌疑人是 Cloudflare 的边缘注入。线上每个 HTML 末尾都被塞了：

```js
window.__CF$cv$params={r:'...',t:'...'};
/cdn-cgi/challenge-platform/scripts/jsd/main.js
```

这是 Bot Fight Mode / JS Detections。**它是 zone 级开关，不在仓库里**，也是「线上 ≠ 仓库」的唯一来源。

同一层里还有第二个 CF 侧嫌疑人：Rocket Loader。它会重排页面上 JS 的执行顺序，历史上咬过不少埋点。查完是没开。

仓库到构建链路逐项审过：`.node-version` 和 `package-lock.json` 正常；`_headers`、`_redirects`、`_routes.json`、`functions/`、`_worker.js` 全部不存在，没有任何会改写响应或拦脚本的 Pages 配置；CF 的输出目录确实只是 `dist`；线上 HTML 和本地构建产物逐字节一致，唯一差异就是上面那段 CF 注入。

最后一步最直接：我把整站迁移到 GitHub Pages 做了一份镜像，**同样复现**。托管层出局。

> 这一层里还埋了个坑。我的测试机走代理，而 `googletagmanager.com` 在中国大陆不可直连，所以「我这里测得通」根本不等于「访客那边通」。无头测试的假阳性后来被反复证明是干扰项。

### 渲染层：Astro 的构建产物

这一层出现得比前面几层都早，那时症状还是另一种形态：三种窗口都不发。形状后来变了，要回答的问题没变——是不是那两次改代码改出来的？

我当时的怀疑很具体：Astro 的 `define:vars` 和 `is:inline` 两个指令同时用会冲突，导致 GTM 初始化时发不出 PV。而恰在那段时间，有两次提交动了这块。

`8fc64d8` 做构建产物可读性改造（`compressHTML: false`、`cssMinify: false`），把页面里的小脚本改成 `<script is:inline>`，并顺手去掉了 TS 注解。`26a749b` 把 GTM 片段改用 `set:html` 原样内联输出。

改完部署之后，PV **好像**回来了。

**这就是这一层最危险的地方：它看起来被解决了。**

我把三个版本的产物各构建一遍做对照：

| 版本 | GTM 片段在产物里的形态 | 行为 |
|---|---|---|
| `1ab194b`（迁移第一天） | `(function(){const gtmId="…"; …})(…, gtmId); })();` | 正常 |
| `8fc64d8`（「修复前」） | 与 `1ab194b` 逐字节相同 | 正常 |
| `26a749b`（「修复后」） | IIFE 消失、ID 硬编码 | 正常 |

**三版行为完全一致。**那次「修复」对 GTM 的影响是零。

再把每组指令单独拆开，做一个最小矩阵：

| 用例 | 源码写法 | 产物 | 结果 |
|---|---|---|---|
| p1 | `is:inline` + `define:vars` | 多一层 IIFE 包裹 | 正常 |
| p2 | 只有 `define:vars` | 与 p1 逐字节相同 | 正常 |
| p3 | 只有 `is:inline`（ID 硬编码） | 原样输出 | 正常 |
| p4 | `is:inline` + `set:html` | 原样输出 | 正常 |
| p5 | `is:inline` + 残留 TS 注解 | 注解原样进产物 | `SyntaxError: Unexpected token ':'` |
| p6 | 不加 `is:inline` + TS 注解 | Vite 编译 → `type="module"` 压缩 | 正常 |

三条结论。

一，`define:vars` 与 `is:inline` 不冲突，后者是冗余的。官方文档原话：只要 `<script>` 带了 `src` 以外的任何属性，Astro 就不处理它。而 `define:vars` 本身就是属性，早已让脚本跳过处理。

二，`define:vars` 包的那层 IIFE 是保护措施，不是故障。它把注入的 `const` 关进函数作用域，避免污染全局。

三，真正能静默杀死脚本的是 `is:inline` 绕过 TS 编译。任何非 `src` 属性都会让 Astro 跳过 TypeScript 处理，注解原样进浏览器，`SyntaxError`，整个 script 块不执行。`8fc64d8` 当时就踩到了，所以在同一个提交里同步删掉了 `theme: string` 和 `querySelectorAll<HTMLElement>`。

那「改完就好了」是怎么回事？

**因为这个症状本身会波动。**拿一个自己会变的症状去做「改前 vs 改后」的对比，**拿到的只能是噪声**。同样这个陷阱，本案里中了两次：这一次，以及后面「删掉某条 cookie 就好了」那次。

最后把这一层钉死的，是一次更硬的对照。把「代码版本」和「profile 状态」做成二维矩阵，每一格都实跑：

| 代码版本 | 干净 profile | 脏 profile |
|---|---|---|
| 线上当前（`set:html`） | 正常 | 不发 |
| `8fc64d8`（`define:vars` + IIFE） | 正常 | 不发 |
| `1ab194b`（迁移第一天） | 正常 | 不发 |

**同一列全正常、同一行全不发。**按 profile 完全分离，按代码版本零分离。代码版本到此彻底出局。

> 一个操作细节：这一层的对照没法用本地 `127.0.0.1` 起服务跑。会话 cookie 绑定在域名上，换成 `127.0.0.1` 它根本不会被带上，测出来必然是「正常」。要在真实域下比版本，得用请求拦截把旧版 HTML 顶上去。

### 浏览器层：扩展，以及一次指错人

「无头能过、我的 Chrome 不行」，差异自然指向扩展。**这一节里的两次指认都是 AI 助手提的，不是我**——我自己没把插件当回事（广告拦截插件会拦掉我自己的埋点，我不可能装），但它既然提了，就顺手排掉。

**第一次指错了 profile。**它把 `Google Analytics Debugger`、`Adswerve - dataLayer Inspector+`、`Tag Assistant Legacy` 列为嫌疑人，那三个扩展都在一个 2024 年 3 月就废弃的 profile 里（前公司的招聘工具）。我在活跃 profile 里当然找不到它们。后来靠 `Local State` 里的 `profile.info_cache.active_time`，才定位到真正在用的那个。

**第二次是把「有能力作案」当成了「已经作案」。**它在活跃 profile 里筛出几个权限组合很重的扩展（`debugger` + `scripting` + `webRequest` + `<all_urls>`），建议二分禁用。

我自己试了一遍，直接推翻：扩展全部关闭后仍无 `page_view`；访客模式不支持扩展，也是没有；只有无痕模式有。

| 环境 | 扩展数 | 结果 |
|---|---|---|
| 普通窗口（扩展全关） | 0 | 不发 |
| 访客模式 | 0 | 不发 |
| 无痕模式 | 0（默认禁用） | 发 |

**两个零扩展的环境结果不同**，说明扩展不是变量。这本身又是一个说不通的地方：环境差异不在扩展里，那它在哪？

> 多环境对照要一次坐齐再下结论。「有能力作案」和「已经作案」之间隔着一整个验证步骤。

### 预渲染层

接下来的候选是 Chrome 的「预加载页面 / 预渲染」。被预渲染的页面在 `document.prerendering === true` 时不发 `page_view`，要等 `prerenderingchange` 补发，补发失败就表现为「首个 PV 没了」。

它能解释不少现象：普通窗口不发（默认开预加载）、无痕正常（Chrome 禁预加载）、「有 scroll 无 PV」（scroll 是激活后的事件）。

**我用受控实验把它否掉了。**伪造 `document.prerendering = true`，结果是：

| 观测 | 预渲染态 |
|---|---|
| `page_view` | 被压掉 |
| `scroll` | 同样被压掉 |
| 恢复时机 | 模拟激活后 `_ga` 出现、PV 的 fetch call 出现，是延迟不是永久丢失 |

本案签名是「scroll 能发、只有 page_view 不发」；预渲染签名是「连 scroll 一起压掉」。**两者冲突。**

真实配置层面还有第二次独立证伪：失败那台浏览器里，网络预测 / 预加载是被显式关闭的（`net.network_prediction_options = 2`），正常那台走默认开启。**方向完全反转。**

### 状态层：Consent 与 profile

两环境各跑一次 GTM / GA 内部状态脚本，输出逐字段相同：`gtmKeys` 相同且都含 `G-BWQYG6F2G3`（两边都完成了 Google tag 注册），`tagDataKeys` 相同，`consent` 四项全是 `implicit: true`、`usedImplicit: true`、`active: false`。

**`active: false` 意味着 consent 根本没在 gate 任何东西。**Consent Mode 出局。

生命周期门同样被实测排除：`prerendering=false`、`activationStart=0`、`navType=reload`、`visibility=visible`。

到这里网络层彻底出局，**结论指向 config 层：`page_view` 从未被 gtag 生成。**

### 配置层：答案第一次出现，然后被放过了

这是整件事里最该回头看的地方。

我把容器导出来逐项审计了一遍：13 个标签、8 个触发器、13 个变量。当时唯一生效的 GA4 配置标签是 tag 6（`googtag`），它的真实配置是：

```
tagId = G-BWQYG6F2G3                          ✔
触发  = Initialization - All Pages + History Changes
eventSettingsTable：
    session_id      = {{Analytics Session ID}}
    session_number  = {{Analytics Session Number}}
没有 configSettingsTable ⇒ 直连 Google，自动 page_view 默认开启
```

**`eventSettingsTable` 那两行，就是最终的根因。**

而当时给出的判断是「这是服务端拼会话的常用做法」——**这条判断来自 AI 助手，我也认同了**——所以容器基本可以出局。理由是同一容器在 Edge、无痕、访客、无头里都正常发出 `page_view`，容器是所有页面共同的输入，不是环境差异的来源。

**这个判断本身就是错的。**它把一句听来的经验，当成了可以免检的结论。后面的受控实验会证明，这个「常用做法」恰好是唯一能致死的形态。

这个推理还错在哪？它假设「容器既然是所有环境共同的输入，就不能解释环境之间的差异」。

真相恰好相反。这个 bug 的本质就是「容器配置 × 环境会话状态」的交互。配置层里那两个值是宏，宏的返回值取决于该环境里有没有 GA 会话 cookie：

| 环境 | 会话 cookie | 宏返回 | 结果 |
|---|---|---|---|
| 无痕 / 访客 / 全新 profile | 无 | 空串 | 不致命 |
| 长期使用的 profile | 有 | 非法复合串 | 致命 |

**「容器在所有环境都跑了」，不等于「容器在所有环境都无害」。**

更精确地说：**当一个 bug 表现出环境差异时，最危险的误判就是把「配置」和「环境」当成两个互斥的候选。它很可能正是两者的交互。**

顺带纠正一个流传中的说法。光靠 grep 容器 JS 的通用关键词拿不到配置，`send_page_view`、`history_change` 这类词是运行时内部的固定名字表，每个容器都有。要拿配置本体，得读 `vtp_` 前缀的字段（`vtp_eventSettingsTable`、`vtp_dataField`…），或者直接用 GTM Preview。

### 收网：把范围钉在容器配置里

到这一步，火力已经全部集中到容器配置上。接下来是一组直接在 GTM 里改标签的实验：

| 实验 | 改动 | 结果 |
|---|---|---|
| A | 暂停原标签，新建一个 Google 标签（全默认 + 只填 ID） | 一切正常 |
| B | 切回原标签，只改动其中一处配置 | 症状随之变化 |

**实验 A 的价值是排除。**新标签用的是同一个 Measurement ID、同一个 GA4 属性、同一个站点、同一台机器、同一个 profile，全部正常。ID、属性、站点代码、网络、profile 这五样，一起出局。

**实验 B 的价值是定位。**切回原来那个标签、只动一处，症状就变了。问题出在 tag 6 自己的配置里，不是运行环境。

范围收拢到这里，**剩下的只有「容器里到底哪一格配置有害」这一个问题**。

#### 一段当时留下的推断

实验 B 动的那一处恰好是 `History Changes` 触发器，于是当时留下过一个推论：config 标签被 Initialization + History Changes 双触发，才是病因。

这条推断从来没有被证实，而且它的证据基础有一个结构性缺口。GTM Preview / DebugView 能逐条列出每次加载触发了哪些标签、`gtm.historyChange` 有没有真的出现过；而这一轮排查主力用的离线取证（读容器 JSON、跑无头浏览器、解析网络日志）看不到这些，只能推断。

「那个触发器到底有没有触发过」，我手上只有推断，没有观测。

当时那份分析自己在末尾也留了一根刺：本站不是 SPA，站点代码里没有任何 `pushState` / `replaceState` / `history.*` / `onpopstate` / `hashchange` 调用。那个触发器在静态代码层面无事可做。

最后的受控实验给出了完全不同的答案：病根在 `eventSettingsTable`，与触发器无关。只改那一格就能稳定复现，触发器一动不动。

**缺一层观测，人就会用推断去填那个洞。而推断写下来，和观测记录长得一模一样。**

---

## 决定性实验

把线上容器原样搬到本地跑，唯一变量是 `eventSettingsTable` 里那一格的值，每个变体跑两次加载（GA4 请求在本地一律拦成 204，不会打到真实属性上）：

| 变体 | 配置内容 | 第 1 次加载 | 第 2 次加载 |
|---|---|---|---|
| `fixed` | 无（= 修复后的线上配置） | PV 1 条，`sid` / `sct` 正常 | PV 1 条 |
| `orig` | 宏取值（= 故障配置） | PV 1 条，`sid` 丢失 | PV 0 条 |
| `sid_only` | 只覆盖 `session_id` | PV 1 条，`sid` 丢失、`sct=1` | PV 0 条 |
| `num_only` | 只覆盖 `session_number` | PV 1 条，`sid` 正常、`sct` 丢失 | PV 0 条 |

三条读法。

**只覆盖其中一个键就足以复现。**不是「两个值互相打架」，任一个被外部改写都会致命。

**第 1 次加载还能发，第 2 次才彻底不发。**这个「延迟一步」是本案最深的坑，后面单独讲。

**`sid_only` 那一行给出了「外部写入」最直接的证据。**它出现了一个 GA4 原生不会产生的组合：`sid` 没了，`sct` 还在。客户端本来是成对写这两个字段的，出现「半覆盖」，只能是配置层按字段覆盖了其中一个。

---

## 根因

GTM 容器里 Google 标签（tag 6）的事件设置表，**把 `session_id` 和 `session_number` 写进了 GA4 自己的会话槽位**。

这两个名字看起来像自定义参数，实际不是。GA4 请求里的 `sid`（session id）和 `sct`（session number）就是它们；客户端内部的字段映射表把这两个内部键直接映射到请求参数上。

所以往配置层写 `session_id`，不是「加了一个自定义参数」，是「往 GA4 自己的会话槽位里写了一笔」。

### 这个坑是 2025 年底才变得容易踩的

`session_id` / `session_number` 作为 GA4 的字段、以及「配置层值优先于内置值」这条规则，都不是新东西。gtag 的字段优先级（全局 `set` < config < 事件参数）在官方表述里是 established（既有的）规则，早于那次更新；我从线上拉到的最新版 gtag.js 里，这两个名字也确实同时躺在保留字段名表和字段映射表中。

**真正变化的是「拿到这两个值」的成本。**

2025-12-11 之前，GTM 里没有开箱可用的变量来读 GA 的会话 ID。想拿只有非官方路子：写 Custom JavaScript 解析 `_ga_<ID>` cookie（2025-08-01 起，自定义模板里多了个 `readAnalyticsStorage` 沙箱 API，但那要会写模板，不算开箱即用）。这条路本身也不稳，2025-05-06 GA4 把 cookie 格式从 `GS1` 换成 `GS2`，一批按位置解析的脚本静默失效过。

2025-12-11，GTM 上线了三个内置变量（`Analytics Client ID` / `Analytics Session ID` / `Analytics Session Number`）和一个新的变量类型 `Analytics Storage`。官方给它的定位是让 GTM 能读到 GA 的标识符，用于 CRM 拼接、离线转化、服务端对接。是读取用的。

于是这条链路的形状变了：

| | 2025-12-11 之前 | 之后 |
|---|---|---|
| 读会话 ID | 自己写 Custom JS 解 cookie（脆弱，格式一改就断） | 下拉框选一个变量 |
| 把它写回配置层 | 需要手写代码，多数人不会走到这一步 | 同样是下拉框 |

**风险本身没有变，变的是犯错的成本。**读取那一端被官方修得又稳又便宜了，而「读到的值该放在哪里」这一步，**没有护栏**。

---

## 为什么这个配置会导致问题

### 机制链

第一步，配置优先。

客户端处理每条事件时会调 `copyToHitData(key, fallback)`：

```js
copyToHitData = function (key, fallback) {
  var d = 从配置里取(key);            // 配置里有值就用配置的
  d === undefined && (d = fallback);  // 没有才退回客户端自己算的
  d !== undefined && 写进本条 hit(d);
};
```

**配置层里那个值会盖掉客户端自己算出来的会话状态。**

第二步，只影响每次加载的第一条事件。

```js
this.po(ER(a, this.clientId));
this.la = !0;                                     // ← 首条事件处理完就置位
...
FR(a, this.clientId, this.wb, this.J, !this.la);  // ← 第 5 个参数 = !this.la
```

`FR` 的第 5 个参数为真（还没处理过事件）时才走 `copyToHitData`。

这解释了那个反复出现的现场：同一份配置、同一次加载，`page_view` 被丢掉，紧接着的 `scroll` 却照发，而且 `sid` / `sct` 都正常。差别只在「是不是第一条事件」。开头那条最反常识的观察，机制上的答案在这里。

第三步，校验失败即丢包。

```js
ER = function (a, b) {
  var c;
  a: {
    if (!T(a, J.H.lg)) {
      var d = mQ(a);                     // ① 用 hit 里的 session_id / session_number 组装会话串
      if (d) {
        if (kQ(d, a)) { c = d; break a } // ② 校验
        S(25);                           // ③ 失败：记内部错误码 25
        a.isAborted = !0;                // ④ 整条 hit 作废
        V(a, J.H.ib, !0)
      }
    }
    c = void 0
  }
};
```

**`isAborted` 发生在「要不要发送」这个决策点上，而不是发送过程中。**

所以它不会在 Console 留报错、不会在 Network 留记录、Tag Assistant 也显示正常。那些工具观测的都是「发生之后」的事。所以它才能藏一个星期，这也是开头第三个说不通的答案。

> 代码出处：以上片段来自公开可下载的 GA4 客户端 JS（任何装了 GA4 的页面都能取到，经过压缩混淆）。变量名每次构建可能不同，但 `isAborted`、错误码 `25` 这类 token 是稳定的，可用于比对。

### 为什么只有那个宏致命

不是「随便什么值都会炸」：

| 配置层里写的值 | 结果 |
|---|---|
| 常量 `""`（空串） | PV 照发，但 `sid` / `sct` 一直缺失 |
| 常量 `"1790098290"`（真实值，但属于另一个会话） | PV 照发，`sid=1790098290 sct=2`，甚至被写进了会话 cookie |
| 数字类型 `1790098290` / `2` | 同上，照发 |
| 不存在的 Data Layer 变量（`undefined`） | 完全无异样 |
| `{{Analytics Storage → Session ID}}` 宏 | 第 1 次丢字段、第 2 次丢整条 |

**常量全都不致命，只有宏致命。**

因为那个宏**返回的根本不是 session id**。

`Analytics Storage` 的返回值取决于一个极易被忽略的配置项：Measurement ID 填没填。从容器里取出它的模板实现（去压缩后）：

```js
g = function () {                              // 用于 session_id
  if (a.measurementId) {                       // ① 填了 Measurement ID
    forEach(sessions, function (i) {
      if (i.measurement_id == a.measurementId)
        return makeString(i.session_id);       //    → 返回裸值
    });
    return "";
  }

  // ② 没填 Measurement ID
  i = sessions.map(function (j) {
    return j.measurement_id + ":" + j.session_id;
  });
  return i.length > 0 ? ("ASV1" + "." + i.join(",")) : "";
};
```

| Data Field | 填了 Measurement ID | 留空 |
|---|---|---|
| `Client ID` | — | 裸值 |
| `Session ID` | 裸 session id | `ASV1.<measurement_id>:<session_id>` |
| `Session Number` | 裸数字 | `ASV1.<measurement_id>:<session_number>` |

留空时，它返回的是一个带 `ASV1.` 前缀、冒号分隔的复合字符串，例如 `ASV1.G-XXXXXXX:1790064344`（多个 GA 属性 cookie 时还会用逗号连接）。

**这不是 session id，是一个编码串。**把它写进 GA4 的会话槽位，组装出的会话串当然过不了校验。

这个复合值的行为有第三方实施记录独立佐证（ayudante.jp，2025-12-22，即该变量上线 11 天后）：

> 当页面上存在多个 Web Stream（多个 Measurement ID）时，该变量会输出全部对应的值，用逗号分隔。
> 这类变量只是直接从浏览器 cookie 读取并透传。所以对首次访问者——cookie 尚不存在——变量返回空值，要等后续的事件触发才有值。

这两条恰好就是本案的机制要害：

- 多属性 → 逗号连接的复合值 → 喂进 `session_id` 更难合法
- 首次访问返回空值 → 直接对应「第 1 次加载能发、第 2 次加载彻底不发」

**所以炸掉的真正原因，是类型不对。**常量值再离谱，格式是合法的；宏返回的串再接近正确，格式是非法的。

这一条也解释了前面每一行：常量 `""` 不致命，因为它和「没有 cookie 时宏返回空串」是同一个值；常量的真实值或数字不致命，因为格式合法、只是值不对；只有宏致命，因为只有它会返回 `ASV1.` 开头的复合串。

「第 1 次加载能发、第 2 次不发」也在这里——首次加载还没有会话 cookie，宏返回空串；cookie 一建立，就变成复合串了。

### 那个「第 1 次加载」陷阱

**它是本案里最贵的一课，至少两次判断栽在它上面。**

清掉 cookie 再访问一次，`page_view` 回来了（这是第 1 次加载，宏返回空串，不致命），看起来问题解决了。再刷新一次，又没了。

Astro 那次「改完就好了」，很可能也是单点观测撞上了这个窗口。

**这一点必须靠「连续访问两次」才能看穿。**只做一次导航就收工，很容易把中间环节当成根因，因为它确实「删掉就好了」。

---

## 修复方式 / 给实施人员的建议

| 优先级 | 动作 | 说明 |
|---|---|---|
| **1** | **从 Google 标签的配置层里删掉 `session_id` / `session_number`**（在事件设置表 `eventSettingsTable` 里，不在配置设置表） | 根因所在。这两个字段是**只读句柄，不是写入口** |
| 2 | 会话标识不要通过 GA4 标签往外传 | 给 CRM 用**表单隐藏字段**（GTM 负责填值，提交时跟着表单走）；给服务端就在**服务端自己取**。这是两条独立管道，不该借 GA4 的 hit 捎带 |
| 3 | 顺手摘掉静态站上多余的 `History Changes` 触发器 | 静态站没有 SPA 路由，这个触发器没有活干。注意这是卫生问题，与本案病因无关 |
| 4 | 若容器里已有这种宏、一时摘不掉，给它填上 Measurement ID | 会返回裸值，至少不再是复合串。**这是临时降险，不是修复** |

第 2 条要展开说，因为最容易在这里走偏。

**换个名字继续塞，还是一次绕过，不是修复。** `ga4_session_id` 这类名字确实不会再撞上保留字段，但你在做的事没变——还是在用 GA4 的请求捎带一份本来不属于它的数据。会话标识要给谁，就走谁的管道：

| 要给谁 | 怎么给 |
|---|---|
| CRM | 表单的隐藏字段（GTM 负责填值，提交时跟着表单走） |
| 服务端 / 离线转化 | 在服务端自己取，不要在客户端用 GTM 拼 |
| GA4 报表里的自定义维度 | 用自定义参数名，同时避开那批保留字段名 |

顺带一个技术点：gtag 的字段优先级是全局 `set` < config < 事件参数，事件参数优先级最高，这一条官方有明确表述。

**那把它放进事件参数里，会不会走上和配置层一样的覆盖路径？我没有验证过。** 所以这篇不给结论。本篇的立场是另一回事：既然有的管道可以走，就没有理由借 GA4 的请求走。

还有一个更根上的理由：**配置层的值是冻结的。**配置层里的值在标签触发的那一刻求值、之后定格，不会随同页后续事件重新计算——这正是前面机制链里 `copyToHitData`（配置优先）的另一面。

把「每次加载都该重新算」的会话标识，放进「永远冻结在首次触发」的配置层，语义上就说不通。那是拿上一次加载存下来的旧会话，去覆盖客户端本次算出来的会话状态。

修复完成后，在本地容器上跑了 80 次加载回归，`page_view` 全部正常。

### 自查清单

遇到「GA4 没数据但标签显示正常」，按这个顺序查：

| 步 | 查什么 | 命中特征 |
|---|---|---|
| 1 | Network 面板里 `/g/collect` 到底有没有 | 一条都没有 → 请求从未产生，别在拦截方向浪费时间 |
| 2 | `performance.getEntriesByType('resource').filter(r => r.name.includes('/g/collect'))` | DevTools 会骗人，这个 API 不会 |
| 3 | 容器的配置层：Google 标签的配置设置 / 事件设置表里，有没有 `session_id`、`session_number` | 有 → 基本可以定案 |
| 4 | 这些值的来源是不是 `{{Analytics Storage → …}}` 这类宏 | 是 → 这就是嫌疑所在，见修复第 1 条 |
| 5 | 连续访问两次 | 第 1 次正常、第 2 次失败 → 典型的本案签名 |

**第 1 步和第 3 步是关键。**网上能搜到的排障清单几乎都建立在「请求已经产生了」这个前提上（查扩展、查 Consent、查 CDN、等 24–48 小时）。本案的失败在发送之前就结束了，用那些清单查不到这一步。

---

## 附：复现材料

完整复现材料分四类整理：

| 类别 | 内容 |
|---|---|
| reproducible test | 把线上容器搬到本地、只改 `eventSettingsTable` 一格、跑 9 个变体 × 2 次加载的完整脚本（GA4 请求本地拦成 204，不会打到真实属性） |
| probe / instrumentation | 页面侧诊断插桩：hook `fetch` / `sendBeacon` / `XHR` / `new Image()` 四个发送通道，记录「有没有尝试发送」，外加 `dataLayer` / cookie / consent / 生命周期状态快照 |
| GTM export / patch / reproduction code | 容器导出的相关片段与事件表补丁工具。注意一个坑：GTM 容器 JSON 里的列表值必须带 `"list"` 标记，漏掉整个容器不会加载 |
| raw experiment results | 每次加载的 PV 计数、`sid` / `sct`、会话 cookie 全文、容器加载诊断的原始 JSON |

---

## 小结

现象：GA4 收不到 `page_view`，其他事件正常；只在长期使用的浏览器 profile 里复现。

根因：GTM 里 Google 标签的事件设置表，把 `session_id` / `session_number` 写进了 GA4 自己的会话槽位。

机制：配置优先覆盖 → 只影响首条事件 → 会话串校验失败 → `isAborted` → 发送前中止。

为什么只有宏致命：`Analytics Storage` 在 Measurement ID 留空时返回 `ASV1.` 复合串，格式非法。

为什么只有那个 profile 复现：宏的返回值取决于该环境有没有会话 cookie。

修复：从配置层删掉这两个字段。

回头看开头那三个说不通，一个根因把它们一次性解释掉了：

| 说不通的地方 | 解释 |
|---|---|
| 为什么其他事件正常，只有 `page_view` 没了 | 只有每次加载的第一条事件会被配置层覆盖 |
| 为什么换个窗口就正常 | 宏的返回值取决于该环境有没有会话 cookie |
| 为什么所有工具都说正常 | `isAborted` 发生在「要不要发」的决策点，而不是发送过程中 |

排查跨了七天，查过六个方向：托管 → 渲染 → 浏览器 → 预渲染 → 状态 → 容器配置。六个全走空，最后靠收网实验收口。

**而答案是：它在第四天就被逐字写进了文档**，当时被判断为「服务端拼会话的常用做法」，因而放过了。

我当时说服自己的理由是「同一容器在所有环境都跑了，所以容器不是环境差异的来源」。

**但当 bug 表现出环境差异时，配置与环境不是两个互斥的候选。它很可能正是两者的交互。**
