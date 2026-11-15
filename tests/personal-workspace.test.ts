import { expect, test } from 'bun:test';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import { initialCrew } from '../src/lib/crew/model';
import type { CrewEvent } from '../src/lib/crew/types';
import type { HealthCheck } from '../src/lib/crew/health';
import {
  personalView,
  personalViewUrl,
  personalRecords,
  firstVisitTarget,
} from '../src/lib/crew/workspace';
import { load } from '../src/routes/astronaut/[id]/+page.server';

// Runs the real server load with an in-memory cookie jar; returns what it returned or threw.
function visit(id: string, search = '', jar = new Map<string, string>()) {
  const options: unknown[] = [];
  const cookies = {
    get: (name: string) => jar.get(name),
    set: (name: string, value: string, option: unknown) => {
      jar.set(name, value);
      options.push(option);
    },
  };
  const url = new URL(`http://192.168.5.178:3000/astronaut/${id}${search}`);
  try {
    return { result: load({ params: { id }, url, cookies } as never) as unknown, jar, options };
  } catch (thrown) {
    return { result: thrown, jar, options };
  }
}

test('the first visit to an astronaut link lands on Devices and later visits open Health', () => {
  const jar = new Map<string, string>();
  const first = visit('vega', '', jar);
  expect(isRedirect(first.result) && first.result.location).toBe('/astronaut/vega?view=devices');
  expect(jar.size).toBe(1);
  // Plain HTTP on the LAN: a Secure cookie would be dropped and the redirect would repeat.
  expect(first.options[0]).toMatchObject({ secure: false, path: '/' });
  expect(visit('vega', '', jar).result).toEqual({ astronautId: 'vega' });
});

test('onboarding is remembered per astronaut and never overrides an explicit view', () => {
  const jar = new Map<string, string>();
  expect(isRedirect(visit('vega', '', jar).result)).toBe(true);
  expect(isRedirect(visit('nova', '', jar).result)).toBe(true);
  expect(visit('vega', '', jar).result).toEqual({ astronautId: 'vega' });
  const records = visit('atlas', '?view=records');
  expect(records.result).toEqual({ astronautId: 'atlas' });
  expect(visit('atlas', '', records.jar).result).toEqual({ astronautId: 'atlas' });
  expect(firstVisitTarget(new URL('http://x.test/astronaut/lyra?demo=1'))?.search).toBe(
    '?demo=1&view=devices',
  );
  expect(firstVisitTarget(new URL('http://x.test/astronaut/lyra?view=health'))).toBeNull();
});

test('an unknown astronaut link is still a 404 and sets no cookie', () => {
  const { result, jar } = visit('ghost');
  expect(isHttpError(result) && result.status).toBe(404);
  expect(jar.size).toBe(0);
});

test('personal view URLs survive reload and preserve identity and unrelated query parameters', () => {
  const original = new URL('http://localhost:3000/astronaut/nova?demo=1');
  const records = personalViewUrl(original, 'events');
  expect(records.pathname).toBe('/astronaut/nova');
  expect(records.searchParams.get('demo')).toBe('1');
  expect(records.searchParams.get('view')).toBe('records');
  expect(personalView(records)).toBe('events');
  expect(personalView(personalViewUrl(records, 'pair'))).toBe('pair');
  expect(personalViewUrl(records, 'personal').searchParams.has('view')).toBe(false);
  expect(original.searchParams.has('view')).toBe(false);
});

test('invalid view values resolve to health and secondary views have stable links', () => {
  expect(personalView(new URL('https://example.test/astronaut/vega?view=unknown'))).toBe(
    'personal',
  );
  for (const view of ['overview', 'nasa', 'lab', 'more'] as const) {
    expect(
      personalView(personalViewUrl(new URL('https://example.test/astronaut/vega'), view)),
    ).toBe(view);
  }
});

test('personal records combine check-ins and captures by original time without crossing identities', () => {
  const member = initialCrew()[0];
  member.healthChecks = [{ id: 'check', createdAt: 200 } as HealthCheck];
  const events = [
    { id: 'old', astronautId: member.id, occurredAt: 100, receivedAt: 900, kind: 'moment' },
    { id: 'new', astronautId: member.id, occurredAt: 300, receivedAt: 400, kind: 'emergency' },
    { id: 'other', astronautId: 'nova', occurredAt: 500, receivedAt: 500, kind: 'moment' },
  ] as CrewEvent[];
  expect(personalRecords(member, events, 'all').map((r) => r.id)).toEqual(['new', 'check', 'old']);
  expect(personalRecords(member, events, 'checkin').map((r) => r.id)).toEqual(['check']);
  expect(personalRecords(member, events, 'moment').map((r) => r.id)).toEqual(['old']);
  expect(personalRecords(member, events, 'emergency').map((r) => r.id)).toEqual(['new']);
  expect(events[0].id).toBe('old');
});
