---
name: ZENIT Mission Desk
colors:
  background: '#ffffff'
  surface: '#f4f4f4'
  ink: '#111111'
  muted: '#626262'
  action: '#1a4be0'
  line: '#e2e2e2'
  attention: '#865718'
  emergency: '#a62e32'
typography:
  interface:
    fontFamily: 'Geist, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.65
  heading:
    fontFamily: 'Geist, system-ui, sans-serif'
    fontSize: '32px'
    fontWeight: 500
    letterSpacing: '-0.035em'
  measurement:
    fontFamily: 'Geist, system-ui, sans-serif'
    fontSize: '38px'
    fontWeight: 500
  metadata:
    fontFamily: 'Geist, system-ui, sans-serif'
    fontSize: '13px'
  technical:
    fontFamily: 'Geist Mono, ui-monospace, monospace'
    fontSize: '13px'
  inherited:
    fontFamily: 'Manrope, Segoe UI, sans-serif'
    fontSize: '14px'
rounded:
  control: '8px'
  panel: '12px'
spacing:
  tight: '8px'
  control: '12px'
  group: '16px'
  panel: '24px'
  section: '32px'
  split: '64px'
---

# ZENIT Mission Desk

The user rejected the previous illustrated Orbital medbay treatment as still looking AI-generated and explicitly requested Taste Skill. The astronaut workspace now follows the skill's white-link-blue palette and Geist pairing. Its subject is the functioning health interface: measured evidence, source reception and the next action. Decorative astronaut imagery is retained only on other existing surfaces, not in My health.

## Scope and authority

`src/lib/crew/taste-workspace.css` is the current astronaut workspace system, loaded after the inherited styles; `taste-surfaces.css` carries the same vocabulary into every other screen an astronaut can reach: Signal details, NASA resources, Simulation settings, event cards, the check-in plan, the ring and suit simulators and the research replay. Both are scoped to `.astronaut-workspace`, which those pages add to their root, so the shell, header, buttons, readings panel and disclosures are identical wherever the astronaut is. The simulators reuse the My health readings panel (`medbay-telemetry`, `medbay-vitals`) instead of drawing their own. A destination is titled with the label the astronaut tapped to reach it (Signal details, NASA resources, Simulation settings, Research scenarios). The role chooser, crew monitor and archive routes retain their existing identity unless specifically addressed; the inherited Manrope and utility monospace remain legitimate there. This revision supersedes the earlier pinned three-column astronaut image composition for the astronaut workspace, following the user's rejection.

## Product layout

- A white header identifies ZENIT, the astronaut and the current role. Switch view remains named and keyboard accessible, with an icon-only presentation on narrow screens.
- Health, Records, Devices and Tools are stable destinations. On phones the four items sit in a full-width bottom bar; content and focus reserve space for it. URLs, browser history and reload preserve the selected view.
- Mission context is a plain source ledger: current phase, selected primary source and independent Ring, Suit and Crew link reception. A connected source never stands for a health verdict.
- Health uses a two-column assessment/readings split on desktop. At 700px and below the assessment precedes the instrument table. The assessment gives an explanation, actual comparison evidence, contextual question and next action. No placeholder readings or health scores are introduced.
- The instrument table has two columns of labelled values and units on one neutral surface. Retained values have explicit freshness metadata. Trend and phase controls disclose when requested. Phase changes never generate readings or substitute sources during an outage.
- A new check-in opens from the assessment action. The form's draft, server-confirmed save and follow-up behavior are preserved. Records combines saved check-ins and captures chronologically and restores focus when moving between an entry and its report.
- Devices gives each independent source a connection panel and a real simulator link. Tools contains signal details, NASA resources, simulation settings, research scenarios and the session export. A linked device shows its state instead of a second launch button, then one action leads back to Health.
- The first visit to an astronaut link lands on Devices (a per-astronaut cookie, decided on the server so Health never flashes); later visits open Health.
- Less to read: with no readings, Health shows a single action to link the source rather than a table of dashes. The primary source in the status row is a shortcut to Devices until it receives, and the Devices tab carries a dot while nothing is linked. The simulated-data statement appears once at the top and once in the footer, not inside every panel.

## Type, color and interaction

Geist is self-hosted with its OFL license. Headings use medium weight and tight tracking; readable body text is 16px, metadata 13px, and measurements use tabular figures. One blue marks primary actions and focus; neutral type carries the interface. Attention and emergency colors retain their semantic role and always accompany text.

Controls share 8px corners and at least 44px touch height. Hover/press feedback is restrained, and the assessment enters once with a 220ms settling movement. Reduced motion removes animation. Numerical readings never animate through invented values; no decorative scroll scenes or marketing proof counters are added to an operating medical-demo interface.

## Evidence boundaries

Fictional ring and suit telemetry, Gemini provenance and historical NASA data remain explicitly labelled. Blood SpO2 is separate from suit oxygen pressure; skin deviation is not core temperature. Missing and stale sources suppress current interpretation. Explicit symptoms and suit alerts retain priority. Saving a record requires the existing server acknowledgement; asking for help does not call the crew.

## Verification

Use the existing domain and SSR tests, Svelte diagnostics, production build and real browser captures. Taste Skill's promotional-site checker can flag page-height and sales-hero requirements that do not apply to this operating workspace; those are reported rather than implemented at the expense of the user's UX.
