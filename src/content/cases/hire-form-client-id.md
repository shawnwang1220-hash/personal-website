---
title: "线索级追踪：表单隐式收集 GA4 client_id"
summary: "线索脱钩的问题，用两个隐藏字段补齐：表单提交即带 GA4 的 client_id 与 session_id，落 D1 和 Notion，读不到就留空。"
tags: ["GA4", "GTM", "埋点", "BigQuery"]
problem: "表单只收姓名、邮箱、需求三样，提交成功的那一刻，这条线索就与 GA4 里那段访问行为脱钩了。GA4 只知道「发生过一次提交」，Notion 里只有一个联系人，两边没有任何能对上的键——想知道这位客户看过哪些页面、从哪个渠道来，只能靠猜。"
approach: "在表单加两个隐藏字段，不增加任何填写项。页面脚本从 _ga 和 _ga_（衡量 ID）两条第一方 cookie 里解析出 client_id 与 session_id，提交前再重读一次，随请求发给自己的 Worker；两个字段都非必填，读不到就留空。Worker 按格式校验后写入 D1 与 Notion，同时把这两个值挂到 dataLayer 的表单成功事件上，留给 GTM 后续使用。GA4 侧不做任何改动——不注册自定义维度。"
result: "上线后每条提交都带着一个能与 GA4 导出记录对上的标识，前提是访客的 cookie 没被隐私设置或广告拦截切断。表单可用性没有变化：广告拦截、无 JS 提交、cookie 过期三种留空场景都实测过，提交照常完成。"
learned: "两个坑值得记：_ga_（衡量 ID）现在发的是 GS2 格式，按 GS1 写解析会让 session_id 静默为空——不报错、不上报，只能靠实测发现；隐藏字段可以随便改，服务端必须自己校验格式，不能信前端。另外「记下来」和「在 GA4 里看得见」是两件事，不注册维度就只有 BigQuery 能查。"
stack: ["GA4", "GTM", "Cloudflare Workers", "D1", "Notion", "BigQuery"]
date: 2026-10-27
---

## 为什么不注册 GA4 自定义维度

一句话：自定义维度是提前定死的那几列，BigQuery 是原始数据。

注册一个用户级自定义维度，确实能在探索里按它筛。但筛出来的只是聚合过、抽样过、你提前想好要看的那几列。真要回答「这个人从落地页到这里走了几步、中间看了哪几篇」的时候，还是得去 BigQuery。

再加上自定义维度有配额上限，创建之后删不掉（只能归档），名字和范围定错了基本等于占坑。而这个字段的实际使用频率很低——一年可能查几次——不值得占一个坑。

代价也要说清楚：**不注册，GA4 界面里就完全查不到这个值**。只能用 BigQuery 导出，或者把 D1 的记录导出来，在 Looker Studio 里跟 BigQuery 结果做混合数据源。

## 值从哪来

两条都是 GA4 自己写的第一方 cookie，JS 可读，不需要任何额外授权：

| cookie | 形态 | 取出 |
| --- | --- | --- |
| `_ga` | `GA1.1.<前段>.<后段>` | 拼成 `<前段>.<后段>`，就是 client_id |
| `_ga_<衡量 ID>` | `GS2.1.s<会话号>$o<序号>$…` | 取 `s` 后面的数字，就是 session_id |

client_id 在 cookie 有效期内不变；session_id 每 30 分钟无活动就换一个。

会话号这里踩过一次坑。老格式是 `GS1.1.<会话号>…`，新格式是 `GS2.1.s<会话号>$…`，多了一个 `s` 前缀。按老格式写的正则匹配不上，结果是 session_id 恒为空——**而且不报错**。你只会看到「这个字段一直是空的」，联调十次也未必能定位。兼容两种格式的写法：

```js
var m = gs.match(/GS\d\.\d\.s?(\d+)/);
```

## 三个留空场景

字段设成非必填，是因为下面三种情况一定会发生，不能让它们变成提交失败：

| 场景 | 后果 |
| --- | --- |
| 广告拦截 / 隐私扩展 | `googletagmanager.com` 被拦，GA4 不初始化，cookie 根本不存在 |
| 无 JS 提交 | 原生 form post，脚本没跑，隐藏字段是空串 |
| Safari 的 ITP | 第一方 cookie 也有 7 天上限，过期后重新生成，跨周对不上 |

第三种最容易被忽略：它不是「拿不到」，而是「拿到了，但换了一个人」。同一个访客隔两周再来，client_id 已经变了，按 client_id 回溯会断在中间。

## 服务端不信前端

隐藏字段对用户可见、可改，一个改成任意值的请求就能把脏数据塞进 Notion。所以 Worker 侧做格式校验，不合规一律置空：

```js
const CLIENT_ID_RE = /^\d{1,20}\.\d{1,20}$/;
const SESSION_ID_RE = /^\d{1,20}$/;
```

判断标准是：**这个字段是锦上添花，它的异常不该影响「收到一条线索」这件事**。写库在前，下游（Notion、邮件通知）各自容错，任何一步失败都不回滚主记录，也不让访客看到报错。

## 要用的时候怎么查

GA4 的 BigQuery 导出里，`user_pseudo_id` 就是 client_id。拿存下来的值直接等值查：

```sql
SELECT
  event_name,
  event_timestamp,
  (SELECT value.string_value FROM UNNEST(event_params)
    WHERE key = 'page_location') AS page
FROM `your-project.analytics_XXXXXXX.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20261001' AND '20261031'
  AND user_pseudo_id = '807214021.1793021546'
ORDER BY event_timestamp DESC
LIMIT 200
```

要看会话级，再取 `event_params` 里的 `ga_session_id` 做一次过滤。

## 口径与局限

- **它只解决「事后回溯」，不提升归因精度**。想知道线索来自哪个渠道，表单提交这个事件本身在 GA4 里已经带着完整的来源信息。client_id 的唯一增量是：拿到一个具体的人，能反查他看过什么。
- **跨设备不可能**。client_id 存在浏览器里，手机和电脑是两个人，没有任何办法合并。
- **覆盖不全**。上面三个留空场景加起来不是小数目，这条链路天生是抽样，不是全集。
- **不要把它当用户 ID 用**。它是浏览器级的假名标识，清 cookie、换设备、换浏览器都会断，也不受用户控制。
