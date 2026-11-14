---
name: ZENIT
description: An ink-blue mission timeline for astronaut health context and follow-up.
colors:
  bg: "#0a121c"
  panel: "#101d2b"
  line: "#293a4b"
  muted: "#a5b6c8"
  foreground: "#edf3fa"
  mint: "#87e2c2"
  violet: "#b9adf7"
  amber: "#f3c580"
  selected: "#142e32"
  rail: "#0d1723"
  navigation-active: "#1a3338"
  navigation-hover: "#162635"
  primary-ink: "#102d27"
  primary-hover: "#b1efda"
  secondary-surface: "#152331"
  secondary-foreground: "#e2eaf2"
  secondary-hover: "#223746"
  field-surface: "#0b1723"
  field-border: "#4b6075"
typography:
  display:
    fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(27px, 2.65vw, 40px)"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-.035em"
  headline:
    fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 550
    letterSpacing: "-.025em"
  title:
    fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  label:
    fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
  button:
    fontFamily: "'Segoe UI', ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  measurement:
    fontFamily: "ui-monospace, 'SFMono-Regular', Consolas, monospace"
    fontSize: "34px"
    fontWeight: 450
    lineHeight: 1.1
rounded:
  tag: "4px"
  field: "5px"
  button: "6px"
  navigation: "7px"
  panel: "14px"
spacing:
  tight: "8px"
  compact: "12px"
  regular: "16px"
  workspace: "18px"
  panel: "24px"
  section: "32px"
  desktop-gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 13px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-surface}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  button-text:
    textColor: "{colors.mint}"
    typography: "{typography.label}"
    padding: "5px 0"
  field:
    backgroundColor: "{colors.field-surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    padding: "9px 10px"
  navigation-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.mint}"
    rounded: "{rounded.navigation}"
    padding: "10px 12px"
  source-tag:
    textColor: "#c8d4e0"
    rounded: "{rounded.tag}"
    padding: "4px 7px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
  ring-pad:
    textColor: "{colors.mint}"
    width: "100%"
    padding: "0"
  observation:
    textColor: "{colors.foreground}"
    padding: "15px 18px 15px 0"
  moment-row:
    width: "100%"
    padding: "18px 0"
  phase-selected:
    backgroundColor: "{colors.selected}"
    padding: "10px 7px 8px"
---

# Design System: ZENIT

## Overview

**Creative North Star: "Ink-blue flight plan"**

ZENIT uses the confirmed ink-blue flight-plan aesthetic: a calm, compact operational workspace organized around mission time. The timeline, source labels, and ring capture control explain each reading in context. Capture saves a moment first; a symptom can be added later without rewriting the snapshot. All interface language is English.

Dark blue surfaces, thin rules, and restrained mint and violet signals create depth without shadows. System sans-serif text carries instructions; tabular monospace carries measurements and mission times. The NASA historical archive remains visibly separate from the personal simulation, even where it shares the same component vocabulary.

**Key Characteristics:**
- Mission timeline as the operational anchor.
- Mint ZENIT Ring cabin readings and violet suit readings, each paired with source text.
- Capture-first moments, one-tap context, and automatically populated measurement summaries.
- Flat, bordered panels and compact, legible operational typography.
- Responsive navigation, visible keyboard focus, and reduced-motion support.
- Explicit historical provenance and simulation labels.

## Colors

The palette combines dark ink-blue structure with measured, source-specific accents. Frontmatter values are normative and are extracted from `src/app.css`; names describe their existing roles.

### Primary
- **Cabin Mint (`mint`):** conceptual ZENIT Ring cabin traces and readings, the gesture pad, primary actions, active navigation, connected status, links, and keyboard focus. Its presence does not itself indicate a clinical assessment.
- **Primary Ink / Primary Hover:** dark text on the mint action and its lighter hover surface.

### Secondary
- **Suit Violet (`violet`):** simulated suit ECG and the separately labeled Apollo historical explorer. Shared hue does not imply shared data provenance.

### Tertiary
- **Pending Amber (`amber`):** pending delivery, interrupted connections, storage notices, and captured moments awaiting context. A moment’s context label changes to mint once annotated; its icon retains amber.

### Neutral
- **Background / Panel / Rail:** the page canvas, bounded work surfaces, and navigation surround.
- **Foreground / Muted:** primary information and supporting labels.
- **Line:** panel outlines, chart grids, and content dividers.
- **Selected:** selected timeline phase and its aligned plot region.
- **Navigation Active / Navigation Hover:** distinct interaction surfaces for the rail.
- **Secondary Surface / Secondary Foreground / Secondary Hover:** quieter utility actions.
- **Field Surface / Field Border:** inset data-entry controls.

**The Source Label Rule.** Source colors always have accompanying text; NASA historical observations and personal simulation remain explicitly identified.

## Typography

