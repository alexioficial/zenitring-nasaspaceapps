import { describe, expect, test } from 'bun:test';
import {
  createMission,
  tick,
  setMonitor,
  addEntry,
  captureMoment,
  annotateMoment,
  syncDemoInstruments,
  restoreMission,
} from '../src/lib/mission';

import type { Entry } from '../src/lib/mission';

const report: Pick<Entry, 'kind' | 'summary' | 'notes' | 'manualPulse'> = {
  kind: 'recovery',
  summary: 'Fatigue',
  notes: 'After the spacewalk',
  manualPulse: null,
};

describe('independent telemetry failures', () => {
  test('samples keep arriving locally while the remote reading stays frozen', () => {
    const initial = createMission();
    const next = tick(tick(initial));
    expect(next.latest.time).toBe(1804);
    expect(next.samples).toHaveLength(2);
    expect(next.remote).toEqual(initial.remote);
    expect(initial.samples).toHaveLength(0);
  });
  test('strap dropout creates a real sample gap and does not invent new readings', () => {
    let mission = tick(createMission());
    const last = mission.latest;
    mission = tick(tick({ ...mission, sensorConnected: false }));
    expect(mission.latest).toEqual(last);
    expect(mission.samples).toHaveLength(1);
    mission = tick({ ...mission, sensorConnected: true });
    expect(mission.samples[1].time - mission.samples[0].time).toBe(6);
  });
  test('reconnect delivers each report once with original evidence and timestamp', () => {
    let mission = addEntry(createMission(), report, 'report-1');
    const evidence = { ...mission.entries[0].reading };
    mission = tick(tick(mission));
    mission = setMonitor(mission, true);
    expect(mission.entries[0].time).toBe(1800);
    expect(mission.entries[0].receivedAt).toBe(1804);
    expect(mission.entries[0].reading).toEqual(evidence);
    mission = setMonitor(tick(setMonitor(mission, false)), true);
    expect(mission.entries).toHaveLength(1);
    expect(mission.entries[0].receivedAt).toBe(1804);
  });
  test('manual readings remain distinct from missing wearable data', () => {
    const mission = addEntry(
      { ...createMission(), sensorConnected: false },
      { ...report, manualPulse: 88 },
      'manual-1',
    );
    expect(mission.entries[0].manualPulse).toBe(88);
    expect(mission.entries[0].sensorConnected).toBe(false);
    expect(mission.latest.pulse).toBe(86);
    expect(restoreMission(JSON.stringify(mission))).toEqual(mission);
  });
});

