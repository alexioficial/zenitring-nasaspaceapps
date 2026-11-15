# Taste Skill mobile redesign review

## Result

Applied Taste Skill 2.5.1 to the astronaut workspace: self-hosted Geist, white/ink/cobalt system, compact identity, four mobile destinations, independent source status, explanation/context/action, actual readings, records and device panels. The decorative astronaut no longer heads My health.

## Verification

- 84 tests passed; focused SSR and workflow tests passed again after the final changes.
- Svelte check: 0 errors, 0 warnings.
- Production build passed. Existing large-chunk warning remains.
- Source review found no critical or important regression.
- Taste screenshots inspected at 320, 390, 768, 820, 1024 and 1440px; records/devices/tools captured at 390px.
- Browser profile writes initially caused Vite reload storms. `.taste-skill` is now excluded from Vite watching and automatic source discovery; the finish gate was run against isolated production on port 3100.

## Taste finish gate

`GATE: OPEN 23 (rounds used up)`; this is not a PASS. No waivers or checker modifications were used.

The remaining findings apply promotional page rules to a working app: screen-height hero/sections, sales actions, proof facts, decorative visuals, staged moments and a prescribed section/grid outline. The assessment/readings split and compact disclosures are deliberate app layouts. Different h2 sizes distinguish the main assessment from the supporting instrument heading. The desktop flush finding measures the parallel columns as successive vertical sections. These findings are recorded below, without changing the interface into a promotional page.

The useful focus, contrast and tap-target findings were corrected. The standalone layout checker initially crashed (`undefined.map`); the final gate completed its layout and consistency passes.

## Open checker findings

- **hero-fill** (1440px): `main#crew-content > div.medbay-overview > section.mission-context` - the next section shows on the first screen: it starts at 249px on a 900px screen (the hero ends at 226px)
- **flush** (1440px): `div.medbay-assessment > section.automatic-health.health-insight > details.assessment-evidence > summary` - section.automatic-health.health-insight and section.medbay-telemetry run together: -361px between their content, on one ground
- **cta** (1440px): `main#crew-content > div.medbay-overview > section.medbay-heading` - the hero has no button (the nav's does not count)
- **cta** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - the last section before the footer ends with no button
- **copy-fact** (1440px): `main#crew-content > div.medbay-overview > section.medbay-heading > h1` - the first screen holds no number, price, date, place, platform or genre
- **heading-scale** (1440px): `div.medbay-console > div.medbay-assessment > section.automatic-health.health-insight > h2.assessment-title` - h2 headings in 2 sizes, 20px ("Your readings") to 32px (x1.60)
- **section-gaps** (1440px): `main#crew-content > div.medbay-overview > section.medbay-heading / main#crew-content > div.medbay-overview > section.mission-context` - 20px between these sections, -72% against the median 72px
- **hero-screen** (1440px): `main#crew-content > div.medbay-overview` - the hero ends at 1071px on a 900px screen, 171px below the fold: it ends at the fold, 1px either way (SR-1)
- **section-height** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - the section is 66px tall (0.1 screens), 834px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height** (1440px): `main#crew-content > footer.crew-footer` - the section is 72px tall (0.1 screens), 828px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height** (1440px): `main#crew-content > footer.crew-footer` - the section starts at 1169px, 269px below the screen grid (1 x 900px): sections start on whole screens (SR-2)
- **section-height** (1440px): `main#crew-content > div.medbay-overview` - the section starts at 186px, 186px below the screen grid (0 x 900px): sections start on whole screens (SR-2)
- **section-height** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - the section starts at 1071px, 171px below the screen grid (1 x 900px): sections start on whole screens (SR-2)
- **section-height** (1440px): `main#crew-content > footer.crew-footer` - the section's content does not fit it: its lowest content ends 70px below its top, past 0px (the section less 72px of bottom padding) (SR-2)
- **section-height** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - the section's content does not fit it: its lowest content ends 43px below its top, past -6px (the section less 72px of bottom padding) (SR-2)
- **section-air** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - the content fills 31.8% of the section's height (21 of 66px): 55% or more (40% WARN) (SR-3)
- **one-section** (1440px): `main#crew-content > footer.crew-footer` - the screen at scroll 389px (the top of section 2) shows 72px of section 3 and the content of 2 sections, over 24px each beside section 1: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-section** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - the screen at scroll 186px (the top of section 1) shows 15px of section 2 beside section 1: a screen shows one section (another may peek 8px, 24px WARN) (1 of 3 screens show a peek: two or more on a page of 8 sections or fewer FAIL) (SR-4)
- **one-section** (1440px): `main#crew-content > div.medbay-overview` - a <div> sits directly in <main>: every part of <main> is a <section> (SR-4)
- **one-section** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - a <details> sits directly in <main>: every part of <main> is a <section> (SR-4)
- **one-section** (1440px): `main#crew-content > footer.crew-footer` - a <footer> sits directly in <main>: every part of <main> is a <section> (SR-4)
- **one-heading** (1440px): `div.medbay-console > div.medbay-assessment > section.automatic-health.health-insight > h2.assessment-title` - the hero holds an h2 (2): its heading is the h1, and an h2 opens the next section (SR-5)
- **container-edges** (1440px): `main#crew-content > div.medbay-overview` - the section needs exactly one in-flow child .wrap (it has 4 in-flow children, 0 .wrap) (SR-6)
- **container-edges** (1440px): `main#crew-content > details.crew-disclosure.readings-guide` - the section needs exactly one in-flow child .wrap (it has 1 in-flow child, 0 .wrap) (SR-6)
- **container-edges** (1440px): `main#crew-content > footer.crew-footer` - the section needs exactly one in-flow child .wrap (it has 2 in-flow children, 0 .wrap) (SR-6)
- **container-edges** (1440px): `div.medbay-console > section.medbay-telemetry > div.medbay-vitals-heading > h2` - the h2 starts 696px right of the container's left: every h1 and h2 starts on it, 2px either way (SR-6)
- **container-edges** (1440px): `section.mission-context > div.mission-context-phase > div > strong` - 2 text blocks start on a left line at x 116, 36px from the container's left: text starts on the container's left, or on one split line (x 623, 732, 841) (also "Ring is primary") (SR-6)
- **split-pair** (1440px): `main#crew-content > div.medbay-overview > div.medbay-console` - the split's columns are off the page's one pair of lines: its right column starts at x 752, on none of the split lines 623 (k=5), 732 (k=6), 841 (k=7) (SR-8)
- **hero-fill** (390px): `div.medbay-overview > div.medbay-console > div.medbay-assessment > section.automatic-health.health-insight` - the next section shows on the first screen: it starts at 286px on a 844px screen (the hero ends at 262px)
- **no-visual** (390px): `div.medbay-overview > div.medbay-console > div.medbay-assessment > section.automatic-health.health-insight` - no picture, effect or mock in this section; a feature section needs a visual
- **no-visual** (390px): `main#crew-content > div.medbay-overview > div.medbay-console > section.medbay-telemetry` - no picture, effect or mock in this section; a feature section needs a visual
- **cta** (390px): `main#crew-content > div.medbay-overview > section.mission-context` - the hero has no button (the nav's does not count)
- **cta** (390px): `main#crew-content > details.crew-disclosure.readings-guide` - the last section before the footer ends with no button
- **heading-scale** (390px): `div.medbay-console > div.medbay-assessment > section.automatic-health.health-insight > h2.assessment-title` - h2 headings in 2 sizes, 20px ("Your readings") to 30px (x1.50)

Raw generated reports and captures remain in `.taste-skill/` (ignored as local tooling artifacts). No commit or deployment was performed.