The operational interface uses the system sans stack in the frontmatter. There are no downloaded typefaces. Measurements and mission times use the tabular monospace stack; tabular numerals also stabilize count labels.

The display role belongs to page headings, headline to panel titles, title to subsection headings, and label to compact controls and metadata. Body paragraphs commonly use the documented body role; supporting descriptions also use smaller sizes. The largest live pulse uses the measurement role; the archive reading and mission clock use the same family at their own sizes.

The interface is deliberately compact: chart labels and provenance metadata range from (8–11px), body copy from (11–13px), and panel headings default to the headline token. On mobile, the page heading becomes (29px), then (25px) at the narrowest breakpoint. Source explanations cap their measure at (75ch). Observation values use tabular monospace at (21px), with (17px) values in compact groups; the regular values become (19px) at the narrowest breakpoint.

## Layout

The desktop shell has a (232px) navigation rail and a flexible main area. Main content is centered within (1560px), with the desktop gutter token and (32px) top padding. The top bar has a minimum height of (82px).

The mission workspace places a flexible timeline beside a (270px) ring capture panel, separated by the workspace spacing token. Phase controls align directly above the chart and share proportional time widths. The chart normally stands (225px) high. Connection states sit above it; automatically collected measurements, captured moments, connection controls, archive entry, provenance disclosure, and export follow below. The medical monitor expands inside the main flow, with separate reading and received-entry columns. Journal summaries and quick choices sit beside entry history in two columns; manual corrections remain inside disclosures. The archive pairs its plot with a (260px) context column.

Responsive behavior is implemented at these viewport widths:

- **At least 1550px:** the mission chart grows to (275px), and phase labels and panel descriptions gain size.
- **At most 1200px:** the rail narrows to (200px), main gutters to (24px), and ring capture column to (235px). Transport controls wrap; the secondary phase-state label disappears. The archive context column narrows to (220px).
- **At most 1000px:** the rail becomes (76px) with icon-only links that retain accessible names and titles. The archive becomes one main column with a two-column contextual summary below.
- **At most 760px:** navigation moves above the page into a horizontally scrollable labeled row. Main gutters become (18px). Timeline and ring capture stack; medical and journal content become single-column. The ring panel uses a flexible text column beside a (150px) pad column, with a (130px) ring graphic and wrapping action buttons below. Regular observations become two columns; compact observation groups retain their auto-fit grid. Moment detail loses its left indent. The archive summary also becomes one column.
- **At most 420px:** a compact crew-workspace label replaces breadcrumbs, heading and clock sizes shrink, chart gutters tighten, and the chart becomes (200px) high. The ring panel uses a (110px) pad column and graphic, with (20px 16px) padding and vertically stacked action buttons. Moment icons hide and row spacing tightens. Connection controls become full-width stacked buttons.

Observation groups normally use an auto-fit grid with (140px) minimum cells, or (130px) in compact groups, without gaps; thin top borders organize each value. Captured moment rows use full-width disclosure buttons with (18px) vertical padding and a (20px) gap.

The document supports a minimum viewport width of (320px). Only navigation and the received-entry log have intentional scrolling regions; the log caps its height at (400px).

## Elevation & Depth

Depth comes from tonal layering and thin borders. The implementation has no box-shadow vocabulary. A darker canvas and rail frame the lighter panels; inset field surfaces and selected phase fills explain hierarchy. Chart grid lines remain fine and quiet, while dashed boundaries and cursor lines distinguish time structure.

## Shapes

Panels use the largest rounded token; buttons, fields, navigation items, and tags use smaller, distinct corners from the frontmatter. Borders are generally (1px). Timeline phase controls keep square corners with a top rule and a small circular marker. Source legends use short horizontal strokes; plot cursors use circular points. Icons are simple outline SVGs.

## Components

### Buttons

Primary mint buttons carry the section's main action. Secondary outlined dark buttons handle capture with annotation, connection controls, monitor visibility, archive playback, source access, and one-tap symptom or journal choices. Quick-choice groups wrap with (9px) gaps; their hovered buttons gain mint borders and text. Text buttons handle tablet capture and export. Primary and secondary buttons use a (44px) minimum height, compact horizontal spacing, and the documented hover colors. Text buttons also retain a (44px) minimum height and underline on hover. Disabled buttons use (0.55) opacity and a wait cursor.

All focusable controls receive a (2px) mint focus outline with a (4px) offset. Button background transitions last (150ms) with ease-out timing. Reduced-motion preference removes transitions and smooth scrolling. No animation is required to understand state.

### Inputs / Fields

Text inputs, selects, and textareas use the field tokens, a (1px) border, a (44px) minimum height, and explicit labels. Placeholder text is muted; the caret is mint. Textareas resize vertically. The historical time slider is a separate native range control with a violet accent and a (30px) minimum height. It reports elapsed time and approximate pulse through its accessible value text; manual changes stop playback.

