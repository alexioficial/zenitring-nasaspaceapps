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
const { default: AutomaticHealth } =
  await import('../src/lib/components/crew/AutomaticHealth.svelte');
const { scenarioCrew } = await import('../src/lib/crew/research-scenarios');
const { default: MissionStatus } = await import('../src/lib/components/crew/MissionStatus.svelte');
const now = Date.now();

test('mission context keeps ring, suit and server reception independent without an illustration', () => {
  const member = memberWithSuit();
  const html = render(MissionStatus, { props: { member, online: true, now } }).body;
  expect(html).toContain('aria-label="Ring: Not linked"');
  expect(html).toContain('aria-label="Suit: Receiving"');
  expect(html).toContain('aria-label="Crew link: Online"');
  expect(html).toContain('Ring is primary');
  expect(html).not.toContain('<img');
});

test('an unlinked primary source is a shortcut to Devices, and a receiving one is not', () => {
  const member = memberWithSuit();
  const shortcut = render(MissionStatus, {
    props: { member, online: true, now, ondevices: () => {} },
  }).body;
  expect(shortcut).toContain('aria-label="Ring: Not linked. Go to Devices"');
  // The suit is not primary in Cabin, so it stays plain status.
  expect(shortcut).not.toContain('Suit: Receiving. Go to Devices');
  expect(shortcut.match(/source-shortcut/g)).toHaveLength(1);
  member.deviceId = 'ring-vega';
  member.connected = true;
  member.latest = {
    id: 'ring-sample',
    deviceId: 'ring-vega',
    astronautId: member.id,
    measuredAt: now,
    receivedAt: now,
    values: { pulse: 72, hrv: 50, spo2: 98, skin: 0.1, respiration: 14 },
  };
  const receiving = render(MissionStatus, {
    props: { member, online: true, now, ondevices: () => {} },
  }).body;
  expect(receiving).toContain('aria-label="Ring: Receiving"');
  expect(receiving).not.toContain('source-shortcut');
  expect(
    render(MissionStatus, { props: { member: initialCrew()[0], online: false, now } }).body,
  ).toContain('aria-label="Ring: No signal"');
});

test('missing primary readings offer connection before the optional health report', () => {
  const { body } = render(AutomaticHealth, {
    props: {
      member: initialCrew()[0],
      online: true,
      now,
      compact: true,
      aiEnabled: false,
      connectHref: '/ring?astronaut=vega',
      oncontext: () => {},
    },
  });
  expect(body).toContain('href="/ring?astronaut=vega"');
  expect(body).toContain('Open ring simulator');
  expect(body.indexOf('Open ring simulator')).toBeLessThan(body.indexOf('Record how I feel'));
  expect(body).toContain('without waiting for new data');
});

test('the phone assessment without readings is short: one action, no labels or disclaimers', () => {
  const { body } = render(AutomaticHealth, {
    props: {
      member: initialCrew()[0],
      online: true,
      now,
      compact: true,
      aiEnabled: false,
      connectHref: '/ring?astronaut=vega',
      oncontext: () => {},
    },
  });
  expect(body).toContain('Link your ring');
  expect(body).toContain('Link it to see your readings.');
  for (const noise of [
    'Built-in explanation',
    'Health assessment',
    'Not a diagnosis.',
    'How this assessment works',
  ])
    expect(body).not.toContain(noise);
});

test('a ring that was linked before asks to be reconnected rather than linked', () => {
  const member = initialCrew()[0];
  member.deviceId = 'ring-vega';
  member.connected = false;
  const { body } = render(AutomaticHealth, {
    props: {
      member,
      online: true,
      now,
      compact: true,
      aiEnabled: false,
      connectHref: '/ring?astronaut=vega',
    },
  });
  expect(body).toContain('Reconnect your ring');
  expect(body).toContain('Reconnect it to see current readings.');
  expect(body).not.toContain('Link your ring');
});

test('the research replay keeps its labels and explanation for its own audience', () => {
  const { body } = render(AutomaticHealth, {
    props: { member: initialCrew()[0], online: true, now, aiEnabled: false },
  });
  expect(body).toContain('Built-in explanation');
  expect(body).toContain('Not a diagnosis.');
  expect(body).toContain('How this assessment works');
});

test('review starts with an explanation then comparable evidence and the real contextual question', () => {
  const { body } = render(AutomaticHealth, {
    props: {
      member: scenarioCrew('recovery', now),
      online: true,
      now,
      compact: true,
      aiEnabled: false,
      connectHref: '/ring?astronaut=vega',
      oncontext: () => {},
    },
  });
  expect(body.indexOf('insight-summary')).toBeLessThan(body.indexOf('insight-evidence'));
  expect(body).toContain('Yes, finished');
  expect(body).toContain('I feel unwell');
  expect(body).not.toContain('Open ring simulator');
});
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

test('personal medbay shows no table of dashes before the first reading', () => {
  const member = initialCrew()[0];
  const html = render(VitalReadings, { props: { member, online: true, now } }).body;
  expect(html).toContain('No readings yet.');
  expect(html).not.toContain('—');
  expect(html).not.toContain('<dl');
});

test('ring readings are labelled live while receiving and last known once they stop', () => {
  const member = initialCrew()[0];
  member.deviceId = 'ring-vega';
  member.connected = true;
  member.latest = {
    id: 'ring-sample',
    deviceId: 'ring-vega',
    astronautId: member.id,
    measuredAt: now,
    receivedAt: now,
    values: { pulse: 72, hrv: 50, spo2: 98.4, skin: 0.1, respiration: 14 },
  };
  const live = render(VitalReadings, { props: { member, online: true, now } }).body;
  expect(live).toContain('Live');
  expect(live).toContain('72');
  expect(live).toContain('98.4');
  expect(live).toContain('Updated 0s ago');
  expect(live).not.toContain('medbay-retained');
  member.connected = false;
  const retained = render(VitalReadings, { props: { member, online: true, now } }).body;
  expect(retained).toContain('Last known');
  expect(retained).toContain('72');
  expect(retained).toContain('medbay-retained');
  expect(retained).not.toContain('>Live<');
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
