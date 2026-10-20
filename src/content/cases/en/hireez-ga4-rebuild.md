---
title: "Rebuilding GA4 tracking across five subdomains"
summary: "HireEZ ran five subdomains on one GTM container from the UA era. I rebuilt the tracking for GA4 rather than porting it, closing three gaps inside GTM."
tags: ["GA4", "GTM", "Tracking"]
problem: "Google announced the end of Universal Analytics, putting a hard deadline on migration. HireEZ's site spans five subdomains behind one GTM container left over from the UA era; the business side only reads the data and never touches the container, so a gap or a mismatch in definitions would be visible immediately. On top of that, UA's category / action / label scheme has no direct mapping onto GA4's event + parameter model, and a one-to-one migration would just carry the old structure into the new tool."
approach: "Rebuild, not migrate: the event model was redesigned across click, scroll depth, 404, form success, demo request and chatbot interaction, with every existing function reimplemented and dimensions UA never had. The goal was never to reproduce UA's numbers. UA and GA4 then ran in parallel from the day the sunset was announced, for a long stretch; the two never reconciled line by line, and the acceptance bar was totals in the same range with every function working. Three further problems were solved inside GTM itself: page load time, popup targeting and subscription conversion."
result: "UA and GA4 totals land in the same range and every function works. What the business side received was reports and dashboards, not the container itself. Page load time, popup targeting and subscription conversion all shipped inside GTM, with no extra front-end work."
learned: "The hard part of a migration is not moving things, it is defining what counts as matching before you start. Settling on totals in the same range was more honest and more deliverable than chasing line-by-line parity. An event belongs at the moment a business outcome appears, not at the user's action. Anything that can be configured in GTM saves a front-end queue slot."
stack: ["GTM", "GA4", "Universal Analytics", "6sense"]
date: 2026-10-20
---

## Gaps and how each was closed

| Need | Shape under UA | The gap in GA4 | What I did |
| --- | --- | --- | --- |
| Page load time | Site Speed report | No equivalent report | Navigation Timing variable sent as an event parameter |
| Popup targeting (industry × visit count × path) | Rode on a personalization tool | Per-user timing sits behind a paid tier | First-party cookie counter + rules in the container |
| Three newsletter forms → one conversion | Form submit event | A submit does not mean a successful signup | Element Visibility trigger on the confirmation message |

## Page load time

UA had a Site Speed report and GA4 has no replacement, while the front-end team used that metric as a performance KPI and early-warning signal. Letting it disappear was not an option.

What I did: a custom JavaScript variable on the Navigation Timing API, taking `loadEventEnd` minus `startTime`, rounded to 0.1 s, sent as an event parameter. A rule on the tag blocks zero and negative values, so a page with no load event cannot write bad data into the property.

Scope: it reflects the document's own load only, not later in-site navigation.

## Popup targeting

Popups had to depend on three conditions at once: company industry (from 6sense), visit number and page path.

The paid personalization tool the 6sense rep recommended produced nothing measurable after a year of use, and across comparable tools per-user timing sits behind a paid tier. So I built it in GTM:

- a Custom HTML tag increments a first-party `pageviewCount` cookie with a 3.5-day expiry;
- a cookie variable reads the value back;
- per-industry rules compare it to 1 or 2.

Adjusting frequency is a number edit and a publish, with no front-end ticket.

The limit: the state lives in the browser and only works on one domain.

## Three newsletter forms, one conversion

The three forms sit in different positions but surface the same confirmation message; the business question is whether someone subscribed, not which form they used.

The forms post to a Pardot form handler and the result comes back only as an in-page message. A submit event proves the button was clicked, not that the signup went through. So instead of listening for submits, I bound an Element Visibility trigger to the confirmation-message selector the three forms share: the moment the message appears is the moment the conversion is recorded.

One trigger covers all three forms with zero template changes, and the conversion is set to count once so repeat signups do not inflate it.

## Data definitions

- The two never reconciled line by line: different data models, so the bar was totals in the same range with every function working.
- The subscription conversion counts once, so repeat submissions do not inflate it.