### Navigation

Desktop navigation uses muted labels and icons, with mint text and a tonal fill on the current page. The ordinary row minimum height is (47px). The NASA archive appears as a separately labeled module. Links keep accessible names when their visual text hides in the compact rail; mobile restores labels in a scrollable row.

### Source Tags and Connection States

Source tags are small outlined labels, not clickable filters. Historical tags use violet text and simulation tags use a neutral label. Connection states pair an icon with words; amber indicates interrupted connection states while mint indicates active states. Color never replaces the wording.

### Panels and Ring Capture

Panels use a thin shared border with no shadow. Heading insets are (23px 24px 0) on desktop and (20px 18px 0) on mobile. The ring panel has (23px 22px) padding, a compact two-line heading, and an explicit “Ring concept” tag.

The gesture pad is a transparent button with a (160px) outline ring graphic, a mint pulse stroke, and readable feedback. Its outer stroke brightens to mint on hover; during a hold, its thick inner stroke transitions to mint over (700ms) with linear timing. Reduced-motion preference removes that transition. A disconnected pad is disabled, uses muted text and (0.6) opacity, and says “Ring disconnected.”

Two taps less than (400ms) apart capture a moment. A (700ms) hold captures and opens symptom annotation. The pad also supports keyboard activation to capture; explicit “Capture moment” and “Capture & log symptom” buttons provide equivalent actions. Feedback resets after (2400ms). These are simulated cabin interactions, not a claim of real ring hardware recognition or glove compatibility.

### Captured Moments and Quick Context

A moment row shows its capture time, origin, reading availability, and context state. Its expanded detail shows the original snapshot and exposes one-tap symptom choices: no symptoms, fatigue, dizziness, headache, nausea, or pain. Only the user's selection names a symptom. An annotation keeps its own added time and delivery state; the captured readings stay immutable. A separate disclosure reveals captured measurements. Tablet capture remains available when the ring is disconnected and explicitly identifies the last known reading as not current. A separate disclosure then exposes the manual pulse or detailed symptom form as a fallback.

Rows use a transparent background with a subtle ink-blue hover fill, thin separators, and the shared focus outline. Context status changes from amber to mint when an annotation exists. Snapshot and symptom reception are stated separately, including whether a pending snapshot is saved locally or held only in the tab.

### Collected Measurements and Journals

Observation groups show a label, tabular value and unit, source, and measurement period. An unavailable measurement displays an em dash and “No current reading.” Current and spot readings show sample times; nightly summaries retain their own period rather than appearing live.

The collected-measurements board combines simulated current respiration/activity with preloaded nightly summaries. External blood pressure, glucose, body temperature, and SpO₂ appear in a separate disclosure with availability counts and a “Simulate instrument sync” action. Its note explicitly says no instruments are connected.

Sleep begins with an imported demo summary and quick choices for rested, sleepy, or difficulty concentrating. Wellbeing and nutrition also use one-tap reports, with available readings and timestamps attached automatically. Optional manual details or sleep-duration corrections sit behind disclosures; a form is not required for the default capture or quick-report path.

### Mission Timeline

The phase selector uses actual buttons with pressed state. Its selected fill continues into the corresponding plot region. ZENIT Ring cabin and suit ECG traces use separate colors, rounded (2px) strokes, explicit source text, and labeled times. Missing sensor samples create gaps; the current value becomes an em dash while the last known reading remains labeled. The chart's descriptive accessible label summarizes source and gap behavior.

### Archive and Medical Monitor

The historical explorer has a dedicated view, historical tag, approximate-value marker, NASA source link, and visible provenance. Its play/pause control and time slider update the activity beside the chart. The medical monitor identifies simulated reception, separates measured and received times, and freezes its last received reading during disconnection. It lists only received records, including captured moments and their separately received annotations; empty states explain the next action in plain English.

## Do's and Don'ts

### Do:
- Do pair source and connection colors with readable text.
- Do preserve gaps for missing samples and distinguish capture, annotation, and reception timestamps.
- Do keep source and measurement period visible for current, nightly, and external observations.
- Do retain clear English labels for simulation, historical observations, source, and delivery state.
- Do use the shared control shapes and visible mint keyboard focus.
- Do keep NASA provenance visible in the archive and separate historical observations from simulated personal readings.

### Don't:
- Don't imply diagnosis or personal health thresholds through color, scores, or archive readings.
- Don't join missing samples with a fabricated continuous trace.
- Don't infer a symptom from readings or overwrite an immutable snapshot when context arrives.
- Don't present mock instrument sync or simulated ring gestures as connected hardware.
- Don't use source color as the only way to identify cabin, suit, or historical data.
- Don't replace the documented flat surfaces with decorative shadows or unrelated display typography.
