---
title: "Every Other GA4 Event Works, Only page_view Goes Missing"
description: "GA4 lost one single event — page_view — while every other event kept reporting normally, and only in one browser profile. No code in this post: just the symptoms, the logic, and the conclusion, written for marketers and analysts who don't work in front-end code."
pubDate: 2026-09-23
tags: ["GA4", "GTM", "Tracking", "Post-mortem"]
keywords: ["GA4 page_view missing", "GA4 one event not tracking", "GA4 other events work but page_view not", "GTM config error", "GA4 tracking without code", "GA4 hit never sent"]
---

> One specific bug — no code, only the symptoms, the logic, and the conclusion.

---

## What this post is about

Here is the failure I'm writing about, and it's easy to recognise: **GA4 stopped collecting page views (`page_view`) while every other event kept reporting normally.**

This is not a general "GA4 has no data, here's how to fix it" guide. Those are everywhere, and most of their assumptions don't match what happened here.

None of these are this post either: no data at all, data missing across many events, data that turns up a day late.

If you're not sure which one you have, check one thing first. Are the other events — scroll, click, form submit — still coming in? If they are, and page views specifically aren't, this might be the post you were looking for.

---

## The conclusion, up front

**GA4 didn't fail to receive the data. One record was never sent in the first place.**

The cause was inside the GTM container. I had added a settings table to the Google tag, with two rows in it: `session_id` and `session_number`.

Those two names look like ordinary parameter names. They aren't. **They're the names GA4 itself uses to label a session.** Filling them in rewrites the session information GA4 worked out on its own. Once that value was overwritten, the record failed a validity check and was thrown away whole.

The worst part: **the throwaway happens at the "should this be sent" step, not during sending.** That's why no tool can see it.

---

## One: the data never arrived, and every tool said everything was fine

Here's what the broken page looked like:

| Where you'd go to check | What you saw |
|---|---|
| GTM Preview / Tag Assistant | The tag fired normally |
| Browser console | No errors |
| The page's data queue | Writing normally |
| The Network panel, filtered for the request to GA4 | Not one entry |
| GA4 Realtime | Nothing |

**I checked everything, every tool reported a healthy signal, and the data still didn't arrive.**

Three more things didn't add up.

First, on the same container and the same page load, page views disappeared while other events (scroll, for instance) all still went out.

Second, on the same machine and the same container, switching to an incognito window made it work.

Third, every tool said everything was fine.

The first one was the strangest. The same tracking setup, the same page load, one event unable to leave and another leaving without trouble. **That fact became the ruler I measured every guess against** — if a theory couldn't explain it, I didn't accept it.

---

## Two: what I checked that week

Looking back, this ran across seven days. Everything I checked is in the table below. Every one of them had a good reason to be a suspect, and every one of them was wrong.

| Where I looked | How it got ruled out |
|---|---|
| The server and hosting (Cloudflare) | Moved the whole site to a different host — identical problem |
| The page code | Rolled the code back three weeks — same behaviour |
| Browser extensions | Disabled every extension — no change. Guest mode, which loads none, behaved the same |
| The browser's page-preloading feature | Ran a control experiment; its failure signature doesn't match this symptom |
| Privacy consent settings | Identical field by field across both environments, and it wasn't gating anything anyway |
| The GTM container configuration | **This one** |

Two of those deserve their own paragraph, because they misled me more than once.

On extensions: the idea came up twice, and **both times it was the AI assistant's suggestion, not mine**. I hadn't considered them — an ad blocker would block my own tracking, so I'm never going to run one. But it raised them, and ruling them out was cheap.

One of those two times it also accused the wrong thing: it listed extensions that lived in a browser profile I had abandoned more than two years earlier, so of course I couldn't find them in my own browser. The lesson is blunt. **Having the ability to cause something and having caused it are two different questions.**

On preloading: that feature genuinely can stop page views from being sent, so at first it looked like a strong match. But in the control experiment, once it kicks in it suppresses scroll events as well. This bug's signature is scroll working normally with only page views missing. **The signatures don't match, so it wasn't the cause.**

---

## Three: the answer turned up early, and I walked past it

The trail ended in the GTM container, in the Google tag's event settings.

That settings table had two rows. One used `session_id` as the name, with a value coming from a "read the session ID" variable. The other used `session_number`, reading "which visit this is".

I added it because I wanted the data GA4 received to carry one more piece of information. Working from an old tutorial, I saw a variable in the dropdown called "Analytics Session ID", the name lined up, and I picked it.

It was wrong, and wrong in a way that's hard to spot.

**That table was sitting in front of me on day four of the investigation.** At the time the AI assistant judged it "a common practice, not a problem", and I agreed — because it really didn't look like a problem. **The answer sat there for three days.**

---

## Four: why it breaks

### Those two names aren't arbitrary

Every record GA4 writes carries a stamp: whose session this is, and which visit number it is. **GA4 normally cuts that stamp itself.**

`session_id` and `session_number` are the two positions on that stamp. Writing into those two positions **means scraping off GA4's stamp and pressing on one of your own**.

### What got written there wasn't an ID

The two values came from a "read the session ID" feature, which GTM only shipped in December 2025. Before that, getting these values meant writing code to dig them out of a cookie, and it was easy to get wrong.

The feature only reads. It pulls existing analytics storage out of the browser for other tags or processes to use.

The problem is that **I took what it read and put it straight back into the Google tag's own session parameters**.

And the read has a quiet behaviour. If you don't tell it which GA4 property to read, it pulls the session number out of every GA4 property in the browser and joins them into one comma-separated string.

