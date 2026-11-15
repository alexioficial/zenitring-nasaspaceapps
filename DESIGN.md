---
name: ZENIT · Orbital medbay
description: A bright mission health workspace that keeps the astronaut, evidence and next step together.
colors:
  clinical-teal: '#126f80'
  teal-hover: '#0a5969'
  mission-navy: '#142b39'
  ceramic-white: '#ffffff'
  blue-gray-field: '#f1f5f8'
  muted-blue: '#4c6474'
  structural-line: '#cbd8e2'
  panel-line: '#b9cbd6'
  overview-field: '#f8fbfc'
  overview-panel: 'rgb(255 255 255 / 94%)'
  phase-active: '#167d8c'
  phase-hover: '#106b79'
  context-tint: '#d8e9ee'
  context-hover: '#c5dfe6'
  review-tint: '#fcebd3'
  review-marker: '#e39623'
  focus-teal: '#16899b'
  active-tint: '#e3f0f3'
  next-step-tint: '#e5f1f4'
  phase-track: '#dce8ee'
  attention-amber: '#865718'
  simulation-tint: '#faefd9'
  simulation-ink: '#77511a'
  emergency-red: '#a62e32'
  help-tint: '#fcebee'
  help-ink: '#82272c'
  ring-trace: '#2a7883'
  suit-trace: '#976037'
typography:
  display:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: 'clamp(44px, 4.5vw, 64px)'
    fontWeight: 750
    lineHeight: 1.06
    letterSpacing: '-0.035em'
  headline:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: 'clamp(40px, 3.65vw, 58px)'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '-0.035em'
  title:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: 'clamp(25px, 2vw, 32px)'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '-0.035em'
  body:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: '14px'
    lineHeight: 1.65
  measurement:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: 'clamp(29px, 2.6vw, 42px)'
    fontWeight: 800
    lineHeight: 1
    letterSpacing: '-0.025em'
  control:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: '13px'
    fontWeight: 650
  provenance:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: '10px'
    lineHeight: 1.6
rounded:
  label: '6px'
  control: '8px'
  source-badge: '10px'
  panel: '12px'
spacing:
  small: '8px'
  compact: '12px'
  medium: '16px'
  overview-gap: '18px'
  gutter: '20px'
  panel: '22px'
  section: '24px'
  desktop-edge: '30px'
components:
  button-primary:
    backgroundColor: '{colors.clinical-teal}'
    textColor: '{colors.ceramic-white}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '11px 17px'
  button-primary-hover:
    backgroundColor: '{colors.teal-hover}'
  button-secondary:
    backgroundColor: '{colors.ceramic-white}'
    textColor: '#183b4a'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '11px 17px'
  button-secondary-hover:
    backgroundColor: '#e7f1f5'
  button-danger:
    backgroundColor: '{colors.emergency-red}'
    textColor: '{colors.ceramic-white}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: '11px 17px'
  button-inline:
    backgroundColor: 'transparent'
    textColor: '{colors.clinical-teal}'
    padding: '8px 0'
  field:
    backgroundColor: '{colors.ceramic-white}'
    textColor: '{colors.mission-navy}'
    rounded: '{rounded.control}'
    padding: '11px 12px'
  navigation-active:
    backgroundColor: '{colors.active-tint}'
    textColor: '{colors.clinical-teal}'
    padding: '0 22px'
  simulation-label:
    backgroundColor: '{colors.simulation-tint}'
    textColor: '{colors.simulation-ink}'
    rounded: '{rounded.label}'
    padding: '7px 11px'
  telemetry-panel:
    backgroundColor: '{colors.overview-panel}'
    textColor: '{colors.mission-navy}'
    rounded: '{rounded.panel}'
    padding: '18px 20px'
  phase-selected:
    backgroundColor: '{colors.phase-active}'
    textColor: '{colors.ceramic-white}'
    padding: '7px 24px'
  activity-context:
    backgroundColor: '{colors.context-tint}'
    textColor: '#173b4b'
    rounded: '{rounded.control}'
    padding: '12px 14px'
  assessment-next:
    backgroundColor: '{colors.next-step-tint}'
    rounded: '{rounded.control}'
    padding: '12px 14px'
---

# Design System: ZENIT · Orbital medbay

## Overview

**Creative North Star: "Orbital medbay"**

A bright orbital medical station makes the astronaut, measurements and next action readable together. Ceramic white working surfaces sit on a cool blue-gray field within a navy mission frame. Teal provides clinical control and source emphasis; amber calls for review; red identifies explicit emergency or help states. The large photoreal fictional astronaut with a gold visor fills a bright cabin scene and anchors identity; its AI-generated provenance is kept in the image’s JSON sidecar.

