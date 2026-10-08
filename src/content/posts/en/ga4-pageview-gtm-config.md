---
title: "GA4 page_view Not Sending: Seven Days of Debugging, One GTM Config Line"
description: "GA4 stopped collecting page_view while every other event kept flowing — and only in one browser profile. Seven days of debugging went from Cloudflare to the GTM container, where the answer had been written down three days earlier and dismissed as a common practice."
pubDate: 2026-09-23
tags: ["GA4", "GTM", "Tracking", "Post-mortem"]
keywords: ["GA4 page_view not sending", "GTM event settings table", "Analytics Storage session_id", "GA4 hit aborted", "GA4 events firing but no page_view", "page_view not collected GTM"]
---

## Background: this didn't look like a normal page_view loss

The site is `blog.tianxu.uk` — Astro, hosted on Cloudflare Pages, GA4 deployed through a GTM container.

It never looked like the usual "GA4 has no data" problem. Those usually come down to something obvious: the tag was never installed, the measurement ID is wrong, an extension is blocking the request. You find the one broken piece and you're done.

This one had three things that didn't add up:

- The same container, on the same page load: `page_view` disappears, every other event still fires
- The same browser, the same container: open a different window and it works
- A clean console, an empty Network panel, and Tag Assistant cheerfully reporting the tag fired

**Nothing looked broken. The data still didn't arrive.**

Those three facts turned this into a cross-layer tug of war, and none of them was explained until the very end, back at the container.

---

## Symptoms: no `/g/collect`, and no attempt to send one

Load the page in a normal window, leave it for 60 seconds, and here's the state:

```
dataLayer                                    : gtm.js → gtm.dom → gtm.load   (container finished)
gtm.js?id=GTM-WL55WFH8                       : HTTP 200
gtag/js?id=G-BWQYG6F2G3                      : HTTP 200 (loaded by gtm.js — the Google tag did fire)
JS errors                                    : none
performance.getEntriesByType('resource'), filtered for /g/collect : []
```

That last line is the anchor for the whole case.

I used `performance.getEntriesByType('resource')` on purpose rather than the DevTools Network panel. It isn't affected by whether the panel was open early enough, or by the panel's own type filters. Empty means nothing left the page.

A same-page control sharpened it:

- A `collect` request built by hand in the Console: succeeded, visible in GA4 Realtime
- The `scroll` event from Enhanced Measurement: sent normally

The failure collapses into one sentence: **gtag is alive, it can send, the requests reach GA4 — but `page_view` never even joins the queue.**

The evidence is a before/after experiment. After a `scroll` triggered a queue flush, the queue contained `scroll` and no `page_view`. This was never "queued but not sent." It was never queued.

**Same gtag instance, same queue: one event gets in, the other never reaches the door.** That observation became the test every candidate hypothesis had to pass. Anything that couldn't explain it was wrong.

### The environment matrix

| Environment | `page_view` |
|---|---|
| Chrome, normal window (long-lived profile) | not sent, reproduced repeatedly |
| Chrome, incognito | sent |
| Chrome, guest | sent |
| Edge (same machine, same network) | sent |
| Headless Chromium | sent |

---

## The trail: hosting → rendering → browser → prerender → state → container config

Six directions, all dead ends. Each one was reasonable.

### Hosting: Cloudflare, the repo, the build

The first suspect was Cloudflare's edge injection. Every live HTML page had this appended:

```js
window.__CF$cv$params={r:'...',t:'...'};
/cdn-cgi/challenge-platform/scripts/jsd/main.js
```

That's Bot Fight Mode / JS Detections. It's a zone-level toggle, not in the repo, and it was the only source of "live differs from the repo."

The same layer held a second Cloudflare suspect: Rocket Loader, which reorders script execution and has broken tracking before. It was off.

The repo-to-build path checked out item by item: `.node-version` and `package-lock.json` normal; no `_headers`, `_redirects`, `_routes.json`, `functions/`, or `_worker.js`, so nothing in the Pages config could rewrite responses or block scripts; the output directory really is `dist`; and the live HTML matched the local build byte for byte apart from that Cloudflare injection.

The decisive step was blunt. I mirrored the whole site to GitHub Pages. Same problem. Hosting was out.