describe('gesture capture and deferred context', () => {
  test('a gesture captures readings without inventing symptoms', () => {
    const captured = captureMoment(createMission(), 'moment-1', 'ring-double-tap');
    expect(captured.entries[0].kind).toBe('moment');
    expect(captured.entries[0].summary).toBe('Moment captured');
    expect(captured.entries[0].origin).toBe('ring-double-tap');
    expect(captured.entries[0].observations?.find((o) => o.id === 'pressure')?.available).toBe(
      false,
    );
  });
  test('later symptom uses the captured evidence, with a separate annotation time', () => {
    let mission = captureMoment(createMission(), 'moment-1', 'ring-hold');
    const snapshot = JSON.stringify(mission.entries[0]);
    mission = syncDemoInstruments(tick(tick(mission)));
    mission = annotateMoment(mission, 'moment-1', 'Dizziness', 'symptom-1');
    expect(mission.entries[1].time).toBe(1800);
    expect(mission.entries[1].recordedAt).toBe(1804);
    expect(mission.entries[1].reading).toEqual(mission.entries[0].reading);
    expect(mission.entries[1].observations).toEqual(mission.entries[0].observations);
    expect(JSON.stringify(mission.entries[0])).toBe(snapshot);
    expect(mission.entries[1].observations?.find((o) => o.id === 'pressure')?.available).toBe(
      false,
    );
    expect(mission.observations.find((o) => o.id === 'pressure')?.available).toBe(true);
  });
  test('offline classification does not change what the medical monitor already received', () => {
    let mission = captureMoment(setMonitor(createMission(), true), 'moment-1', 'ring-hold');
    mission = annotateMoment(tick(setMonitor(mission, false)), 'moment-1', 'Fatigue', 'symptom-1');
    expect(mission.entries.filter((e) => e.receivedAt !== null)).toHaveLength(1);
    expect(mission.entries[0].summary).toBe('Moment captured');
    expect(mission.entries[1].receivedAt).toBeNull();
    mission = setMonitor(mission, true);
    expect(mission.entries[1].receivedAt).toBe(1802);
    expect(mission.entries[1].time).toBe(1800);
  });
  test('disconnected ring cannot send a gesture; tablet capture marks missing signals', () => {
    const mission = { ...createMission(), sensorConnected: false };
    expect(captureMoment(mission, 'ring', 'ring-double-tap').entries).toHaveLength(0);
    const tablet = captureMoment(mission, 'tablet', 'screen');
    expect(tablet.entries[0].sensorConnected).toBe(false);
    expect(tablet.entries[0].observations?.find((o) => o.id === 'respiration')?.available).toBe(
      false,
    );
    expect(tablet.entries[0].observations?.find((o) => o.id === 'sleep')?.available).toBe(true);
  });
  test('gestures and symptoms remain idempotent across duplicate input and storage', () => {
    let mission = captureMoment(createMission(), 'moment-1', 'ring-double-tap');
    mission = captureMoment(mission, 'moment-1', 'ring-hold');
    expect(mission.entries[0].origin).toBe('ring-double-tap');
    mission = annotateMoment(mission, 'moment-1', 'Fatigue', 'symptom-1');
    mission = annotateMoment(mission, 'moment-1', 'Dizziness', 'symptom-2');
    expect(mission.entries).toHaveLength(2);
    expect(restoreMission(JSON.stringify(mission))).toEqual(mission);
  });
  test('older saved entries keep their original sensor provenance', () => {
    const legacy = addEntry(createMission(), report, 'legacy') as Record<string, unknown>;
    delete legacy.observations;
    const entries = legacy.entries as Entry[];
    entries[0].reading.source = 'Chest strap';
    delete entries[0].observations;
    const restored = restoreMission(JSON.stringify(legacy));
    expect(restored?.observations).toEqual([]);
    expect(restored?.entries[0].reading.source).toBe('Chest strap');
  });
});

describe('device persistence and report validation', () => {
  test('pending reports survive serialization and are delivered after restoring', () => {
    const pending = addEntry(createMission(), report, 'saved-1');
    const restored = restoreMission(JSON.stringify(pending));
    if (!restored) throw new Error('Expected a restored mission');
    expect(restored.entries[0].receivedAt).toBeNull();
    expect(setMonitor(restored, true).entries[0].time).toBe(1800);
  });
  test('corrupt, partial, and invalid nested state is rejected', () => {
    expect(restoreMission('{')).toBeNull();
    expect(restoreMission('{}')).toBeNull();
    expect(restoreMission(JSON.stringify({ ...createMission(), entries: [{}] }))).toBeNull();
    expect(
      restoreMission(JSON.stringify({ ...createMission(), latest: { pulse: -1 } })),
    ).toBeNull();
  });
  test('blank reports and impossible manual values are rejected', () => {
    expect(() => addEntry(createMission(), { ...report, summary: '   ' }, '1')).toThrow();
    expect(() => addEntry(createMission(), { ...report, manualPulse: 0 }, '1')).toThrow();
    expect(() => addEntry(createMission(), { ...report, manualPulse: 301 }, '1')).toThrow();
  });
  test('duplicate report ids do not duplicate delivery', () => {
    const first = addEntry(createMission(), report, 'same-id');
    expect(addEntry(first, report, 'same-id').entries).toHaveLength(1);
  });
});
