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

The Gemini integration uses the [Generate Content API](https://ai.google.dev/api/generate-content) with JSON schema output. Quick explanations use `gemini-3.8-flash` (`GEMINI_MODEL`); **Explore the evidence** requests `gemini-3.1-pro-preview` (`GEMINI_DETAIL_MODEL`) without navigation. Both model IDs were confirmed against the account's model catalog. Live checks returned validated explanations for sleep practice, radiation practice and synthetic recovery telemetry. These checks confirm integration, not clinical accuracy. Credentials remain in ignored local environment configuration.

Quick requests use low thinking and at most 4096 output tokens; detailed requests use medium thinking and at most 8192. Server deadlines are 25 and 55 seconds respectively. A five-minute cache holds at most 100 validated results, and identical concurrent requests share one call. There are no automatic retries or paid model escalations. Automatic requests remain associated with a source, phase, pattern and confirmed answer, rather than repeating whenever a sliding sample window advances. The UI labels the time of the explained evidence.

Explanations include a summary, missing information, the rationale for the fixed next action and evidence notes. Every note references a supplied observation and a permitted citation. Unknown references, malformed JSON and incomplete provider output fall back to the local guidance. Numeric charts are rendered from local observations, never model-generated values. Guided charts show only reached practice days or detector counts from the same collection interval; telemetry compares the earlier six and latest three medians with units kept separate.

The model and thinking settings follow Google's [model catalog](https://ai.google.dev/gemini-api/docs/models) and [thinking configuration](https://ai.google.dev/gemini-api/docs/generate-content/thinking). Operators can override models in the server environment; Compose passes both model settings and the private key into the application.

The model's response is experimental; its cited source IDs must belong to the supplied context. Only computed observations and a constrained answer are transmitted to Gemini. Source references explain the background and do not imply NASA endorsement. Evaluating clinical accuracy would require independently labelled cases and medical review beyond these demonstration checks.