> One trap in this layer: my test machine runs through a proxy, and `googletagmanager.com` isn't directly reachable from mainland China. "It works from here" never meant "it works for a visitor." That false positive came back to bite repeatedly.

### Rendering: Astro's build output

This layer surfaced earlier than the others, back when the symptom looked different — no `page_view` in any window type. The shape changed later, but the question didn't: did those two commits break it?

My suspicion was specific. Astro's `define:vars` and `is:inline` directives were said to conflict when used together, breaking GTM's initialization. Two commits had landed around then.

`8fc64d8` relaxed the build output for readability (`compressHTML: false`, `cssMinify: false`), switched small inline scripts to `<script is:inline>`, and stripped the TypeScript annotations while it was there. `26a749b` moved the GTM snippet to `set:html` so it would be emitted as-is.

After deploying, `page_view` appeared to come back.

**That's what makes this layer dangerous: it looked solved.**

So I built all three versions and compared the output:

| Version | GTM snippet in the output | Behavior |
|---|---|---|
| `1ab194b` (migration day one) | `(function(){const gtmId="…"; …})(…, gtmId); })();` | normal |
| `8fc64d8` ("before the fix") | byte-identical to `1ab194b` | normal |
| `26a749b` ("after the fix") | IIFE gone, ID hardcoded | normal |

**All three behaved identically.** That "fix" had zero effect on GTM.

Then I split the directives apart into a minimal matrix:

| Case | Source | Output | Result |
|---|---|---|---|
| p1 | `is:inline` + `define:vars` | wrapped in an extra IIFE | normal |
| p2 | `define:vars` only | byte-identical to p1 | normal |
| p3 | `is:inline` only (ID hardcoded) | emitted as-is | normal |
| p4 | `is:inline` + `set:html` | emitted as-is | normal |
| p5 | `is:inline` + leftover TS annotation | annotation ships to the browser | `SyntaxError: Unexpected token ':'` |
| p6 | no `is:inline`, TS annotation | Vite compiles it → `type="module"`, minified | normal |

Three conclusions.

One: `define:vars` and `is:inline` do not conflict; the second is redundant. The official docs are explicit — Astro will not process a `<script>` tag if it has any attribute other than `src`. `define:vars` is itself an attribute, so it already opts the script out of processing.

Two: the IIFE that `define:vars` wraps around the script is a safeguard, not a bug. It keeps the injected `const` inside a function scope instead of leaking it globally.

Three: what actually kills a script silently is `is:inline` bypassing TypeScript. Any non-`src` attribute makes Astro skip TS processing, so annotations ship raw to the browser, throw a `SyntaxError`, and the whole script block never runs. `8fc64d8` hit exactly that, which is why the same commit also removed `theme: string` and `querySelectorAll<HTMLElement>`.

So what was the "it works now"?

**The symptom itself fluctuates.** Comparing before-and-after against a symptom that moves on its own only ever yields noise. The same trap caught me twice in this case: here, and later with "deleting that cookie fixed it."

What finally settled this layer was a harder control — a two-dimensional matrix of code version against profile state, every cell actually run:

| Code version | Clean profile | Dirty profile |
|---|---|---|
| Current live (`set:html`) | normal | not sent |
| `8fc64d8` (`define:vars` + IIFE) | normal | not sent |
| `1ab194b` (migration day one) | normal | not sent |

**One column entirely normal, one row entirely broken.** Split perfectly by profile, split not at all by code version. Code version was out for good.

> An operational detail: this comparison can't be run against a local `127.0.0.1` server. The session cookie is bound to the domain, so it simply isn't sent to `127.0.0.1`, and the test returns "normal" no matter what. Comparing versions under the real domain means intercepting the request and serving the old HTML from there.

### Browser: extensions, and one wrong accusation

"It passes headless, my Chrome doesn't" pointed naturally at extensions.

**Both accusations in this section came from the AI assistant, not from me.** I hadn't been treating extensions as a real candidate — an ad blocker would block my own tracking, so I'm never going to run one. But it raised them, and ruling them out was cheap.

