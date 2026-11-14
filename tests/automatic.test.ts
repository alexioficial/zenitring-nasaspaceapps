import { expect, test } from 'bun:test';
import { initialCrew } from '../src/lib/crew/model';
import * as automatic from '../src/lib/crew/automatic';
import { researchScenarios, scenarioCrew } from '../src/lib/crew/research-scenarios';

const now = 1700000000000;
function ring(pulses: number[]) {
  const c = initialCrew()[0];
  c.deviceId = 'test-ring';
  c.connected = true;
  c.samples = pulses.map((pulse, i) => ({
    id: `s-${i}`,
    deviceId: 'test-ring',
    astronautId: c.id,
    measuredAt: now - (pulses.length - i - 1) * 3000,
    receivedAt: now - (pulses.length - i - 1) * 3000,
    values: { pulse, spo2: 98, respiration: 14, hrv: 50, skin: 0.1 },
  }));
  c.latest = c.samples.at(-1)!;
  return c;
}
test('a persistent pulse change is found before the astronaut enters any symptoms', () => {
  const c = ring([74, 76, 75, 73, 77, 75, 105, 106, 104]);
  const result = automatic.analyzeSignals(c, now);
  expect(result.kind).toBe('pulse-rise');
  expect(result.state).toBe('review');
  expect(result.observations.find((o) => o.metric === 'pulse')).toMatchObject({
    earlier: 75,
    recent: 105,
    delta: 30,
  });
  expect(result.question).toBe('activity');
  expect(c.healthChecks).toHaveLength(0);
});
test('one spike does not become a persistent episode and stable readings do not grant clearance', () => {
  expect(automatic.analyzeSignals(ring([75, 75, 75, 75, 75, 75, 75, 150, 75]), now).state).toBe(
    'observing',
  );
  expect(automatic.analyzeSignals(ring(Array(9).fill(75)), now).kind).toBe('no-pattern');
});
test('missing, stale, offline and future readings suppress automatic interpretation', () => {
  const c = ring([75, 75, 75, 75, 75, 75, 105, 105, 105]);
  expect(automatic.analyzeSignals(c, now + 30000).state).toBe('unavailable');
  expect(automatic.analyzeSignals(c, now, false).state).toBe('unavailable');
  expect(automatic.analyzeSignals(c, now - 1000).state).toBe('unavailable');
  c.phase = 'spacewalk';
  expect(automatic.analyzeSignals(c, now).state).toBe('unavailable');
});
test('device changes, phase changes and sample gaps reset the comparison', () => {
  const c = ring([75, 75, 75, 75, 75, 75, 105, 105, 105]);
  c.samples[0].deviceId = 'other';
  expect(automatic.analyzeSignals(c, now).state).toBe('collecting');
  c.samples[0].deviceId = 'test-ring';
  c.phaseHistory = [{ phase: 'cabin', changedAt: now - 9000 }];
  expect(automatic.analyzeSignals(c, now).state).toBe('collecting');
  c.phaseHistory = [];
  for (const s of c.samples.slice(0, 6)) {
    s.measuredAt -= 30000;
    s.receivedAt -= 30000;
  }
  expect(automatic.analyzeSignals(c, now).state).toBe('collecting');
});
test('research scenarios satisfy the predefined expected detector outcomes', () => {
  for (const scenario of researchScenarios) {
    const result = automatic.analyzeSignals(scenarioCrew(scenario.id, now), now);
    expect(result.kind).toBe(scenario.expected);
  }
});
test('a reported symptom or suit alert takes priority over contextual explanations', () => {
  const result = automatic.analyzeSignals(scenarioCrew('recovery', now), now);
  expect(automatic.contextualize(result, 'unwell').help).toBe(true);
  expect(automatic.contextualize(result, 'alert').help).toBe(true);
  expect(automatic.contextualize(result, 'finished').help).toBe(false);
  expect(automatic.contextualize(result, 'resting').explanation).toContain('No recent exercise');
});
