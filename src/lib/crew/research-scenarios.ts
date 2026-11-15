import { initialCrew } from './model';
import type { CrewMember } from './types';
import type { AutomaticAssessment } from './automatic';

export const researchScenarios = [
  {
    id: 'steady',
    title: 'Steady signals',
    expected: 'no-pattern',
    description:
      'A short stable series. Expected: observe, without declaring the astronaut healthy.',
  },
  {
    id: 'spike',
    title: 'One isolated spike',
    expected: 'no-pattern',
    description:
      'One high pulse reading among otherwise stable values. Expected: no persistent-change interpretation.',
  },
  {
    id: 'recovery',
    title: 'Persistent pulse rise',
    expected: 'pulse-rise',
    description:
      'Three higher pulse readings after six earlier readings. Expected: ask whether activity has ended; do not infer symptoms.',
  },
  {
    id: 'combined',
    title: 'Several signals change',
    expected: 'multi-signal',
    description:
      'Pulse and breathing rate rise while SpO₂ falls. Expected: flag a pattern, ask about measurement/context; no disease label.',
  },
  {
    id: 'suit',
    title: 'Suit atmosphere change',
    expected: 'suit-change',
    description:
      'Environmental CO₂ changes in a simulated suit. Expected: distinguish atmosphere from personal vital signs and ask about suit alerts.',
  },
  {
    id: 'dropout',
    title: 'Signal lost',
    expected: 'no-data',
    description:
      'The source is no longer connected. Expected: withhold current interpretation, retaining source and timestamp.',
  },
] as const;
export type ResearchScenario = (typeof researchScenarios)[number]['id'];
export function scenarioCrew(id: ResearchScenario, now: number, readings = 9): CrewMember {
  const c = initialCrew()[0];
  c.id = 'research';
  c.name = 'Synthetic astronaut';
  c.callsign = 'DEMO';
  c.deviceId = 'research-ring';
  c.connected = id !== 'dropout';
  c.phase = id === 'suit' ? 'spacewalk' : 'cabin';
  const count = Math.min(9, Math.max(0, Math.floor(readings)));
  for (let i = 0; i < count; i++) {
    const changed = i >= 6,
      measuredAt = now - (count - i - 1) * 3000;
    c.samples.push({
      id: `r-${i}`,
      deviceId: 'research-ring',
      astronautId: c.id,
      measuredAt,
      receivedAt: measuredAt,
      values: {
        pulse:
          (id === 'recovery' || id === 'combined') && changed
            ? 105
            : id === 'spike' && i === 7
              ? 150
              : 75,
        spo2: id === 'combined' && changed ? 95 : 98,
        respiration: id === 'combined' && changed ? 20 : 14,
        hrv: 50,
        skin: 0.1,
      },
    });
    c.suit.samples.push({
      id: `s-${i}`,
      deviceId: 'research-suit',
      astronautId: c.id,
      measuredAt,
      receivedAt: measuredAt,
      sourceType: 'spacesuit',
      values: {
        pulse: 94,
        pressure: 30,
        ppO2: 28.8,
        ppCO2: changed ? 0.55 : 0.3,
        temperature: 22,
        battery: 90,
      },
    });
  }
  c.latest = c.samples.at(-1) ?? null;
  c.suit.latest = c.suit.samples.at(-1) ?? null;
  c.suit.deviceId = 'research-suit';
  c.suit.connected = id === 'suit';
  return c;
}
export function expectedKind(id: ResearchScenario): AutomaticAssessment['kind'] {
  return researchScenarios.find((s) => s.id === id)!.expected;
}
