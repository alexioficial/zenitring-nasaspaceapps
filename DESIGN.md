# ZENIT · Shared mission instrument

## Direction

An operational crew manifest, rather than a grid of interchangeable cards. The signature is an asymmetric landscape composition: a full-width instrument row for each astronaut, with a quieter mission-activity rail. Detail opens deliberately and preserves input during signal updates. The phone reduces the same identity to one astronaut, one signal summary and a generous gesture surface.

The source of truth for the current implementation is `src/lib/crew/crew.css`. Previous dark personal-demo styling remains in `src/app.css` for `/legacy` and `/archive`; its documentation is archived in `docs/LEGACY-DESIGN.md`.

## Tokens

| Role | Color | Purpose |
| --- | --- | --- |
| Instrument ink | `#102332` | Mission frame, primary text, primary controls |
| Signal paper | `#eef2ef` | Quiet working field |
| Instrument white | `#ffffff` | Measurement and editing surfaces |
| Muted ink | `#526772` | Secondary labels and provenance |
| Navigation cyan | `#236c80` | Selection, focus, actual traces |
| Reference amber | `#8b5b13` | Presentation excursions and stale-signal explanation |
| Emergency vermilion | `#b33231` | Explicit emergency gestures and response |

No gradients, glass surfaces, neon effects, decorative starfields or continuous animations. Crew insignias identify call signs; their colors are identity markers, not health scores.

## Typography and layout

System sans (`Segoe UI`, system UI) for body and restrained display typography; system monospace for measured values, reception time and source identifiers. No remote font dependency. Page headings scale from 32–49 px; values 26–40 px; working text 13–15 px, with smaller utility labels. Crew rows use semantic groupings for identity, signal state, principal measurements and reception time. Detailed charts carry units, measured UTC endpoints and real sample gaps.

At desktop width the manifest shares the workspace with a 285–320 px activity rail. At tablet widths the rail moves below the manifest. At phone widths a manifest row reorganizes into identity/state beside the principal value and reception time. Astronaut detail retains the latest measurement and its age. Event details and editable forms are keyed by record ID, not recreated on telemetry ticks.

## Hierarchy and interaction

1. Open emergencies are in a sticky cross-view strip, with astronaut call sign and active/acknowledged wording.
2. Crew overview differentiates current, waiting, stale, disconnected and unlinked states.
3. Biometrics and trends are secondary to identity and receipt age. Out-of-reference values are explicitly demo references.
4. Original gesture evidence, later annotations and emergency transitions form a chronological record.
5. Linking and source configuration are separate views; simulation controls do not look like operational response actions.

Buttons and inputs generally have at least 44–46 px interaction height. All controls have visible keyboard focus and textual names. Reduced-motion preference removes transitions. Transitions are limited to brief interaction feedback. No automatic scrolling or navigation on a new signal. Clipboard unavailability on LAN HTTP provides a visible copyable URL.

## Phone surface

The ring has a dark tactile field with a restrained elliptical device outline, large enough for an intentional 110 px horizontal swipe. Only the gesture region disables page scrolling/zoom; the rest of the document remains a normal mobile page. Double tap captures a moment. Deliberate swipe activates an emergency. Movement consumes pending tap state; cancellation/multi-touch clears it; cooldown suppresses duplicates. Explicit test buttons and keyboard capture remain available.

Detection, pending transmission and confirmed server receipt are different states. A pending emergency has an explicit **NOT DELIVERED** notice. Optional vibration is supplementary; no meaning depends on haptics or color alone.

## Sources and limits

All biometric values, differences between crew and scenarios are fictional. Source and measurement/reception times are displayed separately. Skin deviation is not core/body temperature. HRV does not infer mood or readiness. An emergency is an explicit astronaut gesture, not an algorithmic diagnosis. Apollo observations have their own historical archive and provenance.
