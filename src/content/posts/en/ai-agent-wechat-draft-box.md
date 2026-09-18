---
title: "AI Agent WeChat Automation: It Got It Wrong Three Times"
description: "Can a personal WeChat account use the official API? A post-mortem: draft endpoints pass, freepublish is permanently blocked — plus 5 pitfalls and an error-code table."
pubDate: 2026-09-17
tags: ["Martech", "AI Agent", "WeChat API", "Automation", "Post-mortem"]
keywords: ["WeChat Official Account API", "AI agent automation", "content pipeline automation", "draft/add API", "WeChat API error codes", "45003"]
---
My WeChat Official Account has exactly one article, and I hadn't logged in for months. I wanted to find out whether writing could be made less laborious.

What actually blocked me wasn't the tech. It was three sources of information that disagreed with each other.

| Source | What it says |
|---|---|
| Official docs, `draft/add` | Scope table: Official Account ✔, Service Account ✔ — **no "verified accounts only" marking** |
| Community test reports | Unverified personal subscription accounts calling this endpoint get 48001 — no permission |
| Tutorials and tool docs | "A verified account (personal or business) is required" |

Three sources. Two opposite conclusions. Arguing gets you nowhere; the only reliable move is to call the API with your own account and read the return code.

So here are the conclusions first.

- **The draft pipeline works.** Exchange an access_token, upload permanent media, create a draft — all three endpoints passed in testing.
- **The publish pipeline is dead on arrival.** `freepublish/submit` is explicitly marked "verified accounts only" in the official docs. Personal accounts can never get it.
- **What you actually gain:** formatting, image handling, cover generation, and getting into the draft box all become automatic. Clicking publish at the end is still on you.
- **Five pitfalls along the way**, three of which fall into the "the docs aren't wrong, but following them will break you" category — and one where the **docs are simply wrong**.

If you also run a personal subscription account and just want to reclaim the hour you lose to formatting, this path works.

---

## 1. Choosing a route: three options, cost them out first

Before writing any code, there were three routes.

| Route | Barrier | How far it gets you | Cost |
|---|---|---|---|
| Direct API | Business entity verification (publish step only) | Draft → publish, fully automated | Official API, compliant, maintainable long-term |
| Browser session automation | None | Draft only | Reusing your login session to call backend endpoints directly. Violates platform terms. Account-ban risk. |
| Manual paste | None | AI formats the HTML, you paste it | No risk, but the last step is always manual |

The third is the fallback — you can retreat to it at any time. The second I ruled out immediately: risking an account to save ten minutes is a bad trade.

So the only thing worth validating was the first.

---

## 2. The counterintuitive conclusion: it's **verification**, not **identity**, that blocks you

The claim "personal accounts have no permissions, full stop" is widespread in Chinese developer communities. I eventually traced where it came from: **in July 2025, WeChat revoked `freepublish` publish permissions for personal-entity accounts.**

That single policy got flattened by a hundred tutorials into "personal accounts have no API permissions."

Only the publish pipeline was revoked. The draft pipeline was never taken away.

The official evidence is buried in a footnote of the migration guide that almost nobody quotes. The original text splits two thresholds into **separate rows**:

| Account type | Prompt when incomplete | How to resolve |
|---|---|---|
| Personal entity | "This account has not completed **real-name verification**" | Admin completes real-name verification (under Settings & Development → Personnel → Admin info) |
| Non-personal entity | "This account has not completed **entity verification**" | Apply for WeChat business verification |

**That is the crux: what blocks you is verification, not real-name registration.**

A personal subscription account cannot complete business-entity WeChat verification — so the publish endpoint is permanently closed. But admin real-name registration is entirely achievable — so the draft pipeline opens.

The official scope tables confirm the split:

| Endpoint | Official Account | Service Account |
|---|---|---|
| `draft/add` — create draft | ✔ | ✔ |
| `material/add_material` — upload permanent media | ✔ | ✔ |
| `media/uploadimg` — upload inline body images | ✔ | ✔ |
| `freepublish/submit` — publish a draft | **Verified only** ✔ | ✔ |