The workspace is calm, precise and human-centered. Structured measurement rows and a contextual assessment share space without becoming an interchangeable card grid. English labels keep the current role, astronaut identity, simulation, source and reception state explicit. NASA historical evidence remains visibly separate from current fictional crew telemetry.

**Key Characteristics:**

- Ceramic white surfaces, navy framing, quiet borders and gently rounded controls.
- Self-hosted Manrope for headings, large tabular measurements and overview chart labels; restrained utility monospace elsewhere.
- Integrated readings and trend at left, the cabin astronaut at center and actionable assessment at right.
- An icon-led chevron phase track that names the primary device without inventing readings.
- Visible provenance, keyboard focus, touch-comfortable controls and reduced motion.

The primary visual authority is the user-pinned `.impeccable/mocks/decision/user-pinned-medbay.png`. The implementation follows `src/lib/crew/medbay-reference.css`, layered after `medbay.css`, `crew.css`, `sources.css` and component styles; `.impeccable/review/reference-viewport.png` records the implemented reference viewport. The user explicitly rejected the earlier detached-trend composition. This replaces the previous paper-manifest identity. Archive routes retain their own historical styling. Tokens above are normative; component-specific exceptions and responsive values below describe the current implementation. The chosen surface contract lives in `.impeccable/surfaces/src-lib-components-crew-personalhealth-svelte.md`. The approved exact images govern this redesign. Code-led execution was chosen for this redesign only; the future default remains comp.

## Colors

Cool medical neutrals carry the workspace; restrained colored surfaces convey interaction, provenance and attention.

### Primary

Clinical teal marks primary actions, navigation and icons; the selected chevron uses the phase-active teal. The darker teal is primary hover feedback; focus teal is a visible keyboard outline. Ring traces use their own teal source color with a text legend.

### Secondary

Attention amber supports review and stale-signal explanation. The warm simulation label identifies fictional data. Suit traces use a warm brown source color, never an alert meaning. Emergency red and the pale help surface are reserved for explicit emergency/help messaging, with readable labels.

### Neutral

Mission navy supplies text and the role header. Ceramic white carries editing surfaces; overview panels use 94% white over a near-white field and cabin image. The blue-gray field remains on supporting screens; muted blue labels provenance; structural and panel lines define groups. Teal-tinted navigation and next-step surfaces distinguish state without decorative elevation.

**The Source Label Rule.** Color accompanies readable source and status text; connection health never stands in for astronaut health.

## Typography

**Display and body font:** Manrope, with Segoe UI and sans-serif fallbacks. The variable font is self-hosted at `/fonts/manrope.ttf`, covers weights 200–800 and uses `font-display: swap`; no remote font service is required. Tabular numerals apply across the medbay.

The rounded, open letterforms soften the precision of the mission frame. Bold headings and readings establish hierarchy; smaller source labels remain subordinate to values and instructions.

- **Display:** The presentation landing uses a surface-specific Manrope display size (`clamp(52px, 5.4vw, 78px)`, 1.05 line height), 56px at its tablet breakpoint and `clamp(47px, 10vw, 64px)` at 700px and below. This is a landing override, not a change to the workspace type tokens.
- **Headline:** My health uses the headline token, reducing to 36px at 650px and below.
- **Title:** Telemetry and assessment headings use the title token. The review title uses a bold 27px desktop treatment with an amber marker.
- **Body:** Supporting prose remains compact; the primary interpretation is 14px with 1.6 line height; source and provider metadata remain subordinate.
- **Measurement:** Manrope tabular values use the measurement token, 14–19px units and a vertical divider before the value. Tablet values are 29px; phone values are 32px; the six-row desktop suit view uses 32px values. HRV remains a compact secondary ring reading.
- **Control and provenance:** Semibold actions; compact, regular source/timing annotations. Overview chart labels use 17 SVG viewBox units in Manrope, increasing to 30 units on phones (roughly 13–17 rendered pixels). Some inherited mission timestamps and phase sublabels retain utility monospace; large readings do not.

**The Evidence Time Rule.** Measurement time, reception age and historical observation time remain distinct; missing samples and source changes break the trace.

## Layout

The desktop navy header is a single line: ZENIT / Space health monitor, Astronaut view, astronaut identity and Switch view. Personal navigation contains My health, My records and My devices; simulation/concept labels and More share the strip. Crew monitor retains its separate multi-person manifest and activity rail. Role choice happens before entering either workspace; simulator links open separately where needed to preserve telemetry.

The shared workspace container is capped at 1640px. The astronaut workspace uses 12px vertical and 18px horizontal content padding, increasing to 18px by 14px on phones.

The presentation landing at `/` extends the same identity with a white sticky header and a split text-and-astronaut opening. Its hero is capped at 1376px, narrative sections at 1240px and demo entry at 1040px. The context example, research stories and role selector use paired columns that stack at 700px and below. Navy communication bands alternate with white narrative sections and a pale demo-entry field. Landing styling lives separately in `src/lib/landing.css`; its generous presentation spacing does not change workspace density.

