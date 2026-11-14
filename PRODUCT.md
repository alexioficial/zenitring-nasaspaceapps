# ZENIT
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users and purpose
Tablet interface for an astronaut to understand health readings in mission context and record follow-up. A companion medical view shows what has actually arrived. NASA Space Apps hackathon demonstration, in English.

## Confirmed scope
Mission timeline: preparation, EVA, return to cabin. Simulated ZENIT Ring in cabin; simulated suit ECG during EVA. Independent sensor and medical link failures. Double-tap gestures capture immutable readings; a hold opens one-tap symptom annotation. Local persistence preserves capture, annotation and reception timestamps. Sleep summaries are preloaded; wellbeing and nutrition use quick actions with optional manual details. Apollo 11 historical exploration with explicit NASA provenance. Vital signs, sleep and attention, wellness, nutrition.

## Constraints
Historical digitized NASA observations are separate from fictional personal measurements. No diagnosis, validated alert thresholds, hardware certification or actual medical transport is claimed. PostgreSQL infrastructure exists but the demo uses browser storage. Ring gesture recognition on real hardware, wearable integration, clinical protocols and authentication remain future work. Blood pressure, glucose, body temperature and SpO₂ retain separate instrument sources. Simulated live respiration/activity and nightly HRV/skin-temperature deviation carry distinct measurement periods. The ring is conceptual; no Oura gesture API or EVA glove compatibility is claimed.

## Brand commitments
ZENIT, English interface, ink-blue flight-plan aesthetic, tablet-first mission timeline, legible charts with source labels.
