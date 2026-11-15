# ZENIT

A crew health instrument for NASA Space Apps: a **tablet monitor** connected to **ring and spacesuit simulators**, with a separate **NASA RadLab historical radiation explorer**. Personal and suit telemetry are fictional; WebSocket communication, server reception and acknowledgements are real. Built on the existing Svelte 5 / SvelteKit 2 / TypeScript / Tailwind 4 / Bun application. Product copy is English.

## Run

Requires Bun 1.3.14 or newer.

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000` on the server computer. For separate phones/tablets, use the computer's LAN IP, for example:

| Interface                  | Address                                        |
| -------------------------- | ---------------------------------------------- |
| Project landing / demo     | `http://192.168.1.20:3000/`                    |
| Crew monitor               | `http://192.168.1.20:3000/crew`                |
| Alexi personal monitor     | `http://192.168.1.20:3000/astronaut/vega`      |
| Rivier personal monitor    | `http://192.168.1.20:3000/astronaut/nova`      |
| Alexi phone ring           | `http://192.168.1.20:3000/ring?astronaut=vega` |
| Rivier phone ring          | `http://192.168.1.20:3000/ring?astronaut=nova` |
| Alexi spacesuit            | `http://192.168.1.20:3000/suit?astronaut=vega` |
| Historical Apollo explorer | `/archive`                                     |

Start at `/` to explore the project landing. Select **Explore the demo** (or open `/#choose-view`) and choose **Astronaut view** or **Crew monitor**. Choose an astronaut before opening the personal view. The header always names the current workspace and identity; **Switch view** returns to the chooser. Personal navigation has three primary sections: **My health**, **My records**, and **My devices**. **More** contains signal details, NASA resources, simulation settings, and research scenarios. The first time an astronaut link opens in a browser it lands on **My devices**; later visits open **My health**. A per-astronaut cookie (`zenit-onboarded-<id>`) remembers this, so clearing site data replays the first run, and a link that already names a view (`?view=records`) is never redirected. Views have reloadable links, and browser Back/Forward follows the selected section. Ring and suit simulators are separate demo tools; they open health views in another tab so their readings continue.

Other crew IDs are `atlas` and `lyra`. The central monitor at `/crew` opens directly to the crew overview without the personal navigation bar. Its **Astronaut links** view offers one **Copy astronaut link** action per person. This opens their health workspace; **My devices → Open my ring** opens the simulator from there. Ring replacement is a secondary action inside **Replace a linked device**. Personal monitors have their own navigation and a fixed astronaut identity from the URL; their WebSocket session receives only that astronaut's records. These links select a demo context, not authenticated accounts.

All devices need network access to the server. Allow inbound TCP 3000 on the server's private network; avoid Wi-Fi client isolation. **localhost on a phone points to the phone**, not your computer. The linking view exposes an editable LAN address. No QR service or external connection service is required.

The personal My devices view also opens the independent suit simulator. Each source has its own connection and reservation.

**[Full demonstration guide](docs/DEMO.md)** includes gesture thresholds, reconnection behavior, network/TLS configuration, persistence, presentation steps and limitations.

## Demonstrate

Open the personal link (for example `/astronaut/vega`). **My health now leads with automatic assessment**: nine comparable readings are enough to evaluate a persistent demo change without filling a form. The astronaut answers one contextual question when needed. Expand **Report symptoms or review saved check-ins → Understand this moment.** for the existing manual workflow. Choose a health topic, tap any symptoms and select the activity context, optionally attach a captured ring/suit moment, and select **Understand my signals**. The preview shows possible contributors, actual source readings and a recent same-device pulse comparison when available, explains what the evidence can and cannot establish, links its NASA health context and offers actions to discuss or complete. Save the check-in, mark steps, and record whether you feel better, the same or worse. Saved reports and follow-ups appear in the crew detail. Draft guidance remains usable in an already-loaded page while offline; drafts are not shared until explicitly saved after reconnecting.

The challenge-to-feature mapping, research links, treatment-guidance boundary and demonstration are documented in [Challenge alignment](docs/CHALLENGE-ALIGNMENT.md). Educational guidance is not a diagnosis, medical clearance or a NASA-approved clinical protocol. Asking for help in the UI does not call the crew; the screen directs the astronaut to contact them directly.

