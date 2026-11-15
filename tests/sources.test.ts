import { afterEach, expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { attachHub } from '../server/hub';
import { Repository } from '../server/repository';
import { initialCrew, freshness } from '../src/lib/crew/model';
import { activeSource, simulateSuit } from '../src/lib/crew/suit';
import { SuitClient } from '../src/lib/crew/suit-client';
import type { ClientMessage, ServerMessage } from '../src/lib/crew/types';

const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
const until = async (check: () => boolean) => {
  const end = Date.now() + 2500;
  while (Date.now() < end) {
    if (check()) return;
    await Bun.sleep(10);
  }
  throw Error('Timed out');
};
async function fixture() {
  const server = createServer();
  const hub = attachHub(server, ':memory:', { heartbeatMs: 100, timeoutMs: 2000 });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error();
  cleanups.push(async () => {
    await hub.close();
    server.closeAllConnections();
    server.close();
  });
  const url = `ws://127.0.0.1:${address.port}/ws`;
  async function connect(
    role: 'ring' | 'spacesuit' | 'monitor',
    deviceId: string,
    astronautId = 'vega',
  ) {
    const ws = new WebSocket(url);
    const messages: ServerMessage[] = [];
    ws.addEventListener('message', (e) => messages.push(JSON.parse(String(e.data))));
    await new Promise<void>((resolve) =>
      ws.addEventListener('open', () => resolve(), { once: true }),
    );
    ws.send(JSON.stringify({ type: 'register', role, deviceId, astronautId }));
    const wait = async (type: ServerMessage['type']) => {
      await until(() => messages.some((m) => m.type === type));
      const index = messages.findIndex((m) => m.type === type);
      return messages.splice(index, 1)[0];
    };
    cleanups.push(() => {
      ws.close();
    });
    return { ws, messages, wait, send: (m: unknown) => ws.send(JSON.stringify(m)) };
  }
  return { hub, url, connect };
}
const ringValues = { pulse: 75, hrv: 50, spo2: 98, skin: 0.1, respiration: 15 };

test('one astronaut receives independent ring and suit signals; suit outage never falls back to the ring', async () => {
  const { hub, connect } = await fixture();
  const ring = await connect('ring', 'ring');
  await ring.wait('registered');
  const suit = await connect('spacesuit', 'suit');
  await suit.wait('registered');
  ring.send({
    type: 'telemetry',
    id: 'r',
    deviceId: 'ring',
    astronautId: 'vega',
    measuredAt: Date.now(),
    values: ringValues,
  });
  suit.send({
    type: 'telemetry',
    sourceType: 'spacesuit',
    id: 's',
    deviceId: 'suit',
    astronautId: 'vega',
    measuredAt: Date.now(),
    values: simulateSuit(0),
  });
  await until(() => !!hub.snapshot().crew[0].suit.latest && !!hub.snapshot().crew[0].latest);
  const monitor = await connect('monitor', 'monitor');
  await monitor.wait('registered');
  const phase: ClientMessage = {
    type: 'phase',
    id: 'phase',
    astronautId: 'vega',
    phase: 'spacewalk',
  };
  monitor.send(phase);
  await monitor.wait('ack');
  monitor.send(phase);
  await monitor.wait('ack');
  expect(hub.snapshot().crew[0].phaseHistory).toHaveLength(1);
  suit.ws.close();
  await until(() => !hub.snapshot().crew[0].suit.connected);
  const crew = hub.snapshot().crew[0];
  expect(crew.connected).toBe(true);
  expect(crew.latest?.values.pulse).toBe(75);
  const primary = activeSource(crew);
  expect(primary.type).toBe('spacesuit');
  expect(primary.latest?.values.pulse).toBe(94);
  expect(freshness(primary.connected, primary.latest!.receivedAt, 3000)).toBe('offline');
  monitor.send({ type: 'phase', id: 'return', astronautId: 'vega', phase: 'recovery' });
  await monitor.wait('ack');
  expect(activeSource(hub.snapshot().crew[0]).type).toBe('ring');
});

test('suit replacement leaves the ring connected and accepts an offline replacement', async () => {
  const { hub, connect } = await fixture();
  const ring = await connect('ring', 'ring');
  await ring.wait('registered');
  const suit = await connect('spacesuit', 'suit');
  await suit.wait('registered');
  const replacement = await connect('spacesuit', 'suit-b');
  await replacement.wait('registered');
  const notice = await suit.wait('error');
  expect(notice.type === 'error' && notice.code).toBe('device-replaced');
  replacement.ws.close();
  await until(() => !hub.snapshot().crew[0].suit.connected);
  const retry = await connect('spacesuit', 'suit-c');
  await retry.wait('registered');
  expect(hub.snapshot().crew[0].deviceId).toBe('ring');
  expect(hub.snapshot().crew[0].connected).toBe(true);
  expect(hub.snapshot().crew[0].suit.deviceId).toBe('suit-c');
  expect(hub.snapshot().crew[0].suit.connected).toBe(true);
});

test('suit rejects wrong-source, wrong-astronaut, invalid atmosphere and phase commands', async () => {
  const { hub, connect } = await fixture();
  const suit = await connect('spacesuit', 'suit');
  await suit.wait('registered');
  for (const message of [
    {
      type: 'telemetry',
      id: 'wrong-schema',
      deviceId: 'suit',
      astronautId: 'vega',
      measuredAt: Date.now(),
      values: ringValues,
    },
    {
      type: 'telemetry',
      sourceType: 'spacesuit',
      id: 'spoof',
      deviceId: 'suit',
      astronautId: 'nova',
      measuredAt: Date.now(),
      values: simulateSuit(0),
    },
    {
      type: 'telemetry',
      sourceType: 'spacesuit',
      id: 'invalid-pressure',
      deviceId: 'suit',
      astronautId: 'vega',
      measuredAt: Date.now(),
      values: { ...simulateSuit(0), ppO2: 200 },
    },
    { type: 'phase', id: 'unauthorized', astronautId: 'vega', phase: 'spacewalk' },
  ]) {
    suit.send(message);
    await suit.wait('error');
  }
  expect(hub.snapshot().crew[0].suit.latest).toBeNull();
  expect(hub.snapshot().crew[0].phase).toBe('cabin');
});

test('offline suit event is immutable, survives saved outbox and receives one acknowledgement', async () => {
  const { hub, url } = await fixture();
  let saved: unknown = null;
  const options = {
    url,
    deviceId: 'suit',
    astronautId: 'vega',
    load: () => saved,
    save: (data: unknown) => {
      saved = structuredClone(data);
    },
  };
  const first = new SuitClient(options);
  first.connect();
  await until(() => first.connection.status === 'online');
  first.disconnect();
  const captured = structuredClone(first.capture());
  first.dispose();
  await until(() => !hub.snapshot().crew[0].suit.connected);
  const resumed = new SuitClient(options);
  cleanups.push(() => resumed.dispose());
  expect(resumed.pending[0]).toEqual(captured);
  resumed.connect();
  await until(() => resumed.pending.length === 0);
  const event = hub.snapshot().events[0];
  expect(event.sourceType).toBe('spacesuit');
  expect(event.snapshot).toBeNull();
  expect(event.suitSnapshot).toEqual(captured.suitSnapshot);
  expect(event.occurredAt).toBe(captured.occurredAt);
  resumed.connection.send({ type: 'event', event: captured });
  await Bun.sleep(30);
  expect(hub.snapshot().events).toHaveLength(1);
  resumed.connection.send({
    type: 'event',
    event: { ...captured, suitSnapshot: { ...captured.suitSnapshot!, pulse: 130 } },
  });
  await until(() => resumed.connection.error.includes('different evidence'));
  expect(hub.snapshot().events[0].suitSnapshot?.pulse).toBe(captured.suitSnapshot!.pulse);
});

test('old stored crew migrate without losing ring readings; phase and suit state survive persistence', () => {
  const repo = new Repository(':memory:');
  cleanups.push(() => repo.close());
  const { suit, phase, phaseHistory, ...old } = initialCrew()[0];
  repo.db
    .query('UPDATE crew SET data=? WHERE id=?')
    .run(JSON.stringify({ ...old, deviceId: 'legacy-ring' }), 'vega');
  const migrated = repo.crew()[0];
  expect(migrated.phase).toBe('cabin');
  expect(migrated.suit.latest).toBeNull();
  expect(migrated.deviceId).toBe('legacy-ring');
  migrated.phase = 'spacewalk';
  migrated.phaseHistory.push({ phase: 'spacewalk', changedAt: Date.now() });
  migrated.suit.deviceId = 'saved-suit';
  migrated.suit.connected = true;
  repo.saveCrew(migrated);
  expect(repo.crew()[0].phase).toBe('spacewalk');
  expect(repo.crew()[0].phaseHistory).toHaveLength(1);
  expect(repo.crew()[0].suit.deviceId).toBe('saved-suit');
  expect(repo.crew()[0].suit.connected).toBe(false);
});
