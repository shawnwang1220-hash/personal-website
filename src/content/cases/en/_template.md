---
# ─────────────────────────────────────────────────────────────
# Case study scaffold. How to use:
#   1. Copy this file to <slug>.md (drop the leading underscore).
#   2. A Chinese counterpart with the SAME filename must exist at
#      src/content/cases/<slug>.md — otherwise `npm run seo:check`
#      fails on a dead hreflang link.
#   3. Then run: npm run check && npm run build && npm run seo:check
#
# The body is for details only. The four sections (problem / approach /
# results / what I learned) are rendered by the template — do not repeat
# them, and never use a level-1 `#` heading (the page already has an h1).
# ─────────────────────────────────────────────────────────────

title: "Case title: what the project was, in one line"
# Card summary + page meta description. One line = context + your role + key result.
summary: "TBD: one line covering the context, your role and the key result."
# Navigation dimension, shown as chips on the card and detail header. May be [].
tags: ["GA4", "CRM"]
# Headline result number, rendered large on the card and detail header. Delete if there is none.
metric: "+214%"

# ── The four sections ─────────────────────────────────────
# Plain text, 1–3 conclusion-style sentences each. No inline markdown —
# put bold text / links / tables in the body instead.
# Fold the context into the opening of `problem`; do not add a separate section.
problem: "1–3 sentences. Industry and business stage + the core problem + why it mattered."
approach: "1–3 sentences. What you actually did: strategy, process, stakeholders. Put tools in `stack` below."
# At least one of `result` / `learned` is required (validated by the schema).
result: "1–3 conclusion-style sentences. Keep this consistent with `metric` above."
learned: "1–3 sentences looking back: what was the lever, what broke, what you would change."

# Tools used. May be [].
stack: ["GA4", "GTM", "Salesforce"]

# Share image: 1200×630 under public/ (e.g. /og/your-case.png).
# Falls back to the site default if left empty. A wrong path fails seo:check.
cover: ""
# Alt text for the share image, emitted as og:image:alt. Defaults to the page title.
coverAlt: ""
date: 2026-01-01
---

## Details

(Optional) Data definitions, tables, further reading. Start headings at `##`.
