import { expect, test } from 'bun:test';
import { initialCrew } from '../src/lib/crew/model';
import { scenarioCrew } from '../src/lib/crew/research-scenarios';
import {
  riskContext,
  spaceRisks,
  guidedScenarios,
  learningResponse,
} from '../src/lib/crew/health-learning';
import {
  guidedScenario,
  guidedScenarioUrl,
  personalViewUrl,
  firstVisitTarget,
} from '../src/lib/crew/workspace';

const now = 1800000000000;
test('risk context requires fresh evidence; general learning remains available', () => {
  expect(riskContext(initialCrew()[0], true, now).risk).toBeNull();
  const crew = scenarioCrew('recovery', now);
  expect(riskContext(crew, true, now).risk).toBe('cardiovascular');
  expect(riskContext(crew, false, now).risk).toBeNull();
  expect(riskContext(crew, true, now + 60000).risk).toBeNull();
  expect(spaceRisks.length).toBeGreaterThanOrEqual(16);
});
test('guided URLs preserve identity and unrelated parameters and avoid onboarding', () => {
  const url = guidedScenarioUrl(
    new URL('https://zenit.test/astronaut/nova?campaign=x#old'),
    'radin2',
  );
  expect(url.pathname).toBe('/astronaut/nova');
  expect(url.searchParams.get('campaign')).toBe('x');
  expect(firstVisitTarget(url)).toBeNull();
  expect(guidedScenario(url)).toBe('radin2');
  expect(guidedScenario(personalViewUrl(url, 'events'))).toBeNull();
  expect(guidedScenarioUrl(url, null).searchParams.has('scenario')).toBe(false);
  url.searchParams.set('scenario', '__proto__');
  expect(guidedScenario(url)).toBeNull();
  url.searchParams.set('scenario', 'archer');
  url.searchParams.set('view', 'records');
  expect(guidedScenario(url)).toBeNull();
});
test('synthetic scenarios retain source, period and help priority through follow-up', () => {
  expect(guidedScenarios.archer.steps).toHaveLength(3);
  expect(guidedScenarios.radin2.steps).toHaveLength(3);
  expect(guidedScenarios.radin2.disclosure).toContain('Not David');
  expect(guidedScenarios.radin2.steps[1].period).toContain('7');
  expect(learningResponse('archer', 'unwell', true)).toContain('Contact your crew');
  expect(learningResponse('archer', 'unwell', true)).not.toContain('improved');
  expect(learningResponse('radin2', null, false)).toContain('calibration');
});

test('saved context names its age, ignores future reports and preserves unresolved help offline', async () => {
  const { buildHealthGuide } = await import('../src/lib/crew/health');
  const crew = scenarioCrew('recovery', now);
  const input = { topic: 'fatigue' as const, feeling: 'changed' as const, note: '', eventId: null };
  crew.healthChecks.push({
    id: 'sleep-report',
    createdAt: now - 1000,
    phase: 'cabin',
    input,
    evidence: null,
    guide: buildHealthGuide(input, crew, null, now),
    completedSteps: [],
    followups: [],
  });
  expect(riskContext(crew, false, now)).toMatchObject({ risk: 'sleep', help: false });
  expect(riskContext(crew, false, now).reason).toContain('saved check-in');
  crew.healthChecks[0].createdAt = now - 86400001;
  expect(riskContext(crew, false, now).risk).toBeNull();
  crew.healthChecks[0].guide.level = 'help';
  expect(riskContext(crew, false, now)).toMatchObject({ risk: 'sleep', help: true });
  crew.healthChecks[0].followups.push({ id: 'contact', outcome: 'contacted', createdAt: now });
  expect(riskContext(crew, false, now).help).toBe(false);
  crew.healthChecks[0].createdAt = now + 1000;
  expect(riskContext(crew, false, now).risk).toBeNull();
});

test('phase learning is labelled as phase context even without a suit', () => {
  const crew = initialCrew()[0];
  crew.phase = 'spacewalk';
  const before = JSON.stringify(crew);
  expect(riskContext(crew, false, now)).toMatchObject({ risk: 'eva', help: false });
  expect(riskContext(crew, false, now).reason).toContain('selected Spacewalk phase');
  expect(JSON.stringify(crew)).toBe(before);
});
