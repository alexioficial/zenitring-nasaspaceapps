# Health Monitoring Software: challenge alignment

The objective is astronaut self-assessment and understandable guidance toward care and health improvement. ZENIT opens on My health. Ring, suit and environmental data support the assessment; they are not the product's end goal.

| Challenge need                   | Implemented experience                                                                                                                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assess one's own health          | Choose activity/recovery, sleep/attention, wellbeing, or food/hydration; explicitly report feeling as usual, noticing a change, or needing help. No sensor is required to report a concern.                                                   |
| Use multiple input types         | Ring/suit snapshots, an optional note and simple choices. Existing captured moments can be attached without transcribing values.                                                                                                              |
| Explain why an indicator matters | A plain-language risk explanation and linked NASA source accompanies each next-step preview. Ring HRV does not infer mental state; atmosphere oxygen is not SpO₂.                                                                             |
| Guide action and improvement     | Educational next steps address context, an appropriate measurement, an assigned routine or crew medical review. The user can record completing a step. Treatment decisions refer to mission-approved procedures and the crew medical officer. |
| Recognize when to seek attention | An explicit request for help immediately prompts direct crew contact, including offline. Reported changes and demo-reference excursions prompt review; an apparently ordinary reading does not override the user's concern.                   |
| Follow the result                | Save a follow-up of better, same, worse or contacted crew. Worsening displays a help prompt. Completion or reported improvement does not grant medical/task clearance or close an emergency.                                                  |
| Space environments               | Cabin, Spacewalk and Recovery retain independent ring/suit provenance. Missing primary signals stay missing.                                                                                                                                  |
| Real NASA resources              | HRP/behavioral-health and NASA health/medical-operations references inform explanations. Apollo observations and RadLab radiation are explicitly separate historical resources.                                                               |

## Sources and boundaries

- NASA HRP sleep/circadian/workload risk: https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100
- NASA behavioral health risk: https://www.nasa.gov/directorates/esdmd/hhp/behavioral-health-risk/
- NASA fundamentals of human health, including exercise, nutrition and urinary health: https://www.nasa.gov/reference/fundamentals-of-human-health/
- NASA medical operations: https://www.nasa.gov/reference/6-0-medical-operations/

These sources supply risk and countermeasure context. The routing rules in `src/lib/crew/health.ts` are ZENIT-authored educational demo logic, not a NASA clinical decision algorithm. No diagnoses, medication regimens, physiological safety thresholds or readiness scores are generated. Mission medical procedures are referenced, not reproduced or claimed implemented. The prototype demonstrates the assess–understand–act–follow-up interaction; clinical deployment would require mission-specific, validated care pathways.

## Persistence and communication

Health check-ins are saved by the shared server under the selected astronaut. Each stores the explicit report, original source evidence (or no evidence), phase, guidance version/text, completed steps and timestamped follow-ups. Captured-event evidence must belong to the same astronaut. Commands use idempotent IDs. Saved check-ins and follow-ups are visible in the crew detail and included in exports.

Before saving, drafts persist in browser local storage per astronaut when available. Educational guidance works in an already-loaded page without a network connection. A draft is not shared until the user reconnects and saves it; no automatic medical alert or direct crew contact is implied. The demo shares saved notes with the crew monitor and does not implement private clinical records. Original gesture emergencies keep their independent acknowledgement/resolution flow.

## Demonstration

1. Open My health and choose Activity & recovery.
2. Select Something changed, add “Dizzy after activity,” and optionally attach a ring/suit captured moment.
3. Select Understand my signals. Inspect the explanation, why-it-matters source and concrete next steps.
4. Save the check-in, mark a step reported complete and record Feeling worse. Show the immediate direct-contact prompt.
5. Open astronaut detail in Crew monitor to see the report and follow-up. Reload to verify persistence.
6. Disconnect the monitor; preview another check-in and show that it is not shared. Reconnect to save explicitly.

## Evidence interpretation

The personal screen now answers **What might be happening?** and **What should I do next?** Optional symptom chips and activity context reduce typing. Selecting a symptom requests review even when the user also selects feeling as usual. Existing keyboard notes remain available and are not automatically diagnosed or classified.

A preview shows the attached ring or suit measurements and possible contributors, each with supporting context, missing information and a NASA reference. When there are at least three prior readings from the same device and mission phase within five minutes, it shows the pulse difference from their median. This recent comparison is not a personal clinical baseline. Old captures, stale measurements, future timestamps, missing sources and disconnected readings never receive a current comparison. Original measurement time remains visible.

New version 2 guides persist the interpretation together with the original evidence. The central monitor can expand the saved interpretation. Older version 1 records retain their original guidance and are not reinterpreted with today's data. Suit atmospheric context uses NASA's [suited atmosphere requirements, §11.3](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/); pressure and environmental oxygen/CO₂ are not blood measurements or a diagnosis.