So what actually got written in was a long string, not a number like `1790064344`. Exactly what it looks like depends on which properties you have installed, but it is never a plain number: with a single property it's a colon-separated code carrying an `ASV1.` prefix (something like `ASV1.G-XXXXXXX:1790064344`), and with several properties those segments get joined by commas.

**A single number was called for. A sentence was supplied.** The record was voided on the browser side and never left.

**So the real reason it blew up is the wrong type, not the wrong value.**

### Why clearing cookies makes it work once

The feature reads from a cookie.

On the first page load there's no cookie yet, so it reads nothing. **An empty value isn't fatal** — the record goes out, with the session number column blank.

On the second load the cookie exists, and it reads out that long string. **Fatal. The record is gone.**

That explains a symptom that fooled me several times: clear the cookies, open the page, and it works. Refresh, and it's gone again.

The same trick also produced two "I changed the code and it's fixed" conclusions. More on that below.

### Why other events are fine and only page views are gone

**Those two event settings rows only apply to the first record of each page load.**

The first record — the page view — hits it. The events after it don't.

That's where the strangest thing from the top of this post gets its answer: the loss follows one strict rule — **always the first record, and nothing else**.

### Why every tool reports normal

Because it's stopped at the "should this be sent" step and never reaches sending.

The console sees nothing because nothing ever reached the point of erroring. The Network panel sees nothing because the request was never created. Tag Assistant sees nothing because the tag genuinely did fire — it's **the content being sent** that gets discarded.

**Every one of those tools observes what happens after sending. The problem happens before it.** That's how it stayed hidden for a week.

---

## Five: the trap that fooled me three times

This one is worth pulling out on its own, because it isn't specific to tracking.

The symptom fluctuated. Sometimes there was data, sometimes there wasn't.

Three times, that produced a conclusion like this:

| | What I changed | What it looked like |
|---|---|---|
| First time | A few lines of page code | Fixed |
| Second time | One container setting | Fixed |
| Third time | Cleared the browser cookies | Fixed |

**All three times I had simply landed inside that window. None of them had anything to do with the change.**

The rule is simple: **when a symptom moves on its own, "it works now" proves nothing.**

Since then I'm much warier of that phrase. Tracking problems especially, because they're already sensitive to cookies, first visits, caching, and session state — whether the number moves often has nothing to do with what you just changed.

Two things actually count as evidence: can you reproduce it reliably, and can you reproduce the reverse after undoing the change.

---

## Six: how to fix it, and how to recognise it next time

### The fix

First, delete `session_id` and `session_number` from the Google tag's event settings. That's the root cause.

Second, don't send session identifiers out through the GA4 tag.

Whichever system needs the data, use that system's own pipeline. For a CRM, use a form's hidden field — GTM can fill the value in, and it travels with the submission when the user sends the form. For a server-side or offline-conversion use case, read it server-side rather than assembling it in the browser with GTM.

It's fairly obvious once you say it out loud: neither of those has anything to do with GA4. Borrowing GA4's request to carry data that isn't GA4's is using the wrong pipe. Renaming the parameter doesn't change that.

The third item is unrelated to this bug: while you're in there, remove the leftover "History Changes" trigger on a static site. That's hygiene, not a fix.

After the fix I ran 80 consecutive page loads as a regression check. Every page view came through.

### A short list for people who don't work in front-end code

1. If you see `session_id` or `session_number` in the Google tag's event settings table in GTM, get suspicious. Those two aren't parameters you can fill in freely.

2. If you see someone pushing session identifiers into the Google tag so a CRM or a server can use them, that's the wrong pipe. CRM gets a form; the server gets the server.

3. When the data isn't arriving but every tool reports normal, the first thing to establish is whether the request was ever sent. Don't start with extensions, consent settings, or waiting 24 to 48 hours.

### If you have exactly these symptoms

These three steps aren't a general debugging checklist. **They're only for checking whether you have this specific bug.**

| Step | What to do | What confirms it |
|---|---|---|
| 1 | Open your browser's developer tools, go to the Network panel, reload the page, type `collect` in the filter box | Nothing at all |
| 2 | Open GTM, find the Google tag, look at its event settings table | `session_id` and `session_number` are in there |
| 3 | Clear this site's cookies, then load the page twice in a row | Works the first time, gone the second |

**Step 3 is the most distinctive. Testing it once gives you the wrong answer — you have to load it twice.**

---

## Seven: three things actually worth remembering

Getting the config wrong isn't the interesting part. These three points are, and each one generalises well beyond tracking.

| The counter-intuitive point | Where it generalises |
|---|---|
| **"Didn't arrive" and "wasn't sent" are two completely different problems** | For any missing data, work out first whether it was sent and blocked, or never sent at all. The two have opposite debugging directions |
| Every tool reporting normal might just mean they're all watching the same moment, downstream of the problem | A tool being unable to see something doesn't mean it isn't there |
| Two environments behaving differently doesn't mean the environment is the cause | An environment difference in a bug often comes from a *configuration × environment* combination. Treating the two as mutually exclusive options is the most common misreading |

**The third one is the most expensive lesson here.** My own words at the time were:

> The same container runs in every environment, so the container can't be the source of an environment difference.

It sounds airtight. **The truth is exactly the combination.** One configuration, different results in different environments, and it ends up looking like an environment problem.

---

## Appendix: terminology

Same story, different vocabulary.

| This post says | What code and docs call it |
|---|---|
| page view event | `page_view` |
| the request that goes to GA4 | `/g/collect` |
| session ID | `session_id` / `sid` |
| session number | `session_number` / `sct` |
| the settings table in the container | `eventSettingsTable` |
| where that settings table lives | the config layer's **event settings** table / `eventSettingsTable` |
| the "read the session ID" feature | the `Analytics Storage` variable |
| throwing the whole record away | `isAborted` |
