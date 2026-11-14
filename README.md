# ZENIT

A crew health instrument for NASA Space Apps: a **tablet monitor** connected to **mobile ring simulators**. Biometrics are fictional; WebSocket communication, server reception and acknowledgements are real. Built on the existing Svelte 5 / SvelteKit 2 / TypeScript / Tailwind 4 / Bun application. Product copy is English.

## Run

Requires Bun 1.3.14 or newer.

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000` on the server computer. For separate phones/tablets, use the computer's LAN IP, for example:

| Interface | Address |
| --- | --- |
| Central tablet monitor | `http://192.168.1.20:3000/` |
| VEGA personal monitor | `http://192.168.1.20:3000/astronaut/vega` |
| NOVA personal monitor | `http://192.168.1.20:3000/astronaut/nova` |
| VEGA phone ring | `http://192.168.1.20:3000/ring?astronaut=vega` |
| NOVA phone ring | `http://192.168.1.20:3000/ring?astronaut=nova` |
| Historical Apollo explorer | `/archive` |
| Preserved single-person prototype | `/legacy` |

Other crew IDs are `atlas` and `lyra`. The central monitor opens directly to the crew overview without the personal navigation bar. Its **Astronaut links** view offers one **Copy astronaut link** action per person. This opens their health workspace; **My ring → Open my ring** opens the simulator from there. Ring replacement is a secondary action inside **Device options**. Personal monitors have their own navigation and a fixed astronaut identity from the URL; their WebSocket session receives only that astronaut's records. These links select a demo context, not authenticated accounts.

All devices need network access to the server. Allow inbound TCP 3000 on the server's private network; avoid Wi-Fi client isolation. **localhost on a phone points to the phone**, not your computer. The linking view exposes an editable LAN address. No QR service or external connection service is required.

**[Full demonstration guide](docs/DEMO.md)** includes gesture thresholds, reconnection behavior, network/TLS configuration, persistence, presentation steps and limitations.

## Demonstrate

1. Open a ring URL on each phone, choose the astronaut and link. Each astronaut has one exclusive ring reservation. Another device cannot take over while it is offline; the monitor can explicitly release a disconnected binding.
2. Telemetry arrives every **3 seconds** by default. In the personal monitor's **Simulation lab** (or a crew detail's simulation settings), change that astronaut's interval from 1–15 seconds. The server sends configuration to that actual emitter; the monitor separately shows whether the ring applied its revision.
3. **Double tap** the phone's touch surface: an immediate immutable biometric snapshot appears in the tablet's event log. Add the astronaut's words as a separate annotation. The gesture never names a symptom.
4. **Deliberately swipe horizontally** at least 110 pixels over 250–1600 ms to activate an emergency. The monitor displays it across views. Acknowledge it first, then resolve with a note; both actions and the original evidence stay in history.
5. Disconnect the ring using secondary controls. Offline events remain pending on the phone and retry on reconnection with their original timestamp and event ID. They are not marked delivered before a server acknowledgement. An undelivered emergency displays an explicit warning.
6. Pause telemetry without disconnecting to demonstrate stale readings. The tablet keeps the last known values and timestamps, labels stale/disconnected signals, and never generates replacement readings.

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

- `src/lib/crew/`: shared protocol/domain, continuous crew-specific simulation, gesture recognizer, reconnecting transport and actual ring emitter.
- `server/hub.ts`: validated WebSocket protocol, exclusive associations, heartbeat, server timestamps, acknowledgements and retry deduplication.
- `server/repository.ts`: Bun SQLite persistence. Default `data/zenit.sqlite`, configurable via `MISSION_DB_PATH`.
- `src/routes/+page.svelte`: central crew monitor without personal navigation.
- `src/routes/astronaut/[id]/`: validated personal links with fixed astronaut identity.
- `src/lib/components/crew/MissionWorkspace.svelte`: shared monitor views, scoped personal navigation, detail/trends and links distributed from the central monitor.
- `src/routes/ring/+page.svelte`: phone identity, touch surface, pending delivery and simulation controls.
- `src/lib/components/crew/`: shared metric trends, event annotations, emergency audit and configuration forms.
- `tests/`: legacy regressions, gesture/simulation behavior and real multi-client WebSocket integration tests.

Server storage owns configurations, ring reservations, events, annotations and emergency actions. It retains 120 recent telemetry samples per astronaut and all events. The UI shows up to 200 recent events plus all unresolved emergencies. **Complete server archive** exports every retained event; visible-session export captures the current monitor snapshot.

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

AI assisted software development, documentation and prior transcription. No AI model assesses an astronaut. All current ring metrics, scenarios and reference ranges are explicitly simulated; skin-temperature deviation is not core temperature. Legacy behavior and its limitations are documented in [the original README](docs/LEGACY.md) and [original design](docs/LEGACY-DESIGN.md).