The first three carry no "verified only" restriction. The fourth does.

So the goal of this test was narrow: forget publishing. Just confirm the draft box can be written to.

---

## 3. Setup: the entrance moved, and the AI got this wrong the first time

Calling the API requires an AppID, an AppSecret, and your calling IP added to a whitelist.

My AI assistant stated, with confidence: "The IP whitelist is configured in the Official Account platform backend. You don't need the developer platform."

That was wrong.

**As of December 1, 2025, WeChat moved the entire "Development Interface Management" module out of the Official Account platform and into the WeChat Developer Platform.** The old path (Settings & Development → Development Interface Management) no longer exists — and most tutorials online still describe the old one, so following them leads to a dead end.

Three sites get confused constantly:

| Site | Domain | What it's for |
|---|---|---|
| WeChat Official Account Platform | mp.weixin.qq.com | Writing articles, analytics, account settings |
| WeChat Developer Platform | developers.weixin.qq.com/platform/ | AppID, AppSecret, IP whitelist |
| WeChat Open Platform | open.weixin.qq.com | WeChat login for apps and websites — unrelated to Official Account APIs |

The correct path: **WeChat Developer Platform → My Business → select your Official Account → Basic Info → Developer Keys.** AppID, AppSecret, and the API IP whitelist all live on that one page.

### Three details about the IP whitelist

1. **Order matters.** If you can't find the whitelist editor, it's because AppSecret hasn't been activated. You must enable or reset AppSecret first — only then does the whitelist button appear.
2. **Format is restricted.** Plain public IPs only. CIDR ranges (`1.2.3.4/24`) fail. For multiple entries, separate with newlines — not commas, not semicolons.
3. **It doesn't take effect immediately.** Saving requires an admin QR scan, followed by a 5–10 minute wait. Test right after saving and it *will* fail — the single easiest way to convince yourself you configured it wrong.

Every whitelist edit also requires an admin QR scan, so keep your phone nearby. And AppSecret is displayed exactly once; resetting invalidates the old one immediately. Save it on the spot.

---

## 4. The actual test: six calls, three failures

With setup done, I called the endpoints in sequence. It did not go smoothly.

| # | Call | Result |
|---|---|---|
| 1 | Exchange access_token | ❌ 40164 — IP not in whitelist |
| 2 | Exchange access_token | ✅ Success (after the whitelist took effect) |
| 3 | Upload cover material | ✅ Success, got a media_id |
| 4 | Create draft | ❌ 40007 invalid media_id |
| 5 | Create draft (params changed) | ❌ 40007 again |
| 6 | Create draft (changed again) | ✅ Success |

### First failure: 40164, the whitelist

The raw error is interesting:

```
invalid ip 114.240.xxx.xxx ipv6 ::ffff:114.240.xxx.xxx, not in whitelist
```

It echoes **two** IPs: a plain IPv4 address and a `::ffff:`-prefixed mapped form. That's WeChat's dual-stack backend showing through. Normally the IPv4 entry is enough — but if you add it and still get errors, add the mapped form too. Accounts that only accept the latter do exist.

**A useful side effect: the IP echoed in the error is the source IP WeChat's servers actually see. That's more trustworthy than anything you can detect locally — use it directly when filling the whitelist.**

### Second failure: 40007, the cover is mandatory

Once the whitelist cleared, the access_token came back fine. I assumed the rest would be smooth sailing. Then I hit the draft endpoint.

First attempt: 40007 invalid media_id. I had passed an empty `thumb_media_id`.

Fix attempt one: remove the field entirely.

Second attempt: still 40007.

Only then did it land: **the cover image is not optional.** An empty string fails. Omitting the field fails.

