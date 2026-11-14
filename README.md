# ZENIT

Astronaut health in mission context. A tablet-first NASA Space Apps demonstration built with Svelte 5, SvelteKit 2, TypeScript, Tailwind CSS 4 and Bun 1.3.14. All product copy is in English.

## Run locally

```sh
bun install --frozen-lockfile
bun run dev
```

Open http://localhost:3000. PostgreSQL is not required for the current demo.

```sh
bun run check
bun run test
bun run build
```

Run production builds with the development server stopped: both processes generate `.svelte-kit` files. The Node adapter output is executed by Bun with `bun run start`.

## Demo walkthrough

1. Open **Mission health**. The ring is connected and the medical link is offline.
2. Double tap the ring drawing (two taps within 400 ms), or choose **Capture moment**. It saves the pulse, available observations, source and original timestamp without naming a symptom. A single tap does nothing; Enter/Space offers keyboard capture.
3. Hold the ring drawing for 700 ms, or choose **Capture & log symptom**. A captured moment opens with one-tap symptom choices. The symptom is a separate annotation of the original evidence, with its own entry time.
4. Open **Medical monitor**. Local samples continue during the medical-link outage. Restore the link to deliver snapshots and annotations once, preserving capture, annotation and reception times.
5. **Disconnect ring** stops live readings and gesture delivery. Historical sleep summaries remain available. **Log from tablet** can capture a moment with missing signals explicitly marked; a manual pulse/report is an optional fallback.
6. Expand **External measurements** and choose **Simulate instrument sync**. Blood pressure, glucose, SpO₂ and body temperature fill from labelled mock instruments. New snapshots include them; previously captured evidence does not change.
7. **Sleep & attention** has a preloaded night summary. One tap records how the astronaut feels. **Nutrition** and **Wellbeing** have quick choices and optional custom entries. Water volume is a user-confirmed preset, not a sensor measurement.
8. Explore **Apollo 11 archive**, or download all current data with **Export mission log**.

The mission clock is deterministic simulation time, advancing two seconds per timer tick. It pauses while the app is closed and may slow in background tabs. The chart retains at most 600 recent live samples alongside the scripted mission phases. No real-world clock or continuous physiological recording is implied. Gesture timing uses the browser’s monotonic clock; a displayed 2-second sample interval is only a simulation setting.

## Data provenance

- `src/lib/apollo.ts` preserves 42 selected, approximate digitized points from the [Apollo 11 Mission Report, figure 12-3(a), PDF page 268](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf#page=268). Activity annotations derive from table 12-II on PDF page 265. The transcription comes from the earlier ZENIT prototype; it is not raw NASA telemetry. Historical observations are never used as personal diagnostic thresholds.
- The [NASA exercise overview](https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/) provides group context for CEVIS exercise (median mean heart rate and session duration).
- The [NASA behavioral health evidence report](https://humanresearchroadmap.nasa.gov/evidence/reports/HRP-ER-BMED-HFBP-20250210.pdf#page=43) supplies sleep research context.
- The [NASA suit investigation report](https://www.nasa.gov/wp-content/uploads/2023/07/suit_water_intrusion_mishap_investigation_report.pdf#page=39) is the reference for the separately labelled suit telemetry concept.

All current crew readings, ring gestures and both connection controls are simulated. Respiratory rate and activity update with the ring simulator. Sleep duration (5 h 40 min), HRV (42 ms) and skin-temperature deviation (+0.2 °C) are fixed fictional night summaries, not instantaneous readings. Skin-temperature deviation is not body/core temperature. These values are design fixtures, not NASA measurements or validated ring capabilities. There is no wearable API, real gesture classifier, clinical inference, EEG, remote receiver or validated suit compatibility. Oura is a format reference; the gesture workflow does not claim Oura API support. The cabin ring and EVA suit ECG remain separate concepts. AI assisted development and transcription; no AI model assesses the astronaut in this implementation.

## Code map

- `src/routes/+page.svelte`: workspace composition, module navigation, lifecycle and device storage.
- `src/lib/mission.ts`: typed mission model, immutable sample updates, delivery queue, storage validation.
- `src/lib/apollo.ts`: historical observations and provenance.
- `src/lib/components/`: mission chart, ring gesture pad, immutable moment inbox, observation views, Apollo playback, optional recovery form, medical receiver, quick health journal and SVG icons.
- `src/app.css`: responsive flight-plan interface and shared design tokens.
- `tests/mission.test.ts`: 14 tests covering independent failures, sample gaps, immutable gesture snapshots, later symptom annotation, original timestamps, idempotent delivery, legacy persistence and input validation.

Browser storage is scoped to one origin and one browser profile. The medical view is a separate simulated receiver within the same application. The app can continue a simulated link outage while loaded; offline installation/cold-start caching is not implemented. Do not use multiple tabs as independent crew members: they share the same storage key. Existing strap-era entries keep their original sensor provenance. Storage failures are surfaced, and corrupt sessions are preserved rather than silently overwritten. Export the current in-memory log if storage fails.

## Local Docker development

```sh
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build -d
```

- App with live reload: http://localhost:3000.
- Server health check: http://localhost:3000/health. It does not query the database.
- PostgreSQL on the host: `localhost:5432`, credentials from `.env`.
- PostgreSQL inside Docker: `postgres:5432`.
- `DATABASE_URL` is injected into the app by Compose. Use it only in server code via `$env/dynamic/private`.

No database schema, ORM or migration has been added. The demo stores data in the browser. The existing PostgreSQL service remains available for subsequent backend work.

Source files are mounted into the container. Dependencies and `.svelte-kit` use Linux volumes to avoid Windows/Linux binary mixing. After adding dependencies, update `bun.lock` and rebuild/restart the development service.

```sh
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml logs -f app
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml exec app bun run check
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml exec postgres psql -U zenitring -d zenitring
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml down
```

PostgreSQL data persists in `postgres_data`. `down` preserves volumes; `down -v` deletes them and all database contents. Changing `POSTGRES_*` variables does not change users/databases in an initialized volume.

If you change `APP_PORT`, update `ORIGIN` to match the browser URL. `POSTGRES_PORT` only changes the host binding; the container always uses `5432`. Use URL-safe credentials because Compose embeds them in `DATABASE_URL`.

## Local production image

```sh
docker compose build app
docker compose run --rm --service-ports -p 127.0.0.1:3000:3000 app
```

This starts PostgreSQL as a dependency and exposes the app on port 3000. Stop PostgreSQL afterwards with `docker compose down`.

## Future Coolify deployment

This change does not create or deploy a Coolify resource. Use a Git application with the **Docker Compose** build pack and `/docker-compose.yaml`, without the development override.

Configure `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB` and `ORIGIN` (the exact public HTTPS origin without a trailing slash). Set the `app` service domain with internal port `3000`, for example `https://app.example.com:3000` in Coolify's domain field.

Compose exposes the application only to the container network for the proxy. PostgreSQL is not published to the host in production. Coolify manages proxying and TLS. The PostgreSQL volume needs an appropriate backup policy.

References: [Coolify Compose](https://coolify.io/docs/applications/builds/docker-compose), [SvelteKit with Bun](https://bun.sh/guides/ecosystem/sveltekit), [Tailwind with SvelteKit](https://tailwindcss.com/docs/installation/framework-guides/sveltekit).
