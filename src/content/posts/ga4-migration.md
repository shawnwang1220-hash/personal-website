---
title: "GA4 事件追踪与归因：迁移 UA 的实战清单"
description: "迁移不是“换个工具”，而是重新定义你要衡量的事。一份可直接照做的清单。"
pubDate: 2026-08-12
tags: ["GA4", "Tracking"]
---

## GA4 事件追踪与归因：迁移 UA 的实战清单

Universal Analytics 已退役，GA4 是现在的事实标准。迁移不是“换个工具”，而是**重新定义你要衡量的事**。

### 迁移三步走
- **梳理业务目标**：先想清楚要追踪哪些关键动作（试用、演示申请、白皮书下载）
- **规划事件 schema**：用 `event_name` + `params` 而非 UA 的固化维度
- **配置归因**：默认数据驱动归因，必要时对比末次点击

### 常用事件示例
| 事件名 | 触发时机 | 关键参数 |
| --- | --- | --- |
| `generate_lead` | 表单提交 | `lead_source` |
| `book_demo` | 预约演示 | `product` |
| `page_view` | 页面浏览 | `page_title` |

```js
gtag('event', 'generate_lead', {
  lead_source: 'linkedin_ads',
  value: 1
});
```

> Tracking 的精度，决定了优化的上限。