**First miss: the wrong profile.** It named `Google Analytics Debugger`, `Adswerve - dataLayer Inspector+`, and `Tag Assistant Legacy` as suspects. All three lived in a profile abandoned in March 2024 — an old recruiting tool from a previous employer. I couldn't find them in my active profile because they weren't there. The fix was to read `profile.info_cache.active_time` from `Local State` and identify the profile actually in use.

**Second miss: treating "capable of it" as "did it."** In the active profile it turned up several extensions with heavy permission sets (`debugger` + `scripting` + `webRequest` + `<all_urls>`), and recommended bisecting by disabling them.

I ran the test and it fell apart immediately: with every extension disabled there was still no `page_view`; guest mode, which doesn't load extensions at all, also had none; only incognito had it.

| Environment | Extensions | Result |
|---|---|---|
| Normal window (all disabled) | 0 | not sent |
| Guest mode | 0 | not sent |
| Incognito | 0 (disabled by default) | sent |

**Two environments with zero extensions behaved differently, which rules extensions out as the variable.** That's another thing that didn't add up: if the difference isn't extensions, where is it?

> Run the environments side by side before concluding anything. "Capable of causing it" and "caused it" are separated by an entire verification step.

### Prerender

Next candidate: Chrome's page preloading and prerendering. A prerendered page doesn't send `page_view` while `document.prerendering === true`; it waits for `prerenderingchange` to send it. If that replay fails, the first `page_view` is simply missing.

It explained a lot: normal windows don't send (preloading is on by default), incognito does (Chrome disables it there), and "scroll fires but page_view doesn't" fits — scroll is an event that fires after activation.

**A controlled experiment killed it.** Forcing `document.prerendering = true` produced this:

| Observation | Prerender state |
|---|---|
| `page_view` | suppressed |
| `scroll` | suppressed too |
| Recovery | after simulated activation, `_ga` appears and the PV fetch call shows up — a delay, not a permanent loss |

This case's signature is "scroll fires, only page_view doesn't." Prerender's signature is "scroll goes down with it." **They conflict.**

A second, independent disproof came from the actual configuration: the failing browser had network prediction and preloading explicitly disabled (`net.network_prediction_options = 2`), while the working one ran defaults. **Exactly backwards.**

### State: consent and profile

I ran a GTM/GA internal state script in both environments. Field for field, identical: `gtmKeys` matched and both contained `G-BWQYG6F2G3` (the Google tag registered on both sides), `tagDataKeys` matched, and `consent` showed all four items as `implicit: true`, `usedImplicit: true`, `active: false`.

**`active: false` means consent wasn't gating anything at all.** Consent Mode was out.

The lifecycle gates were ruled out by measurement too: `prerendering=false`, `activationStart=0`, `navType=reload`, `visibility=visible`.

At this point the network layer was fully exhausted and the conclusion pointed at the config layer: **`page_view` was never generated by gtag.**

### Config: the answer shows up, and gets dismissed

This is the part worth going back over.

I exported the container and audited it item by item: 13 tags, 8 triggers, 13 variables. The only active GA4 config tag was tag 6 (`googtag`), configured like this:

```
tagId = G-BWQYG6F2G3
trigger = Initialization - All Pages + History Changes
eventSettingsTable:
    session_id     = {{Analytics Session ID}}
    session_number = {{Analytics Session Number}}
no configSettingsTable ⇒ direct to Google, automatic page_view left on
```

**Those two lines under `eventSettingsTable` are the root cause.**

And the call at the time was "this is the common practice for stitching sessions server-side" — **that call came from the AI assistant and I agreed with it** — so the container was cleared. The reasoning: the same container sent `page_view` normally in Edge, incognito, guest mode, and headless — the container is a shared input across every environment, so it can't be the source of an environment difference.

**That judgment was wrong.** It took a second-hand piece of folk wisdom and treated it as a verified conclusion. The controlled experiment later showed that this "common practice" is the one configuration shape that is fatal.

Where does the reasoning break? It assumes that because the container is shared across every environment, it cannot explain a difference between environments.

The truth is the opposite. **The bug is precisely an interaction between container config and environment session state.** Those two config values are macros, and a macro's return value depends on whether that environment has a GA session cookie:

| Environment | Session cookie | Macro returns | Result |
|---|---|---|---|
| Incognito / guest / fresh profile | none | empty string | harmless |
| Long-lived profile | present | malformed compound string | fatal |

