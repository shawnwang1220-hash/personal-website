---
title: "Capturing the GA4 client_id in a form"
summary: "A form that stopped at name and request. I attached the GA4 client_id and session_id to every submission without adding an input, landing them in D1 and Notion."
tags: ["GA4", "GTM", "Tracking", "BigQuery"]
problem: "The form asked for three things: name, email, what they needed. The moment it succeeded, the enquiry was cut loose from the session that produced it. GA4 knew a submission had happened; Notion held a contact; nothing in either place could be matched to the other. Finding out which pages that client had read, or where they came from, meant guessing."
approach: "Two hidden fields, nothing for the visitor to fill in. A page script reads client_id and session_id out of the two first-party cookies GA4 writes (_ga and _ga_ with the measurement ID), re-reads them at submit time, and sends them with the request to my own Worker. Both are optional: if the cookies are absent, they travel empty. The Worker validates the format and writes to D1 and Notion, and the same two values ride along on the dataLayer success event for GTM. GA4 itself was left alone, with no custom dimension registered."
result: "Every submission now carries an identifier that matches a record in the GA4 export, provided the visitor's cookies survived their privacy settings or ad blocker. Form usability is unchanged: ad blockers, no-JS submissions and expired cookies were all tested, and the form still goes through."
learned: "Two things worth remembering. The _ga_ cookie now ships the GS2 format, and a parser written for GS1 leaves session_id silently empty, with no error and nothing in any report, discoverable only by testing. And hidden fields can be edited by anyone, so the server has to validate the format itself. Separately: recording a value and being able to see it in GA4 are two different things, and without a custom dimension only BigQuery can answer."
stack: ["GA4", "GTM", "Cloudflare Workers", "D1", "Notion", "BigQuery"]
date: 2026-10-27
---

## Why no custom dimension

In short: a custom dimension is the handful of columns you decided on in advance, while BigQuery is the raw data.

Registering a user-scoped custom dimension does let you filter by it in Explorations. But what comes back is aggregated, sampled, and limited to the columns you already thought of. The moment the question becomes "how many steps did this person take from the landing page to here, and which posts did they read in between", it is back to BigQuery.

There is also a quota, and custom dimensions cannot be deleted once created, only archived. Get the name or scope wrong and you have effectively burned a slot. This field gets used a few times a year at most, which does not justify one.

The cost is worth stating plainly: **without registration the value is invisible in the GA4 interface**. It is reachable only through the BigQuery export, or by exporting the D1 records and blending them with BigQuery results in Looker Studio.

## Where the values come from

Both are first-party cookies written by GA4 itself, readable from JavaScript with no extra permission:

| Cookie | Shape | Extraction |
| --- | --- | --- |
| `_ga` | `GA1.1.<part one>.<part two>` | join the two parts, that is the client_id |
| `_ga_<measurement ID>` | `GS2.1.s<session>$o<number>$…` | take the digits after `s`, that is the session_id |

The client_id is stable for the life of the cookie. The session_id rotates after 30 minutes of inactivity.

The session number cost me a debugging round. The older format is `GS1.1.<session>…`; the current one is `GS2.1.s<session>$…`, with an extra `s` prefix. A regex written for the old shape never matches, so session_id stays empty, **and nothing anywhere reports it**. All you see is a field that is always blank. The version that handles both:

```js
var m = gs.match(/GS\d\.\d\.s?(\d+)/);
```

## Three cases where it stays empty

The fields are optional because all three of these happen, and none of them should turn into a failed submission:

| Case | What happens |
| --- | --- |
| Ad blocker or privacy extension | `googletagmanager.com` is blocked, GA4 never initialises, the cookies do not exist |
| Submission without JavaScript | Native form post, the script never runs, the hidden fields are empty strings |
| Safari's ITP | First-party cookies also expire after 7 days and get regenerated, so weeks do not line up |

The third is the easy one to miss. It is not "the value is missing", it is "the value is there but belongs to a different person". The same visitor returning two weeks later has a new client_id, and tracing by client_id breaks in the middle.

## The server does not trust the client

Hidden fields are visible and editable, so a single request with a made-up value puts junk into Notion. The Worker therefore validates the shape and blanks anything that does not match:

```js
const CLIENT_ID_RE = /^\d{1,20}\.\d{1,20}$/;
const SESSION_ID_RE = /^\d{1,20}$/;
```

The rule behind it: **this field is a nice-to-have, and its failure must never affect receiving the enquiry itself**. The write to the database happens first; Notion and the email notification each fail independently without rolling back the main record, and the visitor never sees an error because of them.

## How to actually use it

In the GA4 BigQuery export, `user_pseudo_id` is the client_id. Query it directly with the stored value:

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

For session-level detail, filter once more on `ga_session_id` from `event_params`.

## Scope and limits

- **This solves retrospective lookup, not attribution accuracy.** For knowing which channel an enquiry came from, the form submission event already carries full source information in GA4. The only thing client_id adds is the ability to take one specific person and ask what they read.
- **Cross-device is impossible.** The client_id lives in a browser; a phone and a laptop are two different people, with no way to merge them.
- **Coverage is partial.** The three empty cases above add up to more than a rounding error. This pipeline is a sample by construction, not a census.
- **Do not treat it as a user ID.** It is a browser-level pseudonymous identifier: clearing cookies, switching devices or changing browsers all break it, and none of that is under the user's control.
