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
const now = Date.now();

const phoneAssessment = (member = initialCrew()[0], oncontext?: () => void) =>
  render(AutomaticHealth, {
    props: {
      member,
      online: true,
      now,
      compact: true,
      aiEnabled: false,
      connectHref: '/ring?astronaut=vega',
      oncontext,
    },
  }).body;

test('missing primary readings offer connection before the optional health report', () => {
  const body = phoneAssessment(initialCrew()[0], () => {});
  expect(body).toContain('href="/ring?astronaut=vega"');
  expect(body).toContain('Open ring simulator');
  expect(body.indexOf('Open ring simulator')).toBeLessThan(body.indexOf('Record how I feel'));
  expect(body).toContain('without waiting for new data');
});

test('the phone assessment without readings is short: one action, no labels or disclaimers', () => {
  const body = phoneAssessment(initialCrew()[0], () => {});
  expect(body).toContain('Link your ring');
  expect(body).toContain('Link it to see your readings.');
  for (const noise of [
    'What’s happening?',
    'Built-in explanation',
    'Why NASA context matters',
    'How this assessment works',
  ])
    expect(body).not.toContain(noise);
});

test('a ring that was linked before asks to be reconnected rather than linked', () => {
  const member = initialCrew()[0];
  member.deviceId = 'ring-vega';
  member.connected = false;
  const body = phoneAssessment(member);
  expect(body).toContain('Reconnect your ring');
  expect(body).toContain('Reconnect it to see current readings.');
  expect(body).not.toContain('Link your ring');
});

test('a live ring whose clock runs ahead of the server is never asked to reconnect', () => {
  const member = initialCrew()[0];
  member.deviceId = 'ring-vega';
  member.connected = true;
  member.latest = {
    id: 'ring-sample',
    deviceId: 'ring-vega',
    astronautId: member.id,
    // The emitter stamped this 40 ms after the server received it.
    measuredAt: now + 40,
    receivedAt: now,
    values: { pulse: 72, hrv: 50, spo2: 98.4, skin: 0.1, respiration: 14 },
  };
  const body = phoneAssessment(member, () => {});
  expect(body).not.toContain('Reconnect your ring');
  expect(body).not.toContain('Open ring simulator');
});

test('the research replay keeps its full explanation layout', () => {
  const { body } = render(AutomaticHealth, {
    props: { member: initialCrew()[0], online: true, now, aiEnabled: false },
  });
  expect(body).toContain('What’s happening?');
  expect(body).toContain('Built-in explanation');
  expect(body).toContain('Why NASA context matters');
  expect(body).toContain('Readings, sources &amp; explanation details');
  expect(body).not.toContain('Open ring simulator');
});

test('review starts with an explanation then comparable evidence and the real contextual question', () => {
  const body = phoneAssessment(scenarioCrew('recovery', now), () => {});
  expect(body.indexOf('insight-summary')).toBeLessThan(body.indexOf('insight-evidence'));
  expect(body).toContain('Yes, finished');
  expect(body).toContain('I feel unwell');
  expect(body).toContain('How this assessment works');
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

const { default: GuidedHealth } = await import('../src/lib/components/crew/GuidedHealth.svelte');
const { default: SpaceHealthRisks } =
  await import('../src/lib/components/crew/SpaceHealthRisks.svelte');

test('guided learning exposes provenance, manual controls and practice isolation without mission props', () => {
  for (const scenario of ['archer', 'radin2'] as const) {
    const body = render(GuidedHealth, { props: { scenario, onscenario: () => {} } }).body;
    expect(body).toContain('Guided simulation');
    expect(body).toContain('Synthetic');
    expect(body).toContain('Step 1 of 3');
    expect(body).toContain('Return to my readings');
    expect(body).toContain('Nothing is saved');
    expect(body).toContain('What we still need to know');
    expect(body).not.toContain('Enable Gemini');
    if (scenario === 'radin2') expect(body).toContain('Not David');
  }
});

test('risk learning remains useful without readings and never claims a detected condition', () => {
  const body = render(SpaceHealthRisks, {
    props: { member: initialCrew()[0], online: false, now },
  }).body;
  expect(body).toContain('Explore space health risks');
  expect(body).toContain('not detected conditions');
  expect(body).toContain('Bone changes');
});

const { default: PersonalHealth } =
  await import('../src/lib/components/crew/PersonalHealth.svelte');
test('saved unresolved help remains visible inside guided practice', async () => {
  const { buildHealthGuide } = await import('../src/lib/crew/health');
  const member = initialCrew()[0];
  const input = { topic: 'fatigue' as const, feeling: 'help' as const, note: '', eventId: null };
  member.healthChecks.push({
    id: 'concern',
    createdAt: now,
    phase: 'cabin',
    input,
    evidence: null,
    guide: buildHealthGuide(input, member, null, now),
    completedSteps: [],
    followups: [],
  });
  const body = render(PersonalHealth, {
    props: {
      identity: member.id,
      mission: { crew: [member], events: [], serverTime: now },
      online: false,
      now,
      send: async () => false,
      ondetail: () => {},
      onhistory: () => {},
      scenario: 'archer',
    },
  }).body;
  expect(body).toContain('Your reported concern still needs attention');
  expect(body.replace(/\s+/g, ' ')).toContain('Guided practice does not resolve this concern');
});
test('automatic concern can be retained by its parent across practice', () => {
  const body = render(AutomaticHealth, {
    props: {
      member: initialCrew()[0],
      online: false,
      now,
      compact: true,
      aiEnabled: false,
      response: { episode: 'old', answer: 'unwell' },
    },
  }).body;
  expect(body).toContain('How you feel needs attention');
  expect(body).toContain('I contacted the crew');
});
