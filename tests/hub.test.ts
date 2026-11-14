import { afterEach, describe, expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { attachHub } from '../server/hub';
import { defaultConfig } from '../src/lib/crew/model';
import type { ServerMessage, MissionState } from '../src/lib/crew/types';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0).reverse()) await close();
});
async function fixture(path = ':memory:') {
  const http = createServer((_req, res) => res.end('ok'));
  const hub = attachHub(http, path, { heartbeatMs: 50, timeoutMs: 1000 });
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw Error('No port');
  cleanups.push(async () => {
    await hub.close();
    http.closeAllConnections();
    http.close();
  });
  return { hub, url: `ws://127.0.0.1:${address.port}/ws` };
}
async function client(
  url: string,
  role: 'ring' | 'monitor' | 'astronaut',
  deviceId: string,
  astronautId?: string,
) {
  const ws = new WebSocket(url);
  const messages: ServerMessage[] = [];
  ws.addEventListener('message', (event) => messages.push(JSON.parse(String(event.data))));
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  cleanups.push(async () => {
    ws.close();
  });
  const wait = async (predicate: (m: ServerMessage) => boolean) => {
    const end = Date.now() + 2500;
    while (Date.now() < end) {
      const i = messages.findIndex(predicate);
      if (i >= 0) return messages.splice(i, 1)[0];
      await Bun.sleep(5);
    }
    throw Error('Message timeout: ' + JSON.stringify(messages));
  };
  ws.send(
    JSON.stringify({ type: 'register', role, deviceId, astronautId, deviceName: 'Test ring' }),
  );
  return { ws, wait, send: (m: unknown) => ws.send(JSON.stringify(m)), messages };
}
const values = { pulse: 82, hrv: 45, spo2: 98, skin: 0.2, respiration: 16 };
const event = (id: string) => ({
  id,
  deviceId: 'ring-a',
  astronautId: 'vega',
  occurredAt: Date.now() - 120000,
  kind: 'emergency',
  gesture: 'swipe',
  snapshot: values,
  snapshotAt: Date.now() - 120000,
});