Above 1100px, My health places integrated telemetry and measured-time history at left, the large gold-visor astronaut at center and assessment at right, using `minmax(0, 1.16fr) minmax(0, 1fr) minmax(0, 1fr)` with an 18px gap. The cabin raster extends behind the central scene with a soft masked edge. The scene starts near the title and extends to the phase track; its 640px by 960px image is deliberately cropped in a minimum-610px figure. Source badges sit at its upper right. Four primary ring rows plus compact HRV, or six suit rows, share the left panel with the trend. The continuous icon-led phase track spans the base. Expanded evidence and answers may increase height; no fixed viewport-fit guarantee is implied.

From 651px through 1100px the top row has two columns: the cabin scene at left (at least 330px high) and assessment at right. Integrated telemetry spans both columns on the second row, followed by phases. At 650px and below the order is scene, assessment, integrated telemetry, then phases; the cabin scene is 300px high. The three phase chevrons remain adjacent with vertically arranged icons and labels. Navigation wraps for phone width. Follow-up and learning content becomes a single column.

Reports, saved check-ins, learning and full mission-source details follow the overview. Keep the specific personal composition scoped to My health; it is not a required grid for every screen.

## Elevation & Depth

The medbay uses white and tinted surfaces, thin borders and the navy frame for depth. Working panels have no decorative drop shadow. The luminous cabin raster and its masked edges supply scene depth; these photographic transitions are not decorative UI gradients. Existing exceptions are functional: the sticky emergency strip has a hard lower edge (`0 2px 0 #711a19`), an emergency manifest row has an inset red marker, and successful copy feedback briefly expands a ring. These are state indicators, not a general card-elevation system.

**The Flat Surface Rule.** Use tonal separation and thin borders for working surfaces; reserve existing shadow feedback for explicit state changes.

Button background feedback lasts 150ms; phase background feedback lasts 180ms with ease-out. Copy confirmation is brief and event-driven. Reduced-motion preference removes transitions and animations. Do not auto-scroll or navigate when a new signal arrives.

## Shapes

White working panels and menus use 12px corners; buttons and fields use 8px, while overview source badges use 10px. The phase track uses interlocking clipped chevrons with 12px outer corners. Each chevron’s solid body (between its notch and point) has the same width, and its icon and labels are centred in that body rather than in the clipped box. Simulation labels and Switch view use 6px corners; inherited smaller provenance tags remain compact. Thin borders group content, while horizontal rules separate measurement rows. The astronaut silhouette supplies the expressive form; the interface stays quiet and geometric. Source insignias identify people and devices, not health scores.

## Components

### Project landing

The landing reuses the fictional astronaut raster and the existing ring renderer, with concept provenance visible. A compact header keeps Explore the demo available while scrolling to the identity and role selector at `#choose-view`. The illustrative context interaction uses three text buttons with explicit pressed states and a polite announcement of the changed explanation; its fictional readings stay fixed. Research links, prototype scope and connected-demo setup remain visually distinct from the example. Primary landing actions are 50px high, compact header and context controls at least 44px, with a 3px teal focus outline offset by 5px. This presentation surface retains the medbay palette and shapes without imposing its composition on My health.

### Buttons

Teal primary controls commit or open the next action; white bordered secondary controls support it. Both have a 46px minimum height and use the control token. Primary hover darkens teal; secondary hover adds a pale blue tint. Danger controls use emergency red. Inline evidence actions use a 44px minimum height generally; the compact overview detail action uses 32px. Add activity context is a full-width 48px pale-teal action with pen and arrow icons, and opens the existing check-in form. The inherited subtle variant has its background and foreground overridden by the medbay primary rule; do not assume it remains a ghost control.

Keyboard focus uses a 3px teal outline with a 4px offset. Disabled controls reduce opacity to 0.5 and cannot be operated. Active and selected controls use explicit ARIA state; color alone is insufficient.

### Chips and source badges

The warm Simulated health data label is noninteractive. White source badges pair a simple line icon with a Ring, Suit or Crew link label and independent connection text. Receiving, awaiting readings, stale readings and no current signal are distinct. The overview hides the individual figure caption and shows no scene credit below the phase track; the image’s AI-generated provenance stays in `static/images/medbay-astronaut.webp.json`. The navigation shows a concept label where space allows.

### Cards and telemetry

Telemetry and assessment use 94% white backgrounds, quiet borders, 12px corners and 18px by 20px padding, becoming 18px on phones. Telemetry uses a semantic definition list: icon and source-labelled name at left, tabular value and units at right. Ring biometrics and suit equipment/atmosphere are separate data models. Show an em dash for absent readings; show last-known/unavailable wording when freshness is lost. Measured time and reception age appear below the readings. Heart-rate history stays in this same panel, with source legends and actual measured-time endpoints. Four large ring rows show heart rate, SpO₂, respiration and skin deviation; HRV is secondary. The suit view retains all six equipment/atmosphere metrics.

