---
title: "Pageviews Halved, Conversions Didn't Move: A Cookie Consent Gap"
summary: "After a full site redesign, GA pageviews dropped by roughly half while conversions stayed flat. Splitting new versus returning visitors traced it to a Cookiebot banner that neither stood out nor blocked browsing; a fix spec handed to design and frontend restored reporting immediately."
tags: ["GA4", "Cookie Consent", "Data Quality"]
problem: "Two metrics that should move together came apart — one halved, the other did not budge. That pattern points to a collection gap rather than lost traffic, and treating it as a traffic loss would have triggered three costly mistakes: rolling back the redesign, raising media spend, and redoing SEO."
approach: "Layered splits narrowed the gap to new visitors: rule out device, screen and regional breakage first, then separate new from returning, then walk the first-visit path as a new visitor. From there I handed the cause and the requirements to design and frontend; my role was diagnosis, specification and post-launch verification."
result: "Pageviews recovered immediately once the new banner with a consent overlay shipped. Reporting became trustworthy again, so the team could keep making decisions on pageviews, sources and on-site behaviour — and no rollback or extra media spend was wasted on a traffic drop that never happened."
learned: "When pageviews and conversions diverge, check measurement before traffic. Technical dimensions only rule out breakage; the new-versus-returning split is what actually locates a tracking gap. Data tells you where something is wrong, but only walking the page tells you why. And consent is data infrastructure — it belongs on every redesign's acceptance checklist."
stack: ["Google Analytics", "Cookiebot", "CRM"]
date: 2026-10-30
---

## Problem

After a full redesign of the website, Google Analytics showed two things:

- Pageviews down by roughly half
- Conversions essentially flat

Those two signals do not belong together. If traffic had genuinely been lost, conversions would normally fall with it. Conversions did not move, which suggests the business itself was unaffected and that the more likely culprit was data collection.

Treating it directly as a traffic collapse — rolling back the redesign, increasing media spend, redoing SEO — would have burned a lot of team time and misjudged the redesign's impact. So the first step was to establish whether traffic had really dropped or had simply stopped being recorded.

## Approach

### Split the data first, assume nothing

I broke the data down along several dimensions and ruled out possibilities one at a time:

| Dimension | Purpose |
| --- | --- |
| Device type, screen resolution | Rule out page errors or scripts failing to load on a specific device or screen size after the redesign |
| Country / region | Rule out regional issues, and check whether privacy compliance differs by market |
| New vs. returning visitors | The most decisive cut, covered below |

None of the device, resolution or country breakdowns showed a segment falling off a cliff — the decline was fairly even, which is itself a clue: this did not look like a device or region failure.

### The finding: new and returning visitors behaved differently

Splitting by new versus returning visitors made the difference obvious: the gap was concentrated in new visitors. Returning visitors had already made a consent choice, so their data looked normal.

That pointed the investigation at "what happens on a first visit" — in other words, the cookie consent flow.

### Back to the page: reviewing the new site UI

I then walked the new site myself along a first-time visitor's path, focusing on the Cookiebot banner, and found two problems:

- **The banner was easy to miss**: the redesigned layout let it blend into the page
- **Browsing was not restricted**: visitors could keep using the entire site without clicking consent

The site's tracking was configured to block analytics scripts before consent. The result: a large share of new visitors browsed without ever clicking consent, and those visits never reached Google Analytics.

### Why conversions did not drop

Because conversions are calculated against CRM definitions and are unaffected by GA data. GA lost recorded visits, not actual business — the conversion curve was flat because it never passed through this collection path in the first place.

### Defining the fix, handed to the team

I documented the cause and the requirements and handed them to design and frontend:

- Redesign the Cookiebot banner so it is visually unmissable
- Restrict browsing until a visitor makes a choice, using an overlay

Design produced the new banner, frontend implemented and shipped it. My role was to diagnose the problem, define the solution, and verify the result after launch.

## Result

- Pageviews returned to normal immediately after the new banner shipped
- Reliable traffic reporting was restored, so the team could once again make decisions on pageviews, sources and on-site behaviour
- A false "traffic decline" was avoided, along with the rollback or media spend changes it would have justified

## Learned

The experience produced a reusable order of investigation.

1. **Establish whether it is a real change or a measurement change**: when pageviews and conversions diverge, suspect missing tracking before assuming traffic was lost.
2. **Narrow the scope with multi-dimensional splits**: start with technical dimensions — device, resolution, country — to rule out breakage and regional issues, then move to user dimensions.
3. **New versus returning visitors is the highest-value cut for tracking gaps**: if the gap sits with new visitors, examine the first-visit flow — consent, redirects, scripts firing on first load.
4. **Always go back to the page and walk the user path yourself**: data tells you where something is wrong; why it is wrong usually requires seeing the page.
5. **Treat consent as data infrastructure**: a cookie banner is not just a compliance component, it decides which users get counted. It belongs on the redesign acceptance checklist.
6. **Hand over a fix spec, not a complaint**: state the cause, the intended behaviour and the acceptance criteria so design and frontend get it right the first time.
