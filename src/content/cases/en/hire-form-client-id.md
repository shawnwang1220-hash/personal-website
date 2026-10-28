---
title: "From browser cookie to lead record: capturing the GA4 Client ID in a form"
summary: "Carrying the GA4 Client ID in a hidden field on this site's lead form so it is stored with the lead record, while GA4 event collection runs a separate GTM built-in variable path; both links verified independently."
tags: ["GA4", "GTM", "Tracking"]
problem: "How does a website visitor's analytics identifier get linked to their lead record?"
approach: "Connecting the browser side to the data collection side"
result: "Capturing, passing on and persisting the Client ID"
learned: "Capture, identity and behaviour analysis are different layers of the problem"
stack: ["JavaScript", "Cloudflare Worker", "GTM", "GA4"]
date: 2026-10-28
---

## Problem

In this personal site's lead capture flow, the form submission needs to store the business information the visitor fills in, and it can also keep the anonymous client identifier GA4 uses — which gives later analysis of visitor behaviour against lead records a data basis.

The project set out to answer three questions:

- How is the GA4 Client ID obtained from the browser and brought into the form submission data?
- How is that identifier passed to the backend alongside the other form fields, and persisted?
- How are the identifier values in GA4's event collection and in the lead record verified?

## Approach

### 1. Reading the `_ga` cookie with JavaScript

JavaScript reads the `_ga` cookie in the browser and parses out the Client ID.

Because the value has to enter the form submission data rather than only exist as a temporary variable on the page, the extraction logic sits in the form data preparation stage, so the identifier leaves together with the business fields.

The implementation has to account for a missing cookie, a failed read and a format change, so that an unavailable analytics identifier does not affect a normal form submission.

### 2. Passing the Client ID through a hidden form field

The site's form was built with AI assistance and deploys on the personal site.

The parsed Client ID is written into a hidden form field so it is submitted together with the other fields the visitor fills in. The visitor does not need to type anything extra, and the normal form interaction is unchanged.

This design brings the browser-side analytics identifier into the existing data transmission path, without adding a separate user step just to collect it.

### 3. Receiving and storing the lead in a Cloudflare Worker

Form data is submitted to a Cloudflare Worker, which processes and stores it on the backend.

Lead data is persisted in two places. After going live, the Client ID could be seen in an actual lead record, confirming that the field had travelled from the browser into backend storage.

That step completes the transfer of an anonymous client identifier from the browser environment to the lead data layer.

### 4. Verifying event collection with GTM and GA4

GA4 event collection takes a different, independent path: GTM's native built-in Client ID variable supplies the identifier, which is sent to GA4 as a custom parameter on the form submission event.

The submission event and its parameters are then checked in GA4 DebugView to confirm the collection path works.

Two things need keeping apart here: the hidden field in the form passes the Client ID to the backend; the GTM built-in variable supplies the Client ID to the GA4 event. The two paths satisfy lead data storage and event data collection respectively.

## Result

What the project has completed and verified:

- Reading and parsing the `_ga` cookie in the browser with JavaScript.
- Writing the Client ID into a hidden form field and submitting it with the form data.
- Receiving the form data in a Cloudflare Worker and storing the Client ID in the lead record.
- Sending the Client ID to GA4 as a custom parameter through the GTM built-in variable.
- Confirming the submission event and its parameters in GA4 DebugView, and the Client ID in an actual lead record.

This stage delivered browser-side identifier capture and persistence into the lead data layer, with GA4 event collection verified. It did not implement the GA4 BigQuery Export join with lead records, and did not verify any effect of this data path on lead quality, opportunity conversion rate or revenue.

## Learned

### 1. Capturing an identifier is not the same as completing an identity link

The Client ID is a candidate key for connecting browser behaviour to a lead record, but it does not by itself link the data in the two systems. Real analysis still has to confirm that the identifier matches on both ends, and deal with missing cookies, browser changes and duplicate submissions.

### 2. GA4's native identifier and a custom parameter serve different purposes

GA4's native Client ID participates in client identification; sending it as a custom event parameter exists so that the value can be collected as event data.

A custom dimension's scope decides how the data is used in reporting, and does not change how GA4 identifies a client in the first place. That is why capturing the Client ID is not on its own a reason to register it as a high-cardinality custom dimension.

### 3. Keeping the data basis for later cross-system behaviour analysis

The next step can be the GA4 BigQuery Export: `user_pseudo_id`, `ga_session_id` and event timestamps from the exported events, matched against the Client ID and submission time in the lead records.

Once the matching rules are verified, the analysis can go further — the pages visited before submitting, the content engaged with, the channels arrived from — and how those behavioural traits line up with lead quality and opportunity outcomes in the CRM.

That is the direction for the next stage, not something this project has already completed.

**The core value of this project is to bring the GA4 client identifier from the browser into the lead data layer, and to verify an independent GA4 event collection path, laying the technical groundwork for later connecting on-site behaviour with lead records.**
