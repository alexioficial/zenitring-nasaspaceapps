import type { HealthCheck } from './health';
import type { CrewEvent, CrewMember } from './types';
import type { GuidedScenario } from './health-learning';

export function guidedScenario(url: URL): GuidedScenario | null {
  if (personalView(url) !== 'personal') return null;
  const value = url.searchParams.get('scenario');
  return value === 'archer' || value === 'radin2' ? value : null;
}

export function guidedScenarioUrl(current: URL, scenario: GuidedScenario | null): URL {
  const url = personalViewUrl(current, 'personal');
  url.searchParams.set('view', 'health');
  if (scenario) url.searchParams.set('scenario', scenario);
  else url.searchParams.delete('scenario');
  return url;
}

export type PersonalView = 'personal' | 'overview' | 'events' | 'pair' | 'lab' | 'nasa' | 'more';
const viewNames: Record<PersonalView, string> = {
  personal: 'health',
  overview: 'signals',
  events: 'records',
  pair: 'devices',
  lab: 'settings',
  nasa: 'nasa',
  more: 'more',
};

export function personalView(url: URL): PersonalView {
  return (
    (Object.entries(viewNames).find(
      ([, name]) => name === url.searchParams.get('view'),
    )?.[0] as PersonalView) ?? 'personal'
  );
}

export function personalViewUrl(current: URL, view: PersonalView): URL {
  const url = new URL(current);
  if (view !== 'personal') url.searchParams.delete('scenario');
  if (view === 'personal') url.searchParams.delete('view');
  else url.searchParams.set('view', viewNames[view]);
  url.hash = '';
  return url;
}

/** Remembers, per browser, that an astronaut link has been opened before. */
export const onboardedCookie = (astronautId: string) => `zenit-onboarded-${astronautId}`;

/** A first visit lands on Devices unless the link already names a view. */
export function firstVisitTarget(url: URL): URL | null {
  return url.searchParams.has('view') ? null : personalViewUrl(url, 'pair');
}

export type RecordFilter = 'all' | 'checkin' | 'moment' | 'emergency';
export type PersonalRecord =
  | { kind: 'checkin'; id: string; occurredAt: number; check: HealthCheck }
  | { kind: 'moment' | 'emergency'; id: string; occurredAt: number; event: CrewEvent };

export function personalRecords(
  member: CrewMember,
  events: CrewEvent[],
  filter: RecordFilter,
): PersonalRecord[] {
  const records: PersonalRecord[] = [
    ...member.healthChecks.map((check) => ({
      kind: 'checkin' as const,
      id: check.id,
      occurredAt: check.createdAt,
      check,
    })),
    ...events
      .filter((event) => event.astronautId === member.id)
      .map((event) => ({ kind: event.kind, id: event.id, occurredAt: event.occurredAt, event })),
  ];
  return records
    .filter((record) => filter === 'all' || record.kind === filter)
    .sort((a, b) => b.occurredAt - a.occurredAt || a.id.localeCompare(b.id));
}