describe('shared WebSocket mission', () => {
  test('personal workspace scopes new health and phase commands to its astronaut', async () => {
    const { url, hub } = await fixture();
    const personal = await client(url, 'astronaut', 'personal-health', 'vega');
    await personal.wait((m) => m.type === 'registered');
    const input = {
      topic: 'recovery',
      feeling: 'changed',
      note: 'Personal check-in',
      eventId: null,
    };
    personal.send({ type: 'health-checkin', id: 'own-check', astronautId: 'vega', input });
    await personal.wait((m) => m.type === 'ack' && m.id === 'own-check');
    personal.send({
      type: 'health-step',
      id: 'own-step',
      astronautId: 'vega',
      checkId: 'own-check',
      step: 0,
      completed: true,
    });
    await personal.wait((m) => m.type === 'ack' && m.id === 'own-step');
    personal.send({
      type: 'health-followup',
      id: 'own-followup',
      astronautId: 'vega',
      checkId: 'own-check',
      outcome: 'same',
    });
    await personal.wait((m) => m.type === 'ack' && m.id === 'own-followup');
    personal.send({ type: 'phase', id: 'own-phase', astronautId: 'vega', phase: 'spacewalk' });
    await personal.wait((m) => m.type === 'ack' && m.id === 'own-phase');
    for (const command of [
      { type: 'health-checkin', id: 'foreign-check', astronautId: 'nova', input },
      {
        type: 'health-step',
        id: 'foreign-step',
        astronautId: 'nova',
        checkId: 'own-check',
        step: 0,
        completed: true,
      },
      {
        type: 'health-followup',
        id: 'foreign-followup',
        astronautId: 'nova',
        checkId: 'own-check',
        outcome: 'better',
      },
      { type: 'phase', id: 'foreign-phase', astronautId: 'nova', phase: 'spacewalk' },
      { type: 'release', id: 'foreign-release', astronautId: 'vega', sourceType: 'spacesuit' },
    ]) {
      personal.send(command);
      const response = await personal.wait((m) => m.type === 'error' && m.id === command.id);
      expect(response.type === 'error' && response.code).toBe('not-authorized');
    }
    const own = hub.snapshot().crew[0];
    expect(own.healthChecks).toHaveLength(1);
    expect(own.healthChecks[0].completedSteps).toEqual([0]);
    expect(own.healthChecks[0].followups).toHaveLength(1);
    expect(own.phase).toBe('spacewalk');
    expect(hub.snapshot().crew[1].healthChecks).toHaveLength(0);
    expect(
      personal.messages
        .filter((m) => m.type === 'state')
        .every(
          (m) => m.type === 'state' && m.state.crew.length === 1 && m.state.crew[0].id === 'vega',
        ),
    ).toBe(true);
  });

  test('personal monitors receive only the astronaut selected by their link', async () => {
    const { url } = await fixture();
    const personal = await client(url, 'astronaut', 'personal-vega', 'vega');
    await personal.wait((m) => m.type === 'registered');
    const first = await personal.wait((m) => m.type === 'state');
    expect(first.type === 'state' && first.state.crew.map((c) => c.id)).toEqual(['vega']);
    const ring = await client(url, 'ring', 'ring-a', 'vega');
    await ring.wait((m) => m.type === 'registered');
    const other = await client(url, 'ring', 'ring-b', 'nova');
    await other.wait((m) => m.type === 'registered');
    other.send({
      type: 'event',
      event: { ...event('nova-event'), astronautId: 'nova', deviceId: 'ring-b' },
    });
    await other.wait((m) => m.type === 'ack');
    ring.send({ type: 'event', event: event('vega-event') });
    await ring.wait((m) => m.type === 'ack');
    const update = await personal.wait(
      (m) => m.type === 'state' && m.state.events.some((e) => e.id === 'vega-event'),
    );
    expect(update.type === 'state' && update.state.events.map((e) => e.id)).toEqual(['vega-event']);
    expect(update.type === 'state' && update.state.crew.map((c) => c.id)).toEqual(['vega']);
  });
  test('a personal monitor cannot configure, annotate or release another astronaut', async () => {
    const { url, hub } = await fixture();
    const ring = await client(url, 'ring', 'ring-a', 'vega');
    await ring.wait((m) => m.type === 'registered');
    ring.send({ type: 'event', event: event('vega-event') });
    await ring.wait((m) => m.type === 'ack');
    const other = await client(url, 'astronaut', 'personal-nova', 'nova');
    await other.wait((m) => m.type === 'registered');
    other.send({
      type: 'annotate',
      id: 'wrong-note',
      eventId: 'vega-event',
      text: 'Wrong astronaut',
      createdAt: Date.now(),
    });
    await other.wait((m) => m.type === 'error');
    other.send({
      type: 'config',
      id: 'wrong-config',
      astronautId: 'vega',
      config: { ...defaultConfig, intervalMs: 1000 },
    });
    await other.wait((m) => m.type === 'error');
    other.send({ type: 'release', id: 'wrong-release', astronautId: 'vega' });
    await other.wait((m) => m.type === 'error');
    expect(hub.snapshot().events[0].annotations).toHaveLength(0);
    expect(hub.snapshot().crew[0].config.intervalMs).toBe(3000);
    other.send({
      type: 'config',
      id: 'own-config',
      astronautId: 'nova',
      config: { ...defaultConfig, intervalMs: 5000 },
    });
    await other.wait((m) => m.type === 'ack' && m.id === 'own-config');
    expect(hub.snapshot().crew[1].config.intervalMs).toBe(5000);
  });
  test('unknown astronaut links are rejected instead of defaulting to another crew member', async () => {
    const { url } = await fixture();
    const invalid = await client(url, 'astronaut', 'personal-invalid', 'unknown');
    const result = await invalid.wait((m) => m.type === 'error');
    expect(result.type === 'error' && result.code).toBe('unknown-astronaut');
  });
  test('an older unresolved emergency remains visible beyond the recent-history window', async () => {
    const { hub } = await fixture();
    const old = {
      ...event('old-emergency'),
      receivedAt: 1000,
      status: 'active',
      actions: [],
      annotations: [],
    } as const;
    hub.repository.saveEvent(structuredClone(old) as any);
    for (let i = 0; i < 205; i++)
      hub.repository.saveEvent({
        ...event(`moment-${i}`),
        kind: 'moment',
        gesture: 'double-tap',
        receivedAt: 2000 + i,
        status: 'active',
        annotations: [],
        actions: [],
      } as any);
    expect(hub.snapshot().events.some((e) => e.id === 'old-emergency')).toBe(true);
  });
  test('server restart preserves event evidence, configuration, notes and ring reservation', async () => {
    const path = join(tmpdir(), `zenit-restart-${crypto.randomUUID()}.sqlite`);
    cleanups.push(async () => {
      for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
    });
    const first = await fixture(path);
    const ring = await client(first.url, 'ring', 'ring-a', 'vega');
    await ring.wait((m) => m.type === 'registered');
    ring.send({ type: 'event', event: event('persistent') });
    await ring.wait((m) => m.type === 'ack');
    await first.hub.close();
    const second = await fixture(path);
    const saved = second.hub.snapshot();
    expect(saved.events[0].id).toBe('persistent');
    expect(saved.events[0].snapshot?.pulse).toBe(82);
    expect(saved.crew[0].deviceId).toBe('ring-a');
    expect(saved.crew[0].connected).toBe(false);
    const resumed = await client(second.url, 'ring', 'ring-a', 'vega');
    await resumed.wait((m) => m.type === 'registered');
    resumed.send({
      type: 'event',
      event: {
        ...event('persistent'),
        occurredAt: saved.events[0].occurredAt,
        snapshotAt: saved.events[0].snapshotAt,
      },
    });
    await resumed.wait((m) => m.type === 'ack');
    expect(second.hub.snapshot().events).toHaveLength(1);
  });
  test('multiple independent rings route their real telemetry to the right crew member', async () => {
    const { url } = await fixture();
    const monitor = await client(url, 'monitor', 'tablet');
    await monitor.wait((m) => m.type === 'registered');
    const a = await client(url, 'ring', 'ring-a', 'vega');
    const b = await client(url, 'ring', 'ring-b', 'nova');
    await a.wait((m) => m.type === 'registered');
    await b.wait((m) => m.type === 'registered');
    a.send({
      type: 'telemetry',
      id: 'sample-a',
      deviceId: 'ring-a',
      astronautId: 'vega',
      measuredAt: Date.now(),
      values,
    });
    b.send({
      type: 'telemetry',
      id: 'sample-b',
      deviceId: 'ring-b',
      astronautId: 'nova',
      measuredAt: Date.now(),
      values: { ...values, pulse: 91 },
    });
    const state = await monitor.wait(
      (m) =>
        m.type === 'state' &&
        m.state.crew.find((c) => c.id === 'nova')?.latest?.values.pulse === 91,
    );
    expect(
      state.type === 'state' && state.state.crew.find((c) => c.id === 'vega')?.latest?.values.pulse,
    ).toBe(82);
  });
  test('binding is exclusive, including while the original ring is offline', async () => {
    const { url } = await fixture();
    const a = await client(url, 'ring', 'ring-a', 'vega');
    await a.wait((m) => m.type === 'registered');
    const b = await client(url, 'ring', 'ring-b', 'vega');
    expect((await b.wait((m) => m.type === 'error')).type).toBe('error');
    a.ws.close();
    await Bun.sleep(30);
    const c = await client(url, 'ring', 'ring-c', 'vega');
    const error = await c.wait((m) => m.type === 'error');
    expect(error.type === 'error' && error.code).toBe('binding-conflict');
  });
  test('lost-ack retries preserve original snapshots and never duplicate an emergency', async () => {
    const { url, hub } = await fixture();
    const a = await client(url, 'ring', 'ring-a', 'vega');
    await a.wait((m) => m.type === 'registered');
    const e = event('emergency-1');
    a.send({ type: 'event', event: e });
    const ack = await a.wait((m) => m.type === 'ack' && m.id === e.id);
    a.send({ type: 'event', event: e });
    await a.wait((m) => m.type === 'ack' && m.id === e.id);
    const saved = hub.snapshot().events;
    expect(saved).toHaveLength(1);
    expect(saved[0].occurredAt).toBe(e.occurredAt);
    expect(saved[0].snapshot).toEqual(values);
    expect(ack.type === 'ack' && ack.receivedAt).toBeGreaterThan(e.occurredAt + 100000);
    a.send({ type: 'event', event: { ...e, snapshot: { ...values, pulse: 150 } } });
    const conflict = await a.wait((m) => m.type === 'error');
    expect(conflict.type === 'error' && conflict.code).toBe('id-conflict');
  });
  test('recognition, resolution and notes are independent persistent audit records', async () => {
    const { url, hub } = await fixture();
    const ring = await client(url, 'ring', 'ring-a', 'vega');
    await ring.wait((m) => m.type === 'registered');
    ring.send({ type: 'event', event: event('e') });
    await ring.wait((m) => m.type === 'ack');
    const monitor = await client(url, 'monitor', 'tablet');
    await monitor.wait((m) => m.type === 'registered');
    monitor.send({
      type: 'emergency-action',
      id: 'bad',
      eventId: 'e',
      action: 'resolved',
      note: 'Checked',
    });
    await monitor.wait((m) => m.type === 'error');
    expect(hub.snapshot().events[0].status).toBe('active');
    monitor.send({
      type: 'emergency-action',
      id: 'ack',
      eventId: 'e',
      action: 'acknowledged',
      note: '',
    });
    await monitor.wait((m) => m.type === 'ack');
    expect(hub.snapshot().events[0].status).toBe('acknowledged');
    monitor.send({
      type: 'annotate',
      id: 'note',
      eventId: 'e',
      text: 'Astronaut reports dizziness',
      createdAt: Date.now(),
    });
    await monitor.wait((m) => m.type === 'ack');
    monitor.send({
      type: 'emergency-action',
      id: 'resolve',
      eventId: 'e',
      action: 'resolved',
      note: 'Crew checked in; demonstration ended',
    });
    await monitor.wait((m) => m.type === 'ack');
    const e = hub.snapshot().events[0];
    expect(e.status).toBe('resolved');
    expect(e.actions).toHaveLength(2);
    expect(e.annotations[0].text).toContain('dizziness');
    expect(e.snapshot?.pulse).toBe(82);
  });
  test('configuration reaches only the actual target emitter and records application', async () => {
    const { url, hub } = await fixture();
    const ring = await client(url, 'ring', 'ring-a', 'vega');
    await ring.wait((m) => m.type === 'registered');
    const monitor = await client(url, 'monitor', 'tablet');
    await monitor.wait((m) => m.type === 'registered');
    monitor.send({
      type: 'config',
      id: 'config',
      astronautId: 'vega',
      config: { ...defaultConfig, intervalMs: 1000 },
    });
    const update = await ring.wait((m) => m.type === 'config');
    expect(update.type === 'config' && update.config.intervalMs).toBe(1000);
    ring.send({ type: 'config-applied', astronautId: 'vega', revision: 2 });
    await Bun.sleep(20);
    expect(hub.snapshot().crew[0].appliedRevision).toBe(2);
    expect(hub.snapshot().crew[1].config.intervalMs).toBe(3000);
  });
  test('rings cannot annotate or spoof another astronaut and malformed data is rejected', async () => {
    const { url, hub } = await fixture();
    const ring = await client(url, 'ring', 'ring-a', 'vega');
    await ring.wait((m) => m.type === 'registered');
    ring.send({
      type: 'telemetry',
      id: 'spoof',
      deviceId: 'ring-a',
      astronautId: 'nova',
      measuredAt: Date.now(),
      values,
    });
    await ring.wait((m) => m.type === 'error');
    ring.send({ type: 'annotate', id: 'note', eventId: 'x', text: 'spoof', createdAt: Date.now() });
    await ring.wait((m) => m.type === 'error');
    ring.send({
      type: 'telemetry',
      id: 'invalid',
      deviceId: 'ring-a',
      astronautId: 'vega',
      measuredAt: Date.now(),
      values: { ...values, spo2: 1000 },
    });
    await ring.wait((m) => m.type === 'error');
    expect(hub.snapshot().crew[0].latest).toBeNull();
  });
});
