# ZENIT
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users and purpose
Tablet-first central monitor for fictional astronaut biometrics, connected through real WebSockets to phone-based simulated ZENIT rings. The central monitor distributes personal monitor links; each personal workspace has its own navigation and fixed astronaut identity from its URL. Crew can capture evidence by gesture, annotate it explicitly and track emergency response. NASA Space Apps demonstration. English interface.

## Confirmed scope
Four crew members with exclusive ring bindings, 3-second default source emission, configurable per-ring interval and continuous simulated HR/HRV/SpO₂/respiration/skin deviation. Mobile double-tap snapshots and deliberate swipe emergencies. Immediate event transport, durable server receipt, offline retry outboxes and idempotent acknowledgements. Tablet manifest, astronaut detail/trends, event annotations, active/acknowledged/resolved emergency audit, stale/disconnected status, linking URLs and separate simulation lab. Server-owned SQLite persistence. Apollo explorer and previous personal prototype retained at explicit archive routes.

## Constraints
Fictional biometric values and presentation ranges are not diagnoses or validated clinical criteria. There is no commercial wearable integration, authentication, actual astronaut data or flight certification. Trusted demonstration networks only. One Bun server replica with persistent storage. Mobile browser suspension prevents guaranteed background telemetry. Local phone storage is only identity/retry persistence; inter-device communication always uses WebSocket. PostgreSQL is optional infrastructure. QR linking and offline installation are not implemented.

## Brand commitments
ZENIT, precise mission-instrument identity, quiet paper signal field within an ink-blue mission frame, tabular measurements and a crew manifest instead of repeated dashboard cards. Red reserved for explicit emergencies; text and shapes accompany status colors. Touch-comfortable controls, visible focus and reduced motion. NASA history remains separate from current crew simulation.