### Inputs and fields

White inputs, selects and textareas have a muted blue border, 8px corners, 15px text, 11px by 12px padding and a 46px minimum height. Keep persistent labels, visible keyboard focus, meaningful placeholder text and explicit feedback. On LAN HTTP, clipboard failure leaves a visible copyable URL.

### Navigation

The personal tab strip is white. Above 1100px its buttons are at least 60px tall with 19px semibold labels and 25px horizontal padding; on phones they are 52px tall with 12px labels and 8px horizontal padding. The current tab uses a pale teal background, teal text and a teal lower border. More opens a bordered white menu. The shared role header keeps identity and Switch view distinct from device status; connection detail may hide at the tablet breakpoint, while source state remains in the content.

### Phase control and measured-time trend

Three adjacent icon-led chevron actions name Cabin, Spacewalk and Recovery and the associated source. Current phase / Change phase text remains available to assistive technology. Selected phase is teal; inactive chevrons are pale blue-gray. Desktop buttons are at least 59px tall; phones use 84px to stack the icon, name and source. Focus is inset so the clipping preserves it. Cabin is a phase, not a sensor. Controls disable while offline or saving. Changes alter phase/source selection and history without generating measurements.

The integrated left-panel trend uses actual measurement times, UTC-labelled endpoints, second-precision axis labels for intervals under five minutes, source-colored traces with a quiet area fill, phase markers and a timestamped phase legend. Missing samples and source/phase changes interrupt lines. Empty history explains how to link a simulator; another device never fills the gap.

### Assessment and next step

The right panel leads with **What’s happening?**, with a truthful Gemini or Built-in explanation label. Its visible sequence is **What changed** (earlier and recent medians), **What it could mean** (plain-language interpretation and relevant uncertainty), and **What to do now**. The interpretation never requires opening a disclosure. Review titles retain the warm tint and amber edge. Initial context answers form a compact two-column group; a confirmed answer replaces the group with a Change answer control. Local rules own the next action, independently of the model.

Record how I feel opens the actual check-in form. Context answers affect the current explanation; they do not silently save a medical record or send an emergency. Explicit symptoms and suit alerts take priority over AI and reassuring-looking numbers. Loading and provider failures keep the built-in explanation readable and state its origin. Missing or old readings suppress the previous interpretation.

A contextual NASA summary and source link stay visible. Readings, sources & explanation details expands the full observations, comparison method, source relevance and AI provenance. The NASA data in this demo strip separately opens the historical RadLab explorer: original observation dates and instruments remain explicit, with no personal-dose or symptom-causation claim.

### Crew, emergency and gesture continuity

Crew monitor preserves identity, signal state, principal readings and reception age in full-width rows, with a quieter activity rail. Emergency active/acknowledged/resolved states remain textual and auditable; the sticky cross-view emergency strip stays prominent. Phone gesture input keeps its dark tactile ring surface, double-tap capture, deliberate swipe emergency and keyboard/test alternatives. Detection, pending transmission and confirmed receipt remain distinct; pending emergencies retain NOT DELIVERED. Only the gesture region suppresses normal page gestures. Haptics supplement visible feedback.

NASA RadLab and Apollo history retain historical labels, observation times, instruments, units and provenance. Their warm contextual treatment does not imply live personal exposure. Refresh time never replaces observation time.

## Do's and Don'ts

### Do:

- Do preserve the pinned composition: integrated left-panel readings and trend, cabin astronaut, right-panel assessment and base chevrons.
- Do keep the astronaut role and identity visible, with Switch view returning to the chooser.
- Do preserve source names, units, measurement time and reception age beside evidence.
- Do keep ring, suit and crew-link connection states independent.
- Do show missing values as unavailable and retain gaps at missing samples and phase changes.
- Do pair status colors with text, visible focus and reduced-motion support.
- Do label fictional health data and historical NASA observations explicitly; keep AI-generated imagery provenance in its JSON sidecar.
- Do preserve drafts and expanded details during telemetry updates; keep original captures separate from later annotations.

### Don't:

- Don't treat a connected device, an ordinary reading or a demo reference range as medical clearance.
- Don't call Cabin a sensor, substitute another device during an outage or invent a reading when phase changes.
- Don't equate suit oxygen pressure with blood SpO₂, skin deviation with core temperature or HRV with mood/readiness.
- Don't present NASA history as personal exposure or source links as validation of an AI interpretation.
- Don't use decorative gradients, glass, neon, starfields or continuous animation in the medbay workspace.
- Don't hide simulation or delivery state, or make simulator actions resemble operational emergency responses.
