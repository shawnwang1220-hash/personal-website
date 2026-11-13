---
company: "独立顾问"
role: "数字营销与 MarTech 顾问"
start: "2025.10"
end: "至今"
summary: "在自有域名上从零搭起站点、表单与追踪全链路，Web 端与 Server-Side 两套追踪并行，作为营销技术栈的试验场。"
highlights:
  - "tianxu.uk：Astro 个人站，代码在 GitHub，每次提交由 Cloudflare 自动构建部署；AI 辅助开发，没有外包，也没用建站模板。站点、表单、追踪都跑在这一个站上。"
  - "自建表单链路：表单到服务端的链路自己搭，提交后同时写入 Cloudflare D1 与 Notion 两份，不依赖第三方表单服务，也没有人工导出环节；隐藏字段把 GA4 Client ID 写进线索记录，用 GA4 DebugView 验证。"
  - "双端追踪：GTM + GA4 的 Web 端追踪配置，另建一套 Server-Side GTM 测试环境（Stape），初步跑通 GA4 服务端转发。"
  - "排障与复盘：定位 GA4 page_view 丢失的原因——Google 标签里手填的 session_id / session_number 覆盖了 GA4 会话参数；修复后回归验证通过，并写成公开复盘。"
---