1. Open a ring URL on each phone, choose the astronaut and link. Each astronaut has one active ring connection. A newly connected tab or device automatically replaces the previous connection, including offline bindings. The previous tab keeps pending events and stops automatic reconnection. Reopening a simulator in the same browser restores its device identity and outbox.
2. Telemetry arrives every **3 seconds** by default. In the astronaut view’s **More → Simulation settings** (or a crew detail's simulation settings), change that astronaut's interval from 1–15 seconds. The server sends configuration to that actual emitter; the monitor separately shows whether the ring applied its revision.
3. **Double tap** the phone's touch surface: an immediate immutable biometric snapshot appears in the tablet's event log. Add the astronaut's words as a separate annotation. The gesture never names a symptom.
4. **Deliberately swipe horizontally** at least 110 pixels over 250–1600 ms to activate an emergency. The monitor displays it across views. Acknowledge it first, then resolve with a note; both actions and the original evidence stay in history.
5. Disconnect the ring using secondary controls. Offline events remain pending on the phone and retry on reconnection with their original timestamp and event ID. They are not marked delivered before a server acknowledgement. An undelivered emergency displays an explicit warning.
6. Pause telemetry without disconnecting to demonstrate stale readings. The tablet keeps the last known values and timestamps, labels stale/disconnected signals, and never generates replacement readings.

### Mission continuity and NASA data

1. Link a ring and a suit to **the same astronaut**, in separate tabs/devices. Each has its own reservation and signal status.
2. In **My health**, select **Cabin → Spacewalk → Recovery**. The primary heart-rate source becomes Ring → Suit ECG → Ring. Phase changes are persisted, and the chart breaks across changes and missing readings. Selecting a phase creates no telemetry.
3. During Spacewalk, disconnect the suit while the ring remains online. The monitor reports the missing primary signal instead of silently substituting the ring. Capture a suit moment offline, then reconnect: the shared event log receives the original suit snapshot. Add an annotation to that event.
4. Open **NASA context** or the environmental panel below My health. Explore **84 real historical DosTel1 observations** from ISS Columbus (2022-04-01 23:00 through 2022-04-02 01:05, exclusive). **Refresh NASA record** retrieves the same bounded query through `/api/radlab`; NASA failures return the labelled bundled response. A network failure between browser and server retains the series already on screen.

RadLab supplies environmental instrument data, not suit telemetry, a personal dosimeter, a symptom diagnosis or a live feed for this fictional mission. Absorbed dose rate remains **μGy/h**. Missing dose-equivalent readings remain missing; there is no conversion to μSv/h or personal exposure score. The source timestamps are displayed as supplied (without an added timezone claim); a consistent UTC coordinate is used only to space the historical chart. The original query and retrieval timestamp are included in `src/lib/nasa/radlab-dostel1.json`. All returned rows are retained and sorted by source time, with gaps over five minutes left open.

NASA-STD-3001 §11.3 informs the suit atmosphere fields; simulated values are not NASA flight measurements or certified limits. The suit page has no life-support controls. See [the multisource design and provenance](docs/MULTISOURCE-NASA.md).

## Verification and production

```sh
bun run test
bun run check
bun run build
bun run start
```

Stop development before building: both generate `.svelte-kit`. `start` runs `server/start.ts`, attaching WebSocket to the same HTTP server as the adapter-node handler. **`bun run preview` is only an asset preview and does not start the mission hub.**

`HOST` defaults to `0.0.0.0`, `PORT` to `3000`. Clients derive `/ws` from the page origin, using WS on HTTP and WSS on HTTPS. A reverse proxy must forward WebSocket upgrades on `/ws` to internal port 3000. Production `ORIGIN` should match the public HTTPS origin. Optional `PUBLIC_ORIGIN` pins the permitted WebSocket browser origin. Use one application replica with durable SQLite storage.

## Storage and architecture

The ring gesture surface renders a procedural **Three.js** concept: a rounded titanium band, dark inner liner, sensor windows and a light that responds to capture and connection state. The model loads only in the browser; no external model, texture service or physical wearable is required. Existing double-tap, swipe and keyboard actions remain available. A static ring replaces the canvas if WebGL is unavailable or its context is lost. Animation respects reduced motion and pauses when the surface is offscreen or the document is hidden; rendering is capped at 30 fps and 1.5 device pixel ratio. The shape is a visual concept, not an engineered or spacesuit-qualified device.

- `src/lib/crew/`: shared protocol/domain, continuous crew-specific simulation, gesture recognizer, reconnecting transport and actual ring emitter.
- `src/lib/crew/suit.ts` and `suit-client.ts`: separate suit metrics, source selection, local sampling and durable event outbox.
- `src/lib/three/ring-scene.ts` and `src/lib/components/RingScene.svelte`: shared 3D renderer, lifecycle cleanup and accessible gesture-surface integration for `/ring`.
- `server/hub.ts`: validated WebSocket protocol, exclusive associations, heartbeat, server timestamps, acknowledgements and retry deduplication.
- `server/repository.ts`: Bun SQLite persistence. Default `data/zenit.sqlite`, configurable via `MISSION_DB_PATH`.
- `src/routes/+page.svelte` and `src/lib/landing.css`: English project landing, illustrative context interaction, role selector and direct guided-simulation entry. The landing example makes no AI requests and saves or sends no records.
- `src/routes/crew/`: central crew monitor without personal navigation.
- `src/routes/astronaut/[id]/`: validated personal links with fixed astronaut identity.
- `src/lib/components/crew/MissionWorkspace.svelte`: shared monitor views, scoped personal navigation, detail/trends and links distributed from the central monitor.
- `src/routes/ring/+page.svelte`: phone identity, touch surface, pending delivery and simulation controls.
- `src/routes/suit/+page.svelte`: independent suit transmitter, retained local measurements and pending capture delivery.
- `src/lib/nasa/` and `src/routes/api/radlab/`: provenance-preserving RadLab snapshot, parser and fixed-query refresh with fallback. Upstream calls time out after eight seconds; successful responses are shared for five minutes.
- `src/lib/components/crew/`: shared metric trends, event annotations, emergency audit and configuration forms.
- `tests/`: gesture/simulation behavior and real multi-client WebSocket integration tests.

Server storage owns configurations, independent ring/suit reservations, mission phases, events, annotations and emergency actions. It retains 120 recent telemetry samples per source and all events and phase changes. Earlier ring-only records are read with an empty suit and Cabin phase. The UI shows up to 200 recent events plus all unresolved emergencies. **Complete server archive** exports every retained event; visible-session export captures the current monitor snapshot.

Phone session storage identifies its tab and local storage holds only its retry outbox. Neither substitutes for WebSocket communication. Keep the same phone tab open until pending events are confirmed; reload resumes its original association. Storage errors warn that new events are in memory only. No authentication, clinical validation, commercial wearable API or offline installation is implemented. Use a trusted demo network and fictional data. Sleeping/background mobile browsers can suspend emission; stale status makes that visible.

## Docker / Coolify

```sh
# PowerShell: Copy-Item .env.example .env
cp .env.example .env
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build -d
```

The development port binds to all interfaces to permit phones. Compose uses the `mission_data` volume for SQLite. PostgreSQL is retained as optional infrastructure under the `database` profile and is not part of the telemetry path. `docker compose --profile database up -d postgres` starts it separately.

For production/Coolify use `/docker-compose.yaml` without the development override, set `ORIGIN` to the public HTTPS origin and route the app to internal port 3000 with WebSocket upgrades. The final image runs as `bun`; `/app/data` is writable and backed by `mission_data`. Back up SQLite appropriately. `down` preserves volumes; **`down -v` deletes persistent data**. Docker execution has not been verified in the current Windows environment.

## Historical data and acknowledgement

Apollo 11's 42 selected approximate digitized observations remain separate from fictional personal signals: [Apollo 11 Mission Report, figure 12-3(a), PDF page 268](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf#page=268), activities from table 12-II on PDF page 265. The transcription was inherited from the earlier prototype, not raw telemetry. No historical observation is a personal diagnostic threshold.

Preserved context includes [NASA exercise overview](https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/), [NASA behavioral health evidence](https://humanresearchroadmap.nasa.gov/evidence/reports/HRP-ER-BMED-HFBP-20250210.pdf#page=43) and the [NASA suit investigation report](https://www.nasa.gov/wp-content/uploads/2023/07/suit_water_intrusion_mishap_investigation_report.pdf#page=39). The initial research links [NASA human spaceflight risks](https://www.nasa.gov/hrp/risks/) and [five hazards](https://www.nasa.gov/hrp/hazards/) to the motivation for contextual monitoring and continuity of onboard records.

AI assisted software development, documentation and prior transcription. Optional Gemini explanations contextualize evidence and NASA risks; local rules retain ownership of next actions. All current ring metrics, scenarios and reference ranges are explicitly simulated; skin-temperature deviation is not core temperature. The former `/legacy` prototype has been removed.

## Automatic assessment and Gemini

Open `/research` for six isolated synthetic scenarios with predefined detector expectations. Replay the readings, compare the observed pattern with the expectation, and optionally enable a real Gemini explanation. These experiments do not modify mission records. See [research mapping and boundaries](docs/AUTOMATIC-ASSESSMENT.md).

Set `GEMINI_API_KEY` in the server's private `.env` and restart the app. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. The key never goes to the browser. Gemini receives calculated numeric observations and the selected contextual answer, without astronaut names or free-text notes. The server recomputes the detector result from bounded, validated samples; the model cannot change local next steps or control the suit.

The API uses a 12-second timeout, structured output validation and a global demo limit of 15 requests/minute. An episode/context change triggers an explanation; every incoming sample does not trigger a model call. The AI panel labels its original evidence time while live measurements continue. Missing configuration, provider failure, or interrupted signals leave the local analysis available. A reported concern remains visible through signal loss until the user records contacting the crew. This is an experimental interpretation workflow, not a clinical diagnosis or authenticated medical service.

## Code formatting

Run `bun run format` to format source, tests, documentation and configuration with Prettier and its Svelte plugin. Run `bun run format:check` to verify formatting without changing files. The shared configuration uses two-space indentation, single quotes and a 100-column target. Generated output, runtime data, environment files and the Bun lockfile are excluded.
