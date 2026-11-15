# ZENIT

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

The primary user is the astronaut assessing their own health: understand a change, choose a next step and record the outcome. My health answers “What might be happening?” and “What should I do next?” with one-tap symptoms, activity context, source-labelled evidence and educational care guidance. Crew monitoring, device telemetry and NASA environmental exploration support that workflow.

Tablet-first central monitor for fictional astronaut biometrics, connected through real WebSockets to simulated ZENIT rings and spacesuits. Mission phases select a primary source without substituting another device during an outage. Crew can capture evidence by gesture, annotate it explicitly and track emergency response. NASA Space Apps demonstration. English interface.

The entry page at `/` is a presentation landing with English as the default and an EN/ES selector. Spanish uses `?lang=es`, preserved on reload; other query parameters and the current anchor survive language changes. This selector translates only the landing, including its illustrative context responses; the application workspaces remain in English. It introduces astronaut context, crew communication, research sources and the prototype's scope, then offers Astronaut view and Crew monitor in `#choose-view`. Explore the demo links jump to that selector. Every workspace header identifies the current view; astronaut views name the fixed identity from the URL. Switch view returns to the landing. Personal navigation keeps My health, My records, and My devices prominent, with secondary tools under More. The separate crew monitor at /crew also distributes personal links. Ring, suit, and research simulators are labelled demo tools.

## Confirmed scope

The landing includes an explicitly fictional pulse comparison with three context choices. Its explanatory copy is local and illustrative: it reads no live telemetry, requests no AI, persists no records and sends no alerts. The selected demo astronaut is carried into personal, guided-simulation and device-simulator links. ARCHeR and Radi-N2 source links remain separate from the synthetic exercises.

Guided activity/recovery, sleep/attention, wellbeing and food/hydration check-ins; optional captured evidence attachment; NASA-linked explanations; persistent next-step completion and better/same/worse/contacted follow-ups. Explicit help prompts work locally in an already-loaded page. Saved records are shared with the crew; drafts are not. This is educational guidance and an assessment interface, not a validated diagnostic or treatment engine.

Four crew members with independent exclusive ring and suit bindings, 3-second default source emission, configurable per-ring interval and continuous simulated HR/HRV/SpO₂/respiration/skin deviation. Mobile double-tap snapshots and deliberate swipe emergencies. Immediate event transport, durable server receipt, offline retry outboxes and idempotent acknowledgements. Tablet manifest, astronaut detail/trends, event annotations, active/acknowledged/resolved emergency audit, stale/disconnected status, linking URLs and separate simulation lab. Server-owned SQLite persistence. Apollo explorer and previous personal prototype retained at explicit archive routes.

NASA context includes 84 actual historical DosTel1 observations from ISS Columbus, with a bounded API refresh and saved-response fallback. NASA-STD-3001 supports suit field selection. Source dates, instruments and units remain explicit; radiation is not assigned as personal exposure. Cabin, Spacewalk and Recovery transitions and original ring/suit event snapshots persist in the shared history.

## Constraints

Fictional biometric values and presentation ranges are not diagnoses or validated clinical criteria. There is no commercial wearable integration, authentication, actual astronaut data or flight certification. Trusted demonstration networks only. One Bun server replica with persistent storage. Mobile browser suspension prevents guaranteed background telemetry. Local phone storage is only identity/retry persistence; inter-device communication always uses WebSocket. PostgreSQL is optional infrastructure. QR linking and offline installation are not implemented.

## Brand commitments

ZENIT uses the Orbital medbay identity: ceramic-white working surfaces on a cool blue-gray field, a navy mission frame, teal controls and traces, self-hosted Manrope and large sans-serif tabular measurements. A large fictional gold-visor astronaut in a bright cabin scene, with visible AI-generated concept provenance, anchors the personal experience; crew monitoring remains a distinct role. Quiet borders, gently rounded controls, explicit source and freshness labels, touch-comfortable targets, visible focus and reduced motion support precise use. Amber marks attention; red is reserved for explicit emergency/help states, with text accompanying color. NASA history remains separate from current crew simulation.

## Plain-language health interpretation

The astronaut sees What changed, What it could mean and What to do now directly in the assessment panel. Gemini receives numeric observations, confirmed context and curated NASA background; it supplies a short possible explanation and relevant uncertainty. Built-in guidance remains available during loading or provider failure, with explicit attribution. Symptoms and suit alerts take precedence; stale data removes previous interpretations. The model does not control next steps or send alerts. Context answers can be changed; saving a shared check-in remains an explicit Record how I feel action.

NASA source summaries explain the monitoring context beside the interpretation. The separate NASA data in this demo entry opens 84 historical DosTel1 readings and explicitly distinguishes environmental history from current simulated biometrics and personal dose.
