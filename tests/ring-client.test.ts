import { afterEach, expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { attachHub } from '../server/hub';
import { RingClient } from '../src/lib/crew/ring-client';
import { defaultConfig } from '../src/lib/crew/model';
import type { ServerMessage } from '../src/lib/crew/types';
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const c of cleanup.splice(0).reverse()) await c();
});
async function setup() {
  const http = createServer();
  const hub = attachHub(http, ':memory:');
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw Error('No port');
  cleanup.push(async () => {
    await hub.close();
    http.closeAllConnections();
    http.close();
  });
  return { hub, url: `ws://127.0.0.1:${address.port}/ws` };
}
async function until(predicate: () => boolean, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw Error('Timed out');
    await Bun.sleep(15);
  }
}

test('real ring sender uses 3-second default and applies server interval to emission', async () => {
  const { hub, url } = await setup();
  const ring = new RingClient({ url, deviceId: 'r', astronautId: 'vega', deviceName: 'phone' });
  cleanup.push(async () => ring.dispose());
  ring.connect();
  await until(() => hub.snapshot().crew[0].samples.length === 1);
  await Bun.sleep(1100);
  expect(hub.snapshot().crew[0].samples).toHaveLength(1);
  await until(() => hub.snapshot().crew[0].samples.length === 2);
  const monitor = new WebSocket(url);
  await new Promise<void>((r) => (monitor.onopen = () => r()));
  cleanup.push(async () => monitor.close());
  monitor.send(JSON.stringify({ type: 'register', role: 'monitor', deviceId: 'tablet' }));
  await Bun.sleep(30);
  monitor.send(
    JSON.stringify({
      type: 'config',
      id: 'change',
      astronautId: 'vega',
      config: { ...defaultConfig, intervalMs: 1000 },
    }),
  );
  await until(() => hub.snapshot().crew[0].appliedRevision === 2);
  const before = hub.snapshot().crew[0].samples.length;
  await until(() => hub.snapshot().crew[0].samples.length >= before + 2, 2800);
  const samples = hub.snapshot().crew[0].samples;
  const delta = samples.at(-1)!.measuredAt - samples.at(-2)!.measuredAt;
  expect(delta).toBeGreaterThan(850);
  expect(delta).toBeLessThan(1300);
}, 10000);

test('offline gestures retry immediately on reconnect with immutable original evidence', async () => {
  const { hub, url } = await setup();
  const ring = new RingClient({ url, deviceId: 'r', astronautId: 'vega', deviceName: 'phone' });
  cleanup.push(async () => ring.dispose());
  ring.connect();
  await until(() => ring.status === 'online');
  ring.disconnect();
  const e = ring.capture('swipe');
  expect(ring.pending).toHaveLength(1);
  expect(hub.snapshot().events).toHaveLength(0);
  const original = JSON.stringify(e.snapshot);
  await Bun.sleep(50);
  ring.connect();
  await until(() => hub.snapshot().events.length === 1 && ring.pending.length === 0);
  expect(hub.snapshot().events[0].occurredAt).toBe(e.occurredAt);
  expect(JSON.stringify(hub.snapshot().events[0].snapshot)).toBe(original);
  expect(ring.deliveries[e.id].status).toBe('confirmed');
});

test('a transient server storage failure retries the same emergency after recovery', async () => {
  const { hub, url } = await setup();
  const ring = new RingClient({
    url,
    deviceId: 'recoverable',
    astronautId: 'vega',
    deviceName: 'phone',
  });
  cleanup.push(async () => ring.dispose());
  ring.connect();
  await until(() => ring.status === 'online');
  hub.repository.db.exec(
    "CREATE TEMP TRIGGER fail_event BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'test storage unavailable'); END;",
  );
  const event = ring.capture('swipe');
  await Bun.sleep(100);
  hub.repository.db.exec('DROP TRIGGER fail_event');
  await until(() => ring.deliveries[event.id]?.status === 'confirmed', 3500);
  expect(hub.snapshot().events).toHaveLength(1);
  expect(ring.pending).toHaveLength(0);
});

test('an unreadable saved outbox is preserved instead of overwritten by a new gesture', () => {
  let writes = 0;
  const ring = new RingClient({
    url: 'ws://127.0.0.1:1/ws',
    deviceId: 'r',
    astronautId: 'vega',
    deviceName: 'phone',
    load: () => {
      throw Error('unreadable original evidence');
    },
    save: () => {
      writes++;
    },
  });
  ring.capture('swipe');
  expect(writes).toBe(0);
  expect(ring.pending).toHaveLength(1);
  expect(ring.storageError).not.toBe('');
  ring.dispose();
});

for (const replacementId of ['first', 'second']) {
  test(`replaced sender stops retrying, retains pending evidence and can resume: ${replacementId}`, async () => {
    const { hub, url } = await setup();
    const first = new RingClient({
      url,
      deviceId: 'first',
      astronautId: 'nova',
      deviceName: 'first tab',
    });
    const second = new RingClient({
      url,
      deviceId: replacementId,
      astronautId: 'nova',
      deviceName: 'second tab',
    });
    cleanup.push(async () => {
      first.dispose();
      second.dispose();
    });
    first.connect();
    await until(() => first.status === 'online');
    second.connect();
    await until(() => second.status === 'online' && first.status === 'replaced');
    const pending = structuredClone(first.capture('swipe'));
    await Bun.sleep(1200);
    expect(first.status).toBe('replaced');
    expect(second.status).toBe('online');
    expect(hub.snapshot().events).toHaveLength(0);
    first.connect();
    await until(() => first.deliveries[pending.id]?.status === 'confirmed');
    expect(hub.snapshot().events[0].occurredAt).toBe(pending.occurredAt);
    expect(hub.snapshot().events[0].snapshot).toEqual(pending.snapshot);
    expect(second.status).toBe('replaced');
  });
}
