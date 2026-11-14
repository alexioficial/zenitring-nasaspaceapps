import { expect, test } from 'bun:test';
import { plugin } from 'bun';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { resolve } from 'node:path';
import { initialCrew } from '../src/lib/crew/model';
import { simulateSuit } from '../src/lib/crew/suit';

// Compile the real component for server rendering; no browser or simulated DOM.
plugin({
  name: 'svelte-source-display',
  setup(build) {
    build.onResolve({ filter: /^\$lib\// }, (args) => ({
      path: resolve(import.meta.dir, '../src/lib', args.path.slice(5)),
    }));
    build.onLoad({ filter: /\.svelte$/ }, async (args) => ({
      contents: compile(await Bun.file(args.path).text(), {
        filename: args.path,
        generate: 'server',
      }).js.code,
      loader: 'js',
    }));
  },
});

const { default: MissionSources } =
  await import('../src/lib/components/crew/MissionSources.svelte');
const { default: SuitSignal } = await import('../src/lib/components/crew/SuitSignal.svelte');
const now = Date.now();
function memberWithSuit() {
  const member = initialCrew()[0];
  member.suit = {
    ...member.suit,
    deviceId: 'suit-vega',
    connected: true,
    latest: {
      id: 'sample',
      deviceId: 'suit-vega',
      astronautId: member.id,
      sourceType: 'spacesuit',
      measuredAt: now,
      receivedAt: now,
      values: simulateSuit(0),
    },
  };
  return member;
}

test('connected suit readings remain visible in Cabin without replacing the ring source', () => {
  const member = memberWithSuit();
  const { body } = render(MissionSources, {
    props: { member, online: true, now, send: async () => true },
  });
  expect(body).toContain('Suit pressure');
  expect(body).toContain('30.00');
  expect(body).toContain('94');
  expect(body).toContain('PRIMARY SOURCE / RING');
  expect(member.phase).toBe('cabin');
  expect(member.latest).toBeNull();
});

test('the crew overview exposes a live suit independently of an unlinked cabin ring', () => {
  const member = memberWithSuit();
  const { body } = render(SuitSignal, { props: { member, online: true, now } });
  expect(body).toContain('VEGA EVA suit signal');
  expect(body).toContain('Receiving');
  expect(body).toContain('94');
  expect(body).toContain('30.00');
  expect(body).toContain('Suit ECG');
});

test('retained suit readings are labelled offline or stale rather than receiving', () => {
  const member = memberWithSuit();
  for (const [online, connected, time, label] of [
    [true, false, now, 'Offline'],
    [false, true, now, 'Offline'],
    [true, true, now + 30000, 'Signal stale'],
  ] as const) {
    member.suit.connected = connected;
    const { body } = render(SuitSignal, { props: { member, online, now: time } });
    expect(body).toContain(label);
    expect(body).toContain('last known');
    expect(body).not.toContain('Receiving');
  }
});

test('a connected suit without a sample waits without inventing measurements', () => {
  const member = memberWithSuit();
  member.suit.latest = null;
  const { body } = render(SuitSignal, { props: { member, online: true, now } });
  expect(body).toContain('Connected · awaiting sample');
  expect(body).toContain('No suit measurement yet');
  expect(body).not.toContain('94');
});

test('a crew member with no suit data does not gain an empty extra overview row', () => {
  const { body } = render(SuitSignal, { props: { member: initialCrew()[0], online: true, now } });
  expect(body).not.toContain('EVA suit');
});

test('the suit detail uses its own reception state when the primary ring is offline', () => {
  const member = memberWithSuit();
  const live = render(MissionSources, {
    props: { member, online: true, now, send: async () => true },
  }).body;
  expect(live).toContain('Receiving current suit signals');
  member.suit.connected = false;
  const offline = render(MissionSources, {
    props: { member, online: true, now, send: async () => true },
  }).body;
  expect(offline).toContain('Suit offline · last known / unavailable values');
  expect(offline).toContain('30.00');
  expect(offline).not.toContain('Receiving current suit signals');
});

const { default: VitalReadings } = await import('../src/lib/components/crew/VitalReadings.svelte');

test('personal medbay keeps unavailable ring readings empty instead of implying a measurement', () => {
  const member = initialCrew()[0];
  const html = render(VitalReadings, { props: { member, online: true, now } }).body;
  expect(html).toContain('No readings received');
  expect(html).toContain('Last known / unavailable');
  expect(html).toContain('SpO₂');
  expect(html).toContain('—');
});

test('personal medbay changes to suit measurements during EVA without inventing blood SpO2', () => {
  const member = memberWithSuit();
  member.phase = 'spacewalk';
  const html = render(VitalReadings, { props: { member, online: true, now } }).body;
  expect(html).toContain('Suit ECG heart rate');
  expect(html).toContain('O₂ partial pressure');
  expect(html).toContain('Suit oxygen is atmospheric pressure, not blood SpO₂.');
  expect(html).not.toContain('From fictional baseline');
});