**"The container runs in every environment" is not the same as "the container is harmless in every environment."**

More precisely: when a bug shows up as an environment difference, the most dangerous mistake is treating config and environment as mutually exclusive candidates. It is very likely the interaction between them.

One side correction from this audit: grepping a container's JS for generic keywords doesn't get you the config. Terms like `send_page_view` and `history_change` are internal name tables present in every container. To read the actual configuration you need the `vtp_` prefixed fields (`vtp_eventSettingsTable`, `vtp_dataField`, and so on), or GTM Preview.

### Closing in: pinning the range to the container config

By now all the attention was on the container config. The next step was a set of experiments done directly in GTM:

| Experiment | Change | Result |
|---|---|---|
| A | Pause the original tag, build a fresh Google tag (all defaults, ID filled in) | everything normal |
| B | Switch back to the original tag, change exactly one setting | symptom followed |

**Experiment A's value is elimination.** The new tag ran with the same measurement ID, the same GA4 property, the same site, the same machine, the same profile — all normal. So the ID, the property, the site code, the network, and the profile were all out, together.

**Experiment B's value is localization.** Switch back to the original tag and change one thing, and the symptom moves. The problem lives in tag 6's own configuration, not in the runtime environment.

That left exactly one question: which setting in the container is harmful.

#### A hypothesis left on the record

The setting experiment B touched happened to be the `History Changes` trigger, so a hypothesis was left on the record at the time: the config tag being double-fired by Initialization + History Changes was the cause.

**That hypothesis was never confirmed, and its evidential basis had a structural gap.** GTM Preview / DebugView lists, load by load, which tags fired and whether `gtm.historyChange` ever appeared. The offline forensics I leaned on — reading container JSON, running headless browsers, parsing network logs — can't see any of that. It can only infer.

Whether that trigger ever fired, I had inference and no observation.

The original analysis even left a thorn in its own summary: this site isn't an SPA, and its code contains no `pushState`, `replaceState`, `history.*`, `onpopstate`, or `hashchange` calls. That trigger has nothing to do at the code level.

The final controlled experiment gave a completely different answer: the cause was in `eventSettingsTable`, and it had nothing to do with the trigger. Changing that one cell reproduces it reliably, with the trigger untouched.

**When you're missing a layer of observation, inference fills the hole — and written down, inference looks exactly like an observation.**

---

## The decisive experiment

I rebuilt the live container locally and ran it with exactly one variable: the value in that one `eventSettingsTable` cell. Each variant ran two page loads (GA4 requests were intercepted and returned 204 locally, so nothing hit the real property):

| Variant | Config content | Load 1 | Load 2 |
|---|---|---|---|
| `fixed` | none (the fixed live config) | 1 PV, `sid` / `sct` normal | 1 PV |
| `orig` | macro value (the broken config) | 1 PV, `sid` missing | 0 PV |
| `sid_only` | override `session_id` only | 1 PV, `sid` missing, `sct=1` | 0 PV |
| `num_only` | override `session_number` only | 1 PV, `sid` normal, `sct` missing | 0 PV |

Three readings.

**Overriding either key alone is enough to reproduce it.** This isn't two values fighting each other — any single one written from outside is fatal.

**Load 1 still sends; load 2 stops entirely.** That one-load delay is the deepest trap in this case, and it gets its own section below.

**The `sid_only` row is the most direct evidence of external writing.** It produced a combination GA4 cannot generate natively: `sid` gone while `sct` remains. The client writes those two fields as a pair, so a half-override can only come from the config layer overwriting one field.

---

## Root cause

**In the GTM container, tag 6's — the Google tag's — event settings table writes `session_id` and `session_number` into GA4's own session slots.**

Those two names look like custom parameters. They aren't. `sid` (session id) and `sct` (session number) in a GA4 request are the same two fields; an internal mapping table on the client maps those keys straight onto request parameters.

So writing `session_id` into the config layer isn't "adding a custom parameter." It's **writing into GA4's own session slots.**

### This trap only became easy to fall into recently

