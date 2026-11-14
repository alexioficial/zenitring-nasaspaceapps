# Automatic assessment: research translated into a demo

NASA NTRS record [20240000754](https://ntrs.nasa.gov/citations/20240000754), _Artificial Intelligence Medical Support for Long-Duration Space Missions_ (2024), proposes combining wearable/environmental streams, synthetic scenarios with introduced changes, and predefined acceptable answers to evaluate AI support. It is a research proposal, not evidence that ZENIT is clinically valid.

## Implementation plan

1. Add a local, deterministic stream detector. It runs before any form is submitted. Require nine contiguous samples from the active device and phase, compare the last three against six earlier readings, and reject stale, missing, wrong-device and interrupted streams. Numerical changes are explicit demo triggers, not medical limits.
2. Lead My health with the detected pattern, observations and one contextual question. Preserve the existing check-in and saved clinical-context workflow as an optional detail section. Distinguish observed values, candidate explanations and missing information.
3. Add an isolated research scenario page. Stable signals, a single spike, persistent ring changes, suit atmosphere changes and signal loss each have a predefined expected detector result. Its synthetic data never overwrite the crew's live records.
4. Connect an optional language-model explanation using Gemini (selected by the user). The numeric detector remains independent; provider absence/failure must be clearly labelled and must not interrupt local assessment. No secrets belong in browser code.
5. Test real stream functions and scenario expectations, UI updates without manual symptom entry, question handling, offline behaviour, narrow layouts and production build.

## Boundaries

Recent reference readings are not a clinical baseline. A signal cannot establish dizziness, dehydration, fatigue or a mental-health diagnosis. Suit atmosphere is not blood oxygen or body temperature. The model's role is to explain evidence and uncertainty using a curated NASA context, not to invent measurements or issue medical clearance. No synthetic scenario is presented as an actual astronaut record.

## Implemented experiment

`/research` supplies stable signals, an isolated pulse spike, a persistent pulse rise, combined ring changes, a suit atmosphere change, and dropout. Replay is accelerated for presentation and explicitly separate from real mission records. Matching a detector outcome is not a medical validation or a model-quality score.

The Gemini integration uses the [Generate Content API](https://ai.google.dev/api/generate-content) with JSON schema output. Google returned HTTP 200 for a synthetic recovery example using the configured server credential and `gemini-3.5-flash-lite`. The initial older model was unavailable to this account; it is not used. Credentials remain in ignored local environment configuration.

The model's response is experimental; its cited source IDs must belong to the supplied context. Only computed observations and a constrained answer are transmitted to Gemini. Source references explain the background and do not imply NASA endorsement. Evaluating clinical accuracy would require independently labelled cases and medical review beyond these demonstration checks.