So I added a step: generate a 900×383 test image locally (WeChat's recommended cover ratio), upload it to the permanent media library for a media_id, then pass that as the cover when creating the draft.

Third attempt: success.

---

## 5. Five pitfalls, all learned the hard way

The first four share one trait: **the docs either don't say it, or say it in a way that's easy to misread.** The fifth is different — **the docs are simply wrong.**

### Pitfall 1: WeChat returns no errcode on success

This one is nasty. A successful media upload returns:

```json
{"media_id":"...", "url":"http://mmbiz.qpic.cn/..."}
```

**No `errcode` field.**

My script originally checked `if (errcode === 0)` to detect success. So it classified a perfectly good response as a failure, the media_id never propagated downstream, and I burned two extra rounds for nothing.

```js
// ❌ Success responses have no errcode — this condition never fires
if (res.errcode === 0) { /* got media_id */ }

// ✅ Test for the result field itself
if (res.media_id) { /* upload succeeded */ }
if (res.access_token) { /* token acquired */ }
```

### Pitfall 2: The cover is required, but the docs list it as "optional"

This is the nastiest one to actually hit. In the official `draft/add` parameter table, `thumb_media_id` is marked **"no"** in the required column. But the field description reads:

> Required when `article_type` is `news` — the cover image media ID (must be a permanent MediaID)

**The real requirement lives in the description, not the required column.** Read only the table and you will get burned.

Correct sequence: call `material/add_material?type=image` to upload the cover and get a media_id, then create the draft with it. The order cannot be reversed.

### Pitfall 3: Node's built-in FormData fails against WeChat

Media upload is a multipart request. Submit it with Node's built-in FormData and WeChat's response won't parse as JSON.

The fix is to build the multipart body by hand — define your own boundary, manually assemble the Content-Disposition and Content-Type headers, then append the binary payload and the closing delimiter.

```js
const boundary = '----WeChatBoundary' + Date.now().toString(16);

const head =
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="media"; filename="cover.jpg"\r\n` +
  `Content-Type: image/jpeg\r\n\r\n`;
const tail = `\r\n--${boundary}--\r\n`;

const body = Buffer.concat([
  Buffer.from(head, 'utf8'),
  fs.readFileSync('./cover.jpg'),
  Buffer.from(tail, 'utf8'),
]);

await fetch(
  `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`,
  {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  }
);
```

Three things that are easy to get wrong: the delimiter must be `\r\n`, not `\n`; the closing boundary needs its trailing `--boundary--`; and the field name must be `media`.

Once swapped in, it worked first try.

### Pitfall 4: 40164 echoes two IP formats

Covered above — watch for both the IPv4 form and the `::ffff:` mapped form. This small detail cuts debugging time from half an hour to two minutes.

### Pitfall 5: The title and digest length limits — both the official docs and the third-party guides are wrong

I found this one only through a dedicated follow-up test, after the pipeline was already working. The first four pitfalls involve docs that don't say enough. This one is a **doc that says it wrong**.

The official `draft/add` docs state that `title` is capped at 32 characters and `digest` at 128. Third-party guides commonly say "title ≤ 64 bytes, digest ≤ 120 bytes."

**Both are wrong in testing — but wrong in different ways.**

The real rule is a **weighted length**: Chinese characters count as 2, ASCII characters count as 1. In other words, the **GBK byte count**.

| Field | Weighted cap | Equivalent Chinese chars | Equivalent pure-ASCII chars |
|---|---|---|---|
| `title` | 128 | 64 | 128 |
| `digest` | 240 | 120 | 240 |

Twelve data points cross-validated, all consistent. Two boundary cases:

- A title of 63 Chinese characters + 2 letters (= 128) succeeds; one more character (= 129) returns 45003
- A pure-ASCII title of 128 characters succeeds; 129 fails

**How each set of numbers is wrong:**

- **"64 / 120 bytes" — right numbers, wrong unit.** 64 is the count of Chinese *characters*, not bytes. Sixty-four Chinese characters actually consume 128 weighted units — off by a factor of two. Someone almost certainly measured the boundary in Chinese, got 64, and said "bytes."
- **The official "32 / 128 characters" — matches nothing.** Interestingly, 128 does turn up — but it's `title`'s **weighted cap**, unrelated to `digest`'s character count.

**The debugging method — this is the part that matters: one character class cannot separate the rules.**

Sixty-four Chinese characters happen to equal exactly 192 UTF-8 bytes. Test only in Chinese, and "64 characters" and "192 bytes" produce **identical** output — you can never tell them apart. You must add a **pure-ASCII control**: 128 ASCII characters succeeding and 129 failing is what reveals the 2:1 weighting.

The same logic applies to pass/fail judgments: 25 characters succeeds under *both* rule sets, so its failure would only eliminate the "64 bytes" hypothesis — it cannot prove that "32 characters" is right.

**The same page carries one more limit that doesn't hold.** The docs also say `content` "must be under 20,000 characters." In testing, a **54,809-character** body — 10 tables, 286 styled tags — went into the draft box in a single call: accepted, byte-for-byte identical on read-back, nothing truncated.

**Same pattern as the title cap: the documentation is stricter than the runtime.** Treat it as law and you give away half your budget for nothing — and on the body, the amount you give away is far larger.

**Action:** compute weighted length for titles and digests — Chinese 2, ASCII 1. Keep `title` under 128 and `digest` under 240. **And stop capping at the documented "32 characters" — that wastes half your available budget.**

---

## 6. Where the AI got it wrong — three times

In review, my AI assistant was wrong three times, and the three failures had different causes.

| Its judgment | Reality | Root cause |
|---|---|---|
| IP whitelist lives in the Official Account backend, not the developer platform | Migrated to the Developer Platform on 2025-12-01 | Platform rules changed; its knowledge didn't |
| A personal subscription account will probably hit 48001 — don't get your hopes up | All three endpoints passed in testing | It treated community lore as fact |
| Just omit the draft's cover field | The cover is mandatory | Misreading of parameter semantics |

These map onto three systemic weaknesses — and each has a corresponding action:

**The first is a knowledge-freshness problem.** Platform rules change; training data has a cutoff. Any question of the form "where do I find X" can return a stale path. **Action: verify backend entry paths against official docs every time.**

**The second is source contamination.** The "personal accounts have no permissions" claim is everywhere, but it's period-specific experience (publish permissions were revoked), not a platform rule. **Action: treat AI conclusions as hypotheses, not facts. When sources conflict, test.**

**The third is documentation misreading.** The official docs marked a field as non-required, but the runtime enforces it. Docs and runtime behavior diverge. **Action: let the error code lead, then trace back to the docs.**

The conclusion: **AI dramatically accelerates this work** — it wrote the scripts, interpreted the errors, and located the pitfalls. But anything involving "the platform's current state" must be validated against a real account. No secondhand conclusion qualifies, including the AI's.

---

## 7. What the final pipeline can do

| Capability | Status |
|---|---|
| Get an access_token | ✅ |
| Upload a cover to the permanent media library | ✅ |
| Upload inline body images | ✅ |
| Write to the draft box | ✅ |
| Auto-format (Markdown → WeChat-compatible HTML) | ✅ |
| One-click publish | ❌ Official docs restrict it to verified business entities; permanently unavailable to personal accounts |

So the final workflow is:

```
Content → auto-format → auto-image → auto-upload → into the draft box → [human review + click publish]
```

What gets removed is the pure manual labor — formatting, images, uploads (conservatively, half an hour to an hour per article). What stays is exactly the part that should stay human: **is this worth publishing, is the headline sharp enough, does the argument hold up.**

That division of labor seems right to me.

---

## 8. Four lessons for content operations

**1. A platform API's "current state" must be tested. Official docs are a lead, not a verdict.**

- Evidence: three sources produced two opposite conclusions; docs and runtime diverged (`thumb_media_id` contradiction); the docs entry path itself moved once during 2025; and the `title` / `digest` caps are **documented incorrectly**, off by a factor of two.
- Action: for any claim about permissions, paths, or limits, run one minimal test before committing to automation.

**2. An AI agent's value is accelerating execution and interpreting errors — not judging platform rules.**

- Evidence: all three misjudgments landed in the "platform current state" category. Scripting, error interpretation, and pitfall localization it did quickly and accurately.
- Action: use AI in the execution layer (scripting, error parsing, formatting). Keep the judgment layer for yourself or for a live test.

**3. Your validation design becomes a new source of error.**

- Evidence: testing length limits with Chinese characters only — "64 characters" and "192 bytes" produce identical output, so no test point, however precisely chosen, can separate them. And "the test passed" got read as "hypothesis A holds," when it had actually only eliminated hypothesis B.
- Action: before designing a test, ask — **will my inputs make the candidate rules produce different outputs?** If not, the result is not evidence.

**4. Draw the automation boundary before the judgment nodes.**

- Evidence: the draft pipeline can be fully automated; the publish pipeline cannot. Every node requiring judgment also happens to be where the platform restrictions are tightest.
- Action: map the process into manual labor vs. decision points first. Automate only the former.

---

**A note on this post:** its layout, cover image, and draft upload were handled by an AI agent (WorkBuddy). Only the final publish step was manual — the post you are reading is itself the output of the workflow described above.

---

## Appendix A: Error code reference

| Code | Meaning | Fix |
|---|---|---|
| 40164 | IP not in whitelist (errmsg echoes the real IP) | Add it on the Developer Platform |
| 61004 | No whitelist IP configured | Same as above |
| 40243 | AppSecret frozen | Unfreeze or reset on the Developer Platform |
| 40125 | Invalid AppSecret | Reset |
| 40013 | Invalid AppID | Check for a truncated paste |
| 48001 | API unauthorized | Account type doesn't support the endpoint |
| 40007 | Invalid or missing media_id | Supply the cover material |
| 45003 / 45004 | Title / digest too long (**GBK-weighted**) | `title` ≤ 128 weighted units, `digest` ≤ 240; Chinese counts 2, ASCII counts 1. See Pitfall 5. |

## Appendix B: The full call chain

```
1. GET  /cgi-bin/token?grant_type=client_credential&appid=&secret=
        → access_token (valid 7200s, cache and reuse it)

2. POST /cgi-bin/material/add_material?access_token=&type=image
        Content-Type: multipart/form-data, field name: media
        → cover material media_id

3. POST /cgi-bin/draft/add?access_token=
        {"articles":[{"title":"...","content":"<html>","thumb_media_id":"..."}]}
        → draft media_id
```

Inline body images take a separate route: `/cgi-bin/media/uploadimg`, which returns a URL rather than a media_id.

Two things to note: `draft/add` must be called server-side — never directly from a frontend (mini-program, web page, or app). And drafts are removed from the draft box once mass-sent or published. **The draft box is a pre-publish state, not long-term storage** — keep your own records.

## Appendix C: WeChat article formatting — the hard compatibility rules

Useful when pushing drafts. Worth writing down:

- **`table` is the only reliable structure.** Use `<table>` + `<tr>` + `<td>` as the skeleton, apply styles to `<td>`, put content in `<p>`. Think HTML email.
- **Supported styles:** `color`, `background-color`, `font-size`, `font-weight`, `padding`, `margin`, `border`, `text-align`, `line-height`
- **Unsupported styles:** `border-radius`, `position`, `linear-gradient`, pseudo-elements. WeChat's editor doesn't recognize them and the layout breaks.
- **Title / digest length:** GBK-weighted (Chinese 2, ASCII 1) — `title` ≤ 128, `digest` ≤ 240. See Pitfall 5.
- **Body limits:** the docs state "under 20,000 characters, under 1MB," and JavaScript is stripped. **In testing a 54,809-character body went through in one call — the character cap did not apply** (see Pitfall 5).
- **Body image sources:** must come from the dedicated "upload image for article body" endpoint. External image URLs get filtered out.