`session_id` and `session_number` as GA4 fields, and the rule that config-layer values take priority over built-in ones, are both old. The gtag field precedence (global `set` < config < event parameters) is described in the official docs as **established**, predating that update. Pulling the current gtag.js from the live site confirms both names sit in the reserved field-name table and the field-mapping table.

**What changed is the cost of getting those two values.**

Before 2025-12-11, GTM had no out-of-the-box variable for reading GA's session ID. The only route was a non-official one: Custom JavaScript parsing the `_ga_<ID>` cookie (from 2025-08-01 there was also a `readAnalyticsStorage` sandbox API for custom templates, but that means writing a template, so it doesn't count as out-of-the-box). That route was fragile in its own right — as 2025-05-06 showed, when GA4 switched the cookie format from `GS1` to `GS2` and a batch of position-based parsers broke silently.

On 2025-12-11, GTM shipped three built-in variables (`Analytics Client ID`, `Analytics Session ID`, `Analytics Session Number`) and a new variable type, `Analytics Storage`, positioned as a way for GTM to read GA identifiers for CRM stitching, offline conversion, and server-side integration. **It reads.**

So the shape of the path changed:

| | Before 2025-12-11 | After |
|---|---|---|
| Getting the session ID | Custom JS parsing a cookie (fragile; a format change breaks it) | pick a variable from a dropdown |
| Writing it back into the config layer | required hand-written code; few people got that far | **also just a dropdown** |

**The risk didn't change. The cost of making the mistake did.** The read side was made stable and cheap. Whether the value belongs in a config slot has no guardrail at all.

---

## Why this config breaks it

### The mechanism chain

**Step one: config wins.**

Processing each event, the client calls `copyToHitData(key, fallback)`:

```js
copyToHitData = function (key, fallback) {
  var d = readFromConfig(key);        // if the config has a value, use it
  d === undefined && (d = fallback);  // otherwise fall back to what the client computed
  d !== undefined && writeIntoHit(d);
};
```

**Whatever sits in the config layer overwrites the session state the client computed for itself.**

**Step two: only the first event of each load.**

```js
this.po(ER(a, this.clientId));
this.la = !0;                                     // ← set once the first event is handled
...
FR(a, this.clientId, this.wb, this.J, !this.la);  // ← 5th argument = !this.la
```

`FR` only calls `copyToHitData` when that fifth argument is true — that is, before any event has been handled.

That explains the scene that kept repeating: same config, same load, `page_view` dropped while the `scroll` immediately after sends fine, with `sid` and `sct` both normal. The difference is only position in the sequence. The most counter-intuitive observation at the top of this post has its answer here.

**Step three: a failed check drops the whole hit.**

```js
ER = function (a, b) {
  var c;
  a: {
    if (!T(a, J.H.lg)) {
      var d = mQ(a);                     // 1. assemble a session string from the hit's session_id / session_number
      if (d) {
        if (kQ(d, a)) { c = d; break a } // 2. validate
        S(25);                           // 3. failure: record internal error code 25
        a.isAborted = !0;                // 4. void the whole hit
        V(a, J.H.ib, !0)
      }
    }
    c = void 0
  }
};
```

**`isAborted` happens at the "should this be sent" decision point, not during sending.**

That's why it leaves no console error, no Network entry, and a Tag Assistant that reports everything fine. Those tools all observe what happens after. This is also the answer to the third thing that didn't add up at the top.

