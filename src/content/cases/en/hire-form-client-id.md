---
title: "From cookie to lead record: the GA4 client_id"
summary: "Capturing the GA4 client_id through a hidden form field, storing it with the lead record, and checking it against the value GA4 reports."
tags: ["GA4", "GTM", "Tracking"]
metric: "0 new fields"
problem: "GA4 records page views and form submissions, while lead records are stored elsewhere. Nothing in the two datasets can be matched to the other, so analysing a lead's behaviour before submission needs a key that exists in both."
approach: "A hidden field carries the client_id into the lead record on submit, while the same value rides along on the form submission event for GA4. The field is optional, left empty when it cannot be read, and validated on the server."
result: "The same client_id is retrievable from both the lead record and the GA4 event data, and the two values agree. Capture, transmission, storage and reporting were each verified."
learned: "Three points: an identifier has to survive the whole chain to count as connected; the same identifier can serve two different pipelines; sending client_id as an event parameter does not make it usable as a dimension in GA4 reports."
stack: ["GA4", "GTM"]
date: 2026-10-27
---

## 1. The problem: linking on-site behaviour to the leads it produces

GA4 records page views, form submissions and other on-site behaviour, but that data is normally stored separately from the lead information submitted through a form. Analysing what a lead did before converting requires an identifier that exists in both datasets.

The GA4 Client ID identifies a browser across visits. Capturing it into the lead record provides a basis for that later analysis. This project set out to answer three questions:

- How is the GA4 Client ID obtained when a visitor submits a form?
- How is it submitted alongside the form and stored with the lead record?
- How is the stored value verified against the Client ID sent to GA4?

## 2. The approach: capture, transmit, store and verify

### 2.1 Reading the Client ID from the browser cookie

JavaScript reads the `_ga` cookie, parses out the GA4 Client ID, and writes it into a hidden form field. The visitor fills in and submits the form as usual, with no additional step.

The `_ga` value takes the form `GA1.1.<part one>.<part two>`; joining the last two segments gives the Client ID.

The field is optional, and three situations leave it empty:

| Situation | Cause |
| --- | --- |
| Ad blocker or privacy extension | `googletagmanager.com` is blocked, GA4 never initialises, the cookie is absent |
| Submission without JavaScript | Native form post, the script never runs, the hidden field is an empty string |
| Safari's ITP | First-party cookies expire after 7 days and are regenerated |

The third case needs separate mention. The cookie is still present, but it now carries a different Client ID. The same visitor returning a week later is a new identifier, and any lookup based on the old one breaks in the middle.

**Format changes and the choice of approach**

The session identifier in the cookie has two formats: `GS1.1.<session>…` and `GS2.1.s<session>$…`, the latter with an additional `s` prefix. Parsing logic written for the first returns an empty value under the second, with no error raised anywhere.

A more robust approach now exists. In December 2025 GTM introduced built-in Client ID, Session ID and Session Number variables, which read GA4's internal state rather than parsing the cookie, and are therefore unaffected by format changes.

The container in this project does not have those built-in variables enabled, and using them to populate a form field requires an additional tag whose execution may land after the visitor has already submitted. Reading the cookie directly was chosen instead. This is a trade-off in approach, not a difference in difficulty.

### 2.2 Storing the Client ID with the lead record

On submission the form data is sent to the backend, processed and stored, with the Client ID written alongside the other fields. Inspecting an actual record confirms the value travelled from the browser into storage, rather than stopping at the page.

Hidden fields are visible and editable, so the backend validates the format: values matching the Client ID shape are kept, everything else is treated as empty. The premise behind that check is that this field exists to support analysis, and its failure must not affect receiving the lead. The write happens first; downstream steps fail independently without rolling back the main record or surfacing an error to the visitor.

### 2.3 Reporting the Client ID to GA4 as an event parameter

On a successful submission an event is pushed to the dataLayer carrying the Client ID and Session ID as parameters, which GTM reads and sends to GA4.

No custom dimension was registered in GA4, for reasons of cardinality. The Client ID is one value per person, so its cardinality equals the number of visitors. GA4 reports have a row limit; rows beyond it are not discarded but folded into a single "(other)" row, keeping only the most common values. Google's reference point for high cardinality is more than 500 values for a dimension. Registering it as a custom dimension would therefore put most records into "(other)", unusable for row-level analysis, while consuming one dimension slot.

For detail, the BigQuery export provides it: `user_pseudo_id` is the Client ID.

### 2.4 Verifying agreement between the two pipelines

Once configured, two places were checked:

- the lead record, which shows the Client ID stored at submission;
- GA4 DebugView, where the submission event fires with the expected parameters.

Both pipelines in this project share a single cookie-parsing result, so agreement is guaranteed by the source rather than by coincidence. The verification confirms that the value survives submission, backend processing and storage without loss or truncation in transit.

If the event-side value were later taken from GTM's built-in variable instead, the two pipelines would have different sources. Only then does cross-checking carry independent value, exposing things a single path cannot see, such as a rewritten cookie or a parsing error.

## 3. The result: a closed loop from browser identifier to lead record

All four stages were verified: the Client ID is parsed from the `_ga` cookie, submitted through a hidden field, stored by the backend and readable in the lead record, and appears as an event parameter in GA4 DebugView.

What this project delivered is data capture and pipeline verification. It did not implement the BigQuery join between behaviour and lead records, and it did not measure any effect on conversion rate or acquisition cost.

## 4. What I learned: capture working is not analysis working

### 4.1 An identifier has to survive the whole chain

Being able to read an identifier in the browser says nothing about whether it reaches the business data. Only after confirming it survives submission, backend processing and storage is the pipeline actually connected.

### 4.2 The same identifier can serve different pipelines

Lead capture and event reporting serve different purposes and can share one value. When the source is shared, agreement is structural; when sources differ, cross-checking becomes meaningful on its own. Distinguishing the two decides how much the verification is actually worth.

### 4.3 Capture is not the same as analysability

Sending the Client ID as an event parameter does not make it usable as a dimension in GA4's standard reports. A high-cardinality dimension gets folded into "(other)" once the row limit is reached. Row-level joining requires the BigQuery export. That is a further extension, outside what this project delivered.
