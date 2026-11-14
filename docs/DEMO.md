# ZENIT multi-device demonstration

All biometric values are fictional. The network connection and reception acknowledgements are real. This is an open demonstration system for a trusted network, not medical equipment.

## Start

Requires Bun 1.3.14 or newer. `bun install --frozen-lockfile`, then `bun run dev`. Open `http://localhost:3000` on the server computer. Vite serves SvelteKit and the same HTTP server handles `/ws`. No separate WebSocket port or PostgreSQL is required.

Production: stop development, run `bun run check`, `bun run test`, `bun run build`, then `bun run start`. The custom Bun entrypoint serves adapter-node's handler and attaches the same WebSocket hub. `bun run preview` is only a Vite asset preview and is not the multi-device demonstration server.

## Phones and tablet

1. Find the server computer's private LAN IP, for example `192.168.1.20` (Windows: `ipconfig`). Use one Wi-Fi without client isolation. Permit incoming TCP 3000 on the server's private network. All devices must reach this computer; a phone hotspot also works if its network permits peer access.
2. On the tablet open `http://192.168.1.20:3000/`.
3. On the central monitor choose **Astronaut links**. If it shows localhost, change the server-address field to `http://192.168.1.20:3000`. Use the single **Copy astronaut link** action for each person, such as `/astronaut/vega`; the URL fixes the identity. Only personal monitors show the My health / Signal details / Event log / My devices / Simulation lab navigation. The central monitor has no personal navigation bar.
4. The astronaut opens that link and chooses **My devices → Open my ring**, then **Link this ring** in the simulator. Use a different astronaut's shared link on the other phone. Direct `/ring?astronaut=vega` URLs still work for technical demonstrations, but are not competing sharing actions in the central interface. The remaining astronaut IDs are `atlas` and `lyra`.
5. A different device cannot claim an astronaut's reserved ring, even while offline. The original device reconnects with its tab identity. To replace a device: confirm its pending events, disconnect it, then choose **Device options → Unlink current ring** on the monitor. A second active tab using the same identity is explicitly rejected.

All WebSocket URLs derive from the page origin: `ws://host:3000/ws` for HTTP or `wss://host/ws` for HTTPS. A public reverse proxy must forward WebSocket upgrades for `/ws` to internal port 3000. Use one server replica and durable SQLite storage. Optional `PUBLIC_ORIGIN=https://example.com` strictly pins WebSocket browser origins; leave it unset for a LAN demonstration. `ORIGIN` is the SvelteKit production origin. No cross-origin WebSocket URL needs to be entered on the phone.

## Gestures

Keep the phone page visible, screen awake, and gesture surface in view. Touch gestures and mouse pointers use the same recognizer.

- **Double tap:** two short taps, each at most 250 ms and 14 px movement; releases no more than 350 ms apart and within 36 px. Captures a moment immediately. The monitor's detail/event log allows an explicit annotation of what the astronaut reported.
- **Emergency swipe:** one deliberate horizontal stroke of at least 110 CSS px, taking 250–1600 ms, at least twice as much horizontal as vertical displacement. Release to activate. A very fast flick or vertical page-scroll-like movement does not count. The surface blocks page scroll and zoom only inside itself. Swipe candidates consume tap state; a 1200 ms cooldown suppresses duplicate activations.
- The phone confirms detection first, then shows pending or confirmed delivery. Supported phones add brief optional vibration. Buttons in **Simulation controls** and keyboard capture are accessible alternatives.

An emergency remains **active** until acknowledged on the monitor. Acknowledgement leaves it open. **Resolve** requires acknowledgement and a resolution note; the snapshot, original event, annotations and both transition times remain in history. The emergency strip is accessible from all central-monitor tabs.

## Demonstration sequence

