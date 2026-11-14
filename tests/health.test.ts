import { afterEach, expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { attachHub } from '../server/hub';
import { initialCrew } from '../src/lib/crew/model';
import {
  buildHealthGuide,
  healthEvidence,
  validHealthInput,
  type HealthInput,
} from '../src/lib/crew/health';
import type { CrewMember, ServerMessage } from '../src/lib/crew/types';

const checks: HealthInput = { topic: 'recovery', feeling: 'usual', note: '', eventId: null };
function currentCrew(): CrewMember {
  const member = initialCrew()[0];
  member.connected = true;
  member.deviceId = 'ring';
  member.latest = {
    id: 'reading',
    deviceId: 'ring',
    astronautId: 'vega',
    measuredAt: Date.now(),
    receivedAt: Date.now(),
    values: { pulse: 76, hrv: 45, spo2: 98, skin: 0.2, respiration: 15 },
  };
  return member;
}
test('explicit help and changed feelings override apparently unremarkable readings', () => {
  const member = currentCrew(),
    evidence = healthEvidence(member);
  expect(buildHealthGuide({ ...checks, feeling: 'help' }, member, evidence, Date.now()).level).toBe(
    'help',
  );
  expect(
    buildHealthGuide({ ...checks, feeling: 'changed' }, member, evidence, Date.now()).level,
  ).toBe('review');
  expect(buildHealthGuide(checks, member, evidence, Date.now()).explanation).toContain(
    'do not establish medical clearance',
  );
});
test('missing, disconnected, stale and historical evidence never produces current-health reassurance', () => {
  const member = currentCrew(),
    evidence = healthEvidence(member)!;
  expect(buildHealthGuide(checks, member, null, Date.now()).level).toBe('measurement');
  expect(buildHealthGuide(checks, member, evidence, Date.now(), false).level).toBe('measurement');
  expect(buildHealthGuide(checks, member, evidence, Date.now() + 20000).level).toBe('measurement');
  expect(
    buildHealthGuide(
      { ...checks, eventId: 'past' },
      member,
      { ...evidence, eventId: 'past' },
      Date.now(),
    ).explanation,
  ).toContain('saved moment');
  member.phase = 'spacewalk';
  expect(buildHealthGuide(checks, member, evidence, Date.now()).level).toBe('measurement');
});
test('demo excursions prompt context review without becoming a diagnosis or emergency', () => {
  const member = currentCrew();
  member.latest!.values.pulse = 140;
  const guide = buildHealthGuide(checks, member, healthEvidence(member), Date.now());
  expect(guide.level).toBe('review');
  expect(guide.explanation).toContain('not a clinical threshold or diagnosis');
});
test('manual input rejects unknown domains, missing choices and unbounded notes', () => {
  expect(validHealthInput(checks)).toBe(true);
  expect(validHealthInput({ ...checks, topic: '__proto__' })).toBe(false);
  expect(validHealthInput({ ...checks, feeling: null })).toBe(false);
  expect(validHealthInput({ ...checks, note: 'a'.repeat(501) })).toBe(false);
});

test('quick symptoms are validated and cannot be dismissed by feeling as usual', () => {
  expect(validHealthInput({ ...checks, symptoms: ['dizzy'], activity: 'after-exercise' })).toBe(
    true,
  );
  for (const symptoms of [['unknown'], ['dizzy', 'dizzy'], 'dizzy', null])
    expect(validHealthInput({ ...checks, symptoms })).toBe(false);
  expect(validHealthInput({ ...checks, activity: 'unknown' })).toBe(false);
  const member = currentCrew();
  expect(
    buildHealthGuide({ ...checks, symptoms: ['dizzy'] }, member, healthEvidence(member), Date.now())
      .level,
  ).toBe('review');
});
test('reactive sensor values can be captured without retaining the mutable reading', () => {
  const member = currentCrew();
  member.latest!.values = new Proxy(member.latest!.values, {});
  const evidence = healthEvidence(member)!;
  member.latest!.values.pulse = 160;
  expect(evidence.values.pulse).toBe(76);
  expect(structuredClone(evidence).values.pulse).toBe(76);
});
test('recent pulse comparison uses the same device and phase without calling it a clinical baseline', () => {
  const member = currentCrew(),
    now = member.latest!.measuredAt;
  member.latest!.values.pulse = 106;
  member.samples = [72, 76, 80].map((pulse, i) => ({
    ...member.latest!,
    id: `prior-${i}`,
    measuredAt: now - (3 - i) * 3000,
    receivedAt: now - (3 - i) * 3000,
    values: { ...member.latest!.values, pulse },
  }));
  const assess = () =>
    buildHealthGuide(
      { ...checks, activity: 'after-exercise', symptoms: ['dizzy'] },
      member,
      healthEvidence(member),
      now,
    ).assessment;
  expect(assess()?.comparison).toMatchObject({ reference: 76, delta: 30, count: 3 });
  expect(assess()?.possibilities.some((p) => p.id === 'activity')).toBe(true);
  member.phaseHistory = [{ phase: 'cabin', changedAt: now - 4000 }];
  expect(assess()?.comparison).toBeNull();
  member.phaseHistory = [];
  member.samples[0].deviceId = 'other-ring';
  expect(assess()?.comparison).toBeNull();
});
test('late arrivals, offline, historical and wrong-source evidence cannot produce a current comparison', () => {
  const member = currentCrew(),
    now = member.latest!.measuredAt,
    evidence = healthEvidence(member)!;
  for (const ev of [
    { ...evidence, measuredAt: now - 60000 },
    { ...evidence, measuredAt: now + 60000 },
    {
      ...evidence,
      source: 'spacesuit' as const,
      values: { pulse: 76, pressure: 30, ppO2: 28.8, ppCO2: 0.32, temperature: 22, battery: 90 },
    },
  ]) {
    const guide = buildHealthGuide(checks, member, ev, now);
    expect(guide.level).toBe('measurement');
    expect(guide.assessment?.status).not.toBe('current');
    expect(guide.assessment?.comparison).toBeNull();
  }
  expect(buildHealthGuide(checks, member, evidence, now, false).assessment?.status).toBe(
    'historical',
  );
  const saved = buildHealthGuide(
    { ...checks, eventId: 'captured' },
    member,
    { ...evidence, eventId: 'captured' },
    now,
  ).assessment;
  expect(saved?.status).toBe('historical');
  expect(saved?.comparison).toBeNull();
  expect(buildHealthGuide(checks, member, null, now).assessment?.status).toBe('unavailable');
});
test('suit assessment keeps atmosphere separate from personal measurements and supplies its NASA source', () => {
  const member = currentCrew(),
    now = member.latest!.measuredAt;
  member.phase = 'spacewalk';
  member.suit.connected = true;
  member.suit.deviceId = 'suit';
  member.suit.latest = {
    id: 's1',
    deviceId: 'suit',
    astronautId: 'vega',
    sourceType: 'spacesuit',
    measuredAt: now,
    receivedAt: now,
    values: { pulse: 100, pressure: 30, ppO2: 28.8, ppCO2: 0.32, temperature: 22, battery: 90 },
  };
  const guide = buildHealthGuide(
    { ...checks, symptoms: ['headache'] },
    member,
    healthEvidence(member),
    now,
  );
  expect(guide.level).toBe('review');
  expect(guide.assessment?.status).toBe('current');
  expect(guide.assessment?.possibilities.find((p) => p.id === 'environment')?.source).toBe(
    'https://www.nasa.gov/reference/11-0-spacesuits-vol-2/',
  );
  expect(guide.assessment?.facts.join(' ')).toContain('28.80 kPa');
  expect(guide.assessment?.missing.join(' ')).toContain('blood oxygen');
});

const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
async function fixture() {
  const server = createServer(),
    hub = attachHub(server, ':memory:', { heartbeatMs: 100, timeoutMs: 2000 });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error();
  cleanups.push(async () => {
    await hub.close();
    server.closeAllConnections();
    server.close();
  });
  async function client(role: 'monitor' | 'ring', deviceId: string) {
    const ws = new WebSocket(
        `ws://127.0.0.1:${address && typeof address !== 'string' ? address.port : 0}/ws`,
      ),
      messages: ServerMessage[] = [];
    ws.addEventListener('message', (e) => messages.push(JSON.parse(String(e.data))));
    await new Promise<void>((resolve) =>
      ws.addEventListener('open', () => resolve(), { once: true }),
    );
    ws.send(JSON.stringify({ type: 'register', role, deviceId, astronautId: 'vega' }));
    const wait = async (type: ServerMessage['type']) => {
      const end = Date.now() + 2000;
      while (Date.now() < end) {
        const i = messages.findIndex((m) => m.type === type);
        if (i >= 0) return messages.splice(i, 1)[0];
        await Bun.sleep(5);
      }
      throw Error('Timeout');
    };
    await wait('registered');
    cleanups.push(() => {
      ws.close();
    });
    return { send: (message: unknown) => ws.send(JSON.stringify(message)), wait };
  }
  return { hub, client };
}
test('check-in saves immutable event evidence, retries once, records steps and worsening without resolving emergencies', async () => {
  const { hub, client } = await fixture();
  const monitor = await client('monitor', 'tablet'),
    ring = await client('ring', 'ring');
  const capturedAt = Date.now() - 60000;
  ring.send({
    type: 'event',
    event: {
      id: 'captured',
      deviceId: 'ring',
      astronautId: 'vega',
      occurredAt: capturedAt,
      kind: 'emergency',
      gesture: 'swipe',
      snapshot: currentCrew().latest!.values,
      snapshotAt: capturedAt,
    },
  });
  await ring.wait('ack');
  const request = {
    type: 'health-checkin',
    id: 'health-1',
    astronautId: 'vega',
    input: {
      ...checks,
      feeling: 'changed',
      symptoms: ['dizzy'],
      activity: 'after-exercise',
      eventId: 'captured',
      note: 'Dizzy after activity',
    },
  };
  monitor.send(request);
  await monitor.wait('ack');
  monitor.send(request);
  await monitor.wait('ack');
  let saved = hub.snapshot().crew[0].healthChecks;
  expect(saved).toHaveLength(1);
  expect(saved[0].evidence?.measuredAt).toBe(capturedAt);
  expect(saved[0].input.note).toBe('Dizzy after activity');
  expect(saved[0].guide.assessment?.status).toBe('historical');
  expect(saved[0].input.symptoms).toEqual(['dizzy']);
  const originalAssessment = structuredClone(saved[0].guide.assessment);
  monitor.send({
    type: 'health-step',
    id: 'step-1',
    astronautId: 'vega',
    checkId: 'health-1',
    step: 0,
    completed: true,
  });
  await monitor.wait('ack');
  monitor.send({
    type: 'health-followup',
    id: 'follow-1',
    astronautId: 'vega',
    checkId: 'health-1',
    outcome: 'worse',
  });
  await monitor.wait('ack');
  saved = hub.repository.crew()[0].healthChecks;
  expect(saved[0].completedSteps).toEqual([0]);
  expect(saved[0].followups[0].outcome).toBe('worse');
  expect(hub.snapshot().events[0].status).toBe('active');
  expect(saved[0].evidence?.measuredAt).toBe(capturedAt);
  expect(saved[0].guide.assessment).toEqual(originalAssessment);
});
test('check-ins cannot attach another astronaut evidence or accept device-authored care actions', async () => {
  const { hub, client } = await fixture();
  const monitor = await client('monitor', 'tablet'),
    ring = await client('ring', 'ring');
  hub.repository.saveEvent({
    id: 'nova-event',
    deviceId: 'nova-ring',
    astronautId: 'nova',
    occurredAt: Date.now(),
    receivedAt: Date.now(),
    kind: 'moment',
    gesture: 'button',
    snapshot: null,
    snapshotAt: null,
    status: 'active',
    annotations: [],
    actions: [],
  });
  monitor.send({
    type: 'health-checkin',
    id: 'spoof',
    astronautId: 'vega',
    input: { ...checks, eventId: 'nova-event' },
  });
  await monitor.wait('error');
  ring.send({ type: 'health-checkin', id: 'device-care', astronautId: 'vega', input: checks });
  await ring.wait('error');
  expect(hub.snapshot().crew[0].healthChecks).toHaveLength(0);
});