> **Source note:** these snippets come from the publicly downloadable GA4 client JS (any page with GA4 on it will serve it; it's minified and obfuscated). Variable names can differ between builds, but tokens like `isAborted` and error code `25` are stable enough to compare against.

### Why only that macro is fatal

This isn't "any value will blow up":

| Value written into the config layer | Result |
|---|---|
| Constant `""` (empty string) | PV sends; `sid` / `sct` missing from then on |
| Constant `"1790098290"` (a real value, but from another session) | PV sends; `sid=1790098290 sct=2`, and it even got written into the session cookie |
| Numeric `1790098290` / `2` | same, sends |
| A Data Layer variable that doesn't exist (`undefined`) | no effect at all |
| `{{Analytics Storage → Session ID}}` macro | load 1 loses fields, load 2 loses the hit |

**Constants are all harmless. Only the macro is fatal.**

Because that macro doesn't return a session ID in the first place.

`Analytics Storage`'s return value depends on a setting that's very easy to overlook: whether a Measurement ID is filled in. Here's the template implementation pulled from the container, decompressed:

```js
g = function () {                              // used for session_id
  if (a.measurementId) {                       // 1. a Measurement ID is set
    forEach(sessions, function (i) {
      if (i.measurement_id == a.measurementId)
        return makeString(i.session_id);       //    → returns the bare value
    });
    return "";
  }

  // 2. no Measurement ID
  i = sessions.map(function (j) {
    return j.measurement_id + ":" + j.session_id;
  });
  return i.length > 0 ? ("ASV1" + "." + i.join(",")) : "";
};
```

| Data Field | Measurement ID set | **Left empty** |
|---|---|---|
| `Client ID` | — | bare value |
| `Session ID` | bare session id | **`ASV1.<measurement_id>:<session_id>`** |
| `Session Number` | bare number | **`ASV1.<measurement_id>:<session_number>`** |

**Left empty, it returns a prefixed, colon-separated compound string** — something like `ASV1.G-XXXXXXX:1790064344`, comma-joined when several GA properties are present.

**That isn't a session id. It's an encoded string.** Writing it into GA4's session slot produces a session string that cannot pass validation.

The compound-value behavior has independent third-party corroboration (ayudante.jp, 2025-12-22 — eleven days after the variable shipped):

> When multiple Web Streams (multiple Measurement IDs) exist on a page, **the variable outputs all corresponding values, separated by commas**.
> These variables simply read from the browser cookie and pass the value through. So **for a first-time visitor — no cookie yet — the variable returns empty**, and only gets a value after a later event fires.

**Those two behaviors are exactly this case's pressure points:**

- Multiple properties → comma-joined compound value → even less likely to be a legal `session_id`
- Empty on first visit → maps directly onto "load 1 sends, load 2 doesn't"

**So the failure isn't a wrong value. It's a wrong type.** A constant can be as wrong as you like and still be well-formed. The macro's string can look almost right and still be malformed.

That also explains every row above: `""` isn't fatal because it's the same value the macro returns with no cookie; the real value and the numeric ones aren't fatal because they're well-formed; only the macro is fatal because only it returns an `ASV1.` compound; load 1 can send because no session cookie exists yet; load 2 can't because now it does.

### The "first load" trap

This is the most expensive lesson in the case. Two separate judgments tripped over it.

Clear the cookie, load the page once: `page_view` comes back (that's load 1, the macro returns an empty string, nothing is fatal). It looks fixed. Load it again and it's gone.

The Astro "it works now" was probably the same thing — a single observation landing inside that window.

**You can only see through this by loading twice.** Stop after one navigation and you'll very likely pin the root cause on whatever intermediate thing you touched, because deleting it really did fix things for one load.

---

## The fix, and what implementers should take from it

| Priority | Action | Why |
|---|---|---|
| **1** | **Delete `session_id` / `session_number` from the Google tag's config layer** (in the event settings table, `eventSettingsTable` — not the config settings table) | This is the root cause. Those fields are read handles, not write targets |
| 2 | Don't route session identifiers through the GA4 tag at all | CRM needs them → use a **form hidden field** (GTM fills it; it travels with the submission). Server-side or offline conversion needs them → **read them server-side**. Two separate pipelines; don't borrow GA4's request |
| 3 | Remove the leftover `History Changes` trigger on a static site | No SPA routes, so it has nothing to do. A hygiene issue, unrelated to this bug |
| 4 | If the container already has this macro and you can't remove it yet, fill in a Measurement ID | Returns the bare value instead of the compound string. **Risk reduction, not a fix** |

The second row deserves more than a table cell, because it's the easiest place to go wrong.

**Renaming the parameter and stuffing it back in is a workaround, not a fix.** A name like `ga4_session_id` won't collide with a reserved field, but you're still borrowing GA4's request to carry data that isn't GA4's. Session identifiers belong to whichever system consumes them:

| Who needs it | How to give it to them |
|---|---|
| CRM | A form hidden field (GTM fills the value; it travels with the submission) |
| Server-side / offline conversion | Read it server-side; don't assemble it client-side with GTM |
| A GA4 custom dimension in reports | Use a custom parameter name, and avoid the reserved field names |

One technical note while we're here: gtag's field precedence is global `set` < config < event parameters, with event parameters highest — the official docs state that outright.

**Whether an event parameter holding `session_id` follows the same override path as the config layer, I never verified.** So this post doesn't conclude anything about it. Its position is separate and simpler: if a pipeline that fits already exists, there's no reason to borrow GA4's request.

And a deeper reason: **config-layer values are frozen.** Values in the config layer are evaluated at the moment the tag fires and then hold — they don't get recomputed for later events on the same page. That's the other face of `copyToHitData` (config wins) from the mechanism chain above.

Putting a session identifier — something that should be recomputed on every load — into a layer that freezes at first fire is incoherent by construction. You're taking the stale session saved from a previous load and overwriting the session state the client just computed.

After the fix, I ran 80 page loads as a regression. Every `page_view` came through.

### Self-check

When "GA4 has no data but the tag says it fired," work in this order:

| Step | What to check | The tell |
|---|---|---|
| 1 | Whether `/g/collect` appears in the Network panel at all | Nothing at all → the request was never generated; don't waste time on blocking |
| 2 | `performance.getEntriesByType('resource').filter(r => r.name.includes('/g/collect'))` | DevTools can lie; this API doesn't |
| 3 | **The container's config layer:** does the Google tag's config or event settings table contain `session_id` or `session_number`? | If yes, you're essentially done |
| 4 | Where those values come from — a macro like `{{Analytics Storage → …}}`? | Yes → that's the suspect; see fix #1 |
| 5 | **Load the page twice** | Normal the first time, broken the second → this case's signature |

**Steps 1 and 3 are the critical ones.** Nearly every public debugging checklist assumes the request was generated — check extensions, check consent, check the CDN, wait 24–48 hours. This failure ended before sending, so those checklists can't reach it.

---

## Appendix: reproduction material

The full reproduction package comes in four parts:

| Category | Contents |
|---|---|
| reproducible test | The script that rebuilds the live container locally, changes one `eventSettingsTable` cell, and runs 9 variants × 2 loads (GA4 requests intercepted and returned 204 locally; nothing hits the real property) |
| probe / instrumentation | Page-side diagnostics: hooks on the four send channels (`fetch`, `sendBeacon`, `XHR`, `new Image()`) recording whether a send was ever attempted, plus snapshots of `dataLayer`, cookies, consent, and lifecycle state |
| GTM export / patch / reproduction code | The relevant container export fragments and the event-table patch tool. One pitfall: **list values in GTM container JSON must carry the `"list"` marker** — omit it and the container won't load at all |
| raw experiment results | Per-load PV counts, `sid` / `sct`, full session cookie text, and the raw JSON from container-load diagnostics |

---

## Summary

Symptoms: GA4 not collecting `page_view`, other events normal, reproducing only in a long-lived browser profile.

Root cause: the Google tag's event settings table in GTM writes `session_id` / `session_number` into GA4's own session slots.

Mechanism: config overrides → affects the first event only → session string fails validation → `isAborted` → aborted before sending.

Why only the macro is fatal: with the Measurement ID left empty, `Analytics Storage` returns an `ASV1.` compound string, which is malformed.

Why only that profile reproduced it: the macro's return value depends on whether that environment has a session cookie.

Fix: delete those two fields from the config layer.

Going back to the three things at the top that didn't add up — a single root cause accounts for all of them:

| What didn't add up | Explanation |
|---|---|
| Other events fine, only `page_view` gone | Only the first event of each load is subject to the config override |
| A different window works | Whether the macro returns anything depends on whether that environment has a session cookie |
| Every tool reports normal | `isAborted` happens at the "should this be sent" decision point, not during sending |

Seven days, six directions: hosting → rendering → browser → prerender → state → container config. All six dead ends, until the closing experiments.

**And the answer had been written into the notes on day four**, where it was read as "the common practice for stitching sessions server-side" and moved past.

The reason I gave myself at the time was that the same container ran in every environment, so the container couldn't be the source of an environment difference.

**But when a bug shows up as an environment difference, config and environment aren't mutually exclusive candidates. They're very likely the interaction between them.**
