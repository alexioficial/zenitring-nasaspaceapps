# Multiple sources and NASA evidence

ZENIT is a software proof of concept. The approved experience follows one astronaut through Cabin, Spacewalk and Recovery. Each phase selects a named primary source; source failure must never silently substitute another device. Ring gestures remain a cabin concept. The suit simulator supplies an independent read-only telemetry feed through the existing WebSocket hub, with its own binding, freshness, retained readings and immutable events. No life-support control is implemented.

Implementation choice: extend the existing protocol additively, preserving ring clients and saved sessions. One ring and one suit may be reserved per astronaut. Both can be connected independently. Phase changes are explicit monitor actions, recorded by server time. A shared event log accepts snapshots from both types. Ring telemetry and its existing configuration retain their shape; suit telemetry has its own validation and units. Source-specific historical charts never join readings across a phase or a gap.

NASA resources have three distinct roles:

- NASA-STD-3001 Volume 2 section 11 informs the choice of suit pressure, oxygen partial pressure and carbon dioxide partial pressure. It does not supply this simulator's readings or certify any limits: https://www.nasa.gov/reference/11-0-spacesuits-vol-2/
- Apollo 11 report observations remain in the existing archive, with their inherited approximate digitization disclosure.
- NASA OSDR RadLab supplies a real historical environmental series, queried for DosTel1 in ISS Columbus, 2022-04-01 23:00 through 2022-04-02 01:05. Original timestamps, instrument, location, units and nulls are preserved. It is not an astronaut dosimeter, live mission data or evidence of a symptom's cause. API: https://visualization.osdr.nasa.gov/radlab/gui/data-api/

RadLab is a separate environmental context panel. Use the checked-in response during a network outage and offer a bounded server-side refresh of the same query. Display retrieval status separately from observation time. No conversion from absorbed dose rate (μGy/h) to dose equivalent (μSv/h), no personal cumulative dose, no inferred exposure/safety scores. Gaps remain gaps.

Verification covers independent device bindings and failure, malformed/cross-device input rejection, phase persistence and history, event retry deduplication, original timestamps, backward-compatible saved sessions, RadLab nulls/units/fallback, real browser capture/reconnect and responsive display. All product copy is English.
