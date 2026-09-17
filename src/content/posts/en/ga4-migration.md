---
title: "GA4 Event Tracking & Attribution: A Practical Migration Checklist"
description: "Migrating off UA isn't swapping one tool for another — it's redefining what you measure. A checklist you can follow as-is."
pubDate: 2026-08-12
tags: ["GA4", "Tracking"]
---

## GA4 Event Tracking & Attribution: A Practical Migration Checklist

Universal Analytics has retired and GA4 is now the de facto standard. Migration isn't swapping one tool for another — it's **redefining what you measure**.

### Three steps to migrate
- **Map your business goals**: decide which key actions to track first (trials, demo requests, whitepaper downloads)
- **Design an event schema**: use `event_name` + `params` instead of UA's fixed dimensions
- **Configure attribution**: data-driven by default, compare against last-click when needed

### Common events
| Event | Fires when | Key parameter |
| --- | --- | --- |
| `generate_lead` | Form submitted | `lead_source` |
| `book_demo` | Demo booked | `product` |
| `page_view` | Page viewed | `page_title` |

```js
gtag('event', 'generate_lead', {
  lead_source: 'linkedin_ads',
  value: 1
});
```

> The precision of your tracking sets the ceiling for your optimization.