1. Link at least two phones. The crew manifest shows their independent last-received times. Default emission is 3000 ms; first sample is sent immediately on initial registration.
2. Open a crew detail, start an annotation, and wait for several signals: the form and expanded event stay in place.
3. Open VEGA's personal monitor and its **Simulation lab**, change the interval to 1 second, and apply. It first saves on the server; the displayed revision confirms when the actual ring applies it. NOVA retains its own interval. Current config is resent on reconnect. The central monitor also retains per-crew simulation settings inside signal detail.
4. Select **Progressive change**, then **Outside demo ranges**. Values approach a distinct target smoothly. Amber means outside a presentation reference, never a diagnosis. Return to **Normal** to recover gradually.
5. Double tap phone A. See its immediate event and copied values in the monitor, independent of the periodic interval. Add the astronaut's reported feeling; the note is a separate server record and does not rewrite the snapshot.
6. Deliberately swipe phone B. From any monitor tab, select its open-emergency strip entry. Inspect the captured evidence, acknowledge, add a note, and resolve with a recorded outcome. Check the retained event history.
7. In phone A's secondary controls, choose **Disconnect ring**. Its monitor status changes to disconnected; last-known values remain timestamped. Capture a moment or emergency while disconnected: it is visibly pending; an emergency explicitly says **NOT DELIVERED**.
8. Reconnect phone A. Its durable outbox retries original event IDs and timestamps. Receipt only becomes confirmed after SQLite persistence. If an acknowledgement was lost, retrying the same event returns the original receipt without duplicating history. The monitor labels delivery more than 5 seconds after capture as late.
9. Pause telemetry while keeping the socket connected. After `max(9 seconds, 2.5 × configured interval)` without a received sample, the monitor labels the signal stale. Resume to restore current status. Silent network failures trigger heartbeat timeout after approximately 16 seconds plus the heartbeat sweep; clients reconnect with bounded backoff.
10. Export the visible snapshot or **Complete server archive**. The latter includes all stored events, annotations and emergency actions, even beyond the recent UI window. The UI always includes unresolved emergencies in addition to up to 200 recent records.

## Persistence and limitations

- Server authority: SQLite at `data/zenit.sqlite` by default, overridable with `MISSION_DB_PATH`. Includes exclusive reservations, configs, events, annotations and last 120 samples per astronaut. Events are not deleted by the recent-history limit. Back up the SQLite database using an appropriate SQLite backup method. Docker uses `mission_data`; removing volumes deletes its contents.
- Phone storage: tab identity uses session storage; local storage holds the retry outbox, never the device-to-device transport. It survives reload in the same tab when storage works. Closing the tab loses its tab identity; reconnect from the same tab where possible. Storage failures show a warning: keep the page open until acknowledgements arrive. Server restart never turns an unconfirmed phone event into a delivery success.
- The application has no authentication, account permissions or flight-grade guarantees. Serve only to a trusted demonstration network. Do not enter real crew health information.
- Mobile browsers suspend timers/sockets when locked or backgrounded. No website can guarantee 3-second emission in that condition. The monitor exposes stale/disconnected state rather than fabricating readings. There is no installable offline app or cold-start cache.
- Device clocks should be synchronized; the monitor displays sender measurement/capture time and separate server receipt time. Server rejects timestamps more than one minute ahead. Heart rate, HRV, SpO₂, respiration and skin-temperature deviation are conceptual simulated metrics; skin deviation is not core temperature. No classifier infers symptoms or diagnoses.
- English interface copy preserves the existing product language. Original single-person demo remains `/legacy` with its previous browser session key. NASA Apollo 11 historical explorer remains `/archive`, separate from the fictional crew measurements.
- AI assisted software implementation. No AI model interprets crew health. The data and exports identify simulation explicitly.
# Additional demonstration: ring → suit → recovery

Open `/ring?astronaut=vega` and `/suit?astronaut=vega` in separate tabs or devices and link both. In the central monitor's **My health**, select **Spacewalk**. The primary source changes to **Suit ECG** and the suit atmosphere appears separately. The ring retains its own connection and data. Select **Recovery** to return to the ring, preserving the history and original source labels.

For the outage demo, leave the ring connected and press **Disconnect suit**. The monitor must show **No current primary signal**. The suit simulator continues local sampling every three seconds while visible. Press **Capture suit moment**, then **Connect suit**. The server confirms the original capture; open **Event log** to inspect its suit readings and annotate it. **Pause suit telemetry** demonstrates staleness while keeping the connection open. Ring gestures are still a cabin concept.

Open **NASA context** to inspect actual historical DosTel1 radiation observations from ISS Columbus. Move the historical observation slider, inspect the date, instrument and μGy/h value, and open the original API query. **Refresh NASA record** refreshes that historical window, not current mission conditions. If NASA is unavailable, the checked-in response remains labelled as saved. RadLab radiation is never assigned to an astronaut's personal dose or used to diagnose the recorded symptom.

Suit atmosphere field selection is linked to NASA-STD-3001 §11.3. The Apollo explorer remains a separate historical resource. No real suit, commercial wearable or life-support controller is connected.
