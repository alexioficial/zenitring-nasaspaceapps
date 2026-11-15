import { expect, test } from 'bun:test';
import { explainLearning, parseLearningRequest } from '../src/lib/server/learning-ai';
const request = {
  kind: 'guided' as const,
  scenario: 'archer' as const,
  step: 1,
  answer: 'schedule' as const,
  practiced: false,
  outcome: '' as const,
};
test('learning requests accept only bounded local scenarios and drop arbitrary evidence', () => {
  expect(
    parseLearningRequest({ ...request, readings: [999], name: 'PRIVATE', note: 'instructions' }),
  ).toEqual(request);
  for (const bad of [
    { ...request, step: 3 },
    { ...request, scenario: '__proto__' },
    { ...request, answer: 'diagnose me' },
    { kind: 'risk', riskId: '__proto__' },
    { ...request, scenario: 'radin2' },
  ])
    expect(parseLearningRequest(bad)).toBeNull();
});
test('urgent practice reports never wait for AI and missing keys use local guidance', async () => {
  let called = false;
  const fetcher = async () => {
    called = true;
    throw Error();
  };
  expect(
    (await explainLearning({ ...request, answer: 'unwell' }, { apiKey: 'test', fetcher })).reason,
  ).toBe('not-applicable');
  expect(
    (await explainLearning({ ...request, outcome: 'worse' }, { apiKey: 'test', fetcher })).reason,
  ).toBe('not-applicable');
  expect((await explainLearning(request, { fetcher })).reason).toBe('not-configured');
  expect(called).toBe(false);
});
test('AI receives server-owned scenario evidence and explains the existing action', async () => {
  const result = await explainLearning(request, {
    apiKey: 'test',
    fetcher: async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const evidence = JSON.parse(body.contents[0].parts[0].text);
      expect(evidence.mode).toBe('guided practice');
      expect(evidence.evidence.readings[0].value).toBe('5.5 h');
      expect(evidence.background.risk.url).toContain('risk-from-inadequate-sleep');
      expect(evidence.nextStep).toContain('assigned rest schedule');
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'The shorter night needs context.',
                    uncertainty: 'The cause is unknown.',
                    actionReason: 'A schedule review helps document the change.',
                    sourceIds: ['risk', 'study'],
                  }),
                },
              ],
            },
          },
        ],
      });
    },
  });
  expect(result.mode).toBe('ai');
});
test('unknown citations, failed providers and oversized explanations fall back locally', async () => {
  for (const response of [
    Response.json({}, { status: 429 }),
    Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              {
                text: JSON.stringify({
                  summary: 'x',
                  uncertainty: 'x',
                  actionReason: 'x',
                  sourceIds: ['invented'],
                }),
              },
            ],
          },
        },
      ],
    }),
  ]) {
    expect(
      (
        await explainLearning(request, {
          apiKey: 'test',
          fetcher: async () => response,
        })
      ).mode,
    ).toBe('local');
  }
});
