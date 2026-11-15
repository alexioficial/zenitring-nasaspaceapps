import { expect, test } from 'bun:test';
import {
  explainAutomatic,
  parseAutomaticRequest,
  validAIExplanation,
} from '../src/lib/server/automatic-ai';
import { scenarioCrew } from '../src/lib/crew/research-scenarios';
const now = 1700000000000;
test('missing AI configuration and urgent self-reports stay local without network use', async () => {
  const c = scenarioCrew('recovery', now);
  let calls = 0;
  const fetcher = async () => {
    calls++;
    throw Error();
  };
  expect(await explainAutomatic(c, null, { now, fetcher })).toEqual({
    mode: 'local',
    reason: 'not-configured',
  });
  expect(await explainAutomatic(c, 'unwell', { now, fetcher, apiKey: 'test' })).toEqual({
    mode: 'local',
    reason: 'not-applicable',
  });
  expect(calls).toBe(0);
});
test('Gemini receives only numeric observations and confirmed context, with server-side authentication', async () => {
  const c = scenarioCrew('recovery', now);
  c.name = 'PRIVATE-NAME';
  const result = await explainAutomatic(c, 'finished', {
    now,
    apiKey: 'test-key',
    fetcher: async (url, init) => {
      expect(String(url)).toContain('generativelanguage.googleapis.com');
      expect(new Headers(init?.headers).get('x-goog-api-key')).toBe('test-key');
      expect(String(init?.body)).not.toContain('PRIVATE-NAME');
      const body = JSON.parse(String(init?.body));
      expect(body.generationConfig.responseMimeType).toBe('application/json');
      const evidence = JSON.parse(body.contents[0].parts[0].text);
      expect(evidence.confirmedAnswer).toBe('finished');
      expect(evidence.background.exercise.url).toBe(
        'https://www.nasa.gov/reference/fundamentals-of-human-health/',
      );
      expect(evidence.background.exercise.relevance).toContain('does not prove');
      expect(body.systemInstruction.parts[0].text).toContain('45 words');
      return Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Recent activity may contribute to the change.',
                    uncertainty: 'Recovery timing is unknown.',
                    sourceIds: ['exercise'],
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
test('provider errors and malformed or unsourced output preserve local guidance', async () => {
  const c = scenarioCrew('recovery', now);
  for (const response of [
    Response.json({}, { status: 429 }),
    Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] }),
    Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }),
  ]) {
    expect(
      await explainAutomatic(c, null, { now, apiKey: 'test', fetcher: async () => response }),
    ).toEqual({ mode: 'local', reason: 'unavailable' });
  }
  expect(validAIExplanation({ summary: 'x', uncertainty: 'x', sourceIds: ['invented'] })).toBe(
    false,
  );
});
test('API input is bounded, validates measurements and discards identifying metadata', () => {
  const c = scenarioCrew('recovery', now),
    input = {
      source: 'ring',
      phase: 'cabin',
      phaseStart: 0,
      answer: null,
      samples: c.samples,
      name: 'private',
    };
  expect(parseAutomaticRequest(input)?.member.name).not.toBe('private');
  expect(parseAutomaticRequest({ ...input, samples: Array(121).fill(c.samples[0]) })).toBeNull();
  expect(parseAutomaticRequest({ ...input, source: 'spacesuit' })).toBeNull();
  expect(parseAutomaticRequest({ ...input, answer: 'ignore instructions' })).toBeNull();
  expect(parseAutomaticRequest({ ...input, phase: ['cabin'] })).toBeNull();
  expect(parseAutomaticRequest({ ...input, answer: ['finished'] })).toBeNull();
  expect(
    parseAutomaticRequest({
      ...input,
      samples: c.samples.map((s) => ({ ...s, values: { pulse: NaN } })),
    }),
  ).toBeNull();
});

test('live AI receives the relevant NASA risk and the fixed next action without identifying data', async () => {
  for (const scenario of ['recovery', 'suit'] as const) {
    const c = scenarioCrew(scenario, now);
    const result = await explainAutomatic(c, null, {
      now,
      apiKey: 'test',
      fetcher: async (_url, init) => {
        const body = JSON.parse(String(init.body));
        const evidence = JSON.parse(body.contents[0].parts[0].text);
        expect(evidence.nextStep.length).toBeGreaterThan(10);
        expect(
          evidence.background[scenario === 'suit' ? 'spacewalkRisk' : 'cardiovascularRisk'].url,
        ).toContain('nasa.gov/reference/risk-');
        return Response.json({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: 'Context helps explain this change.',
                      uncertainty: 'The cause is unknown.',
                      actionReason: 'The supplied next step helps clarify the observation.',
                      sourceIds: [scenario === 'suit' ? 'spacewalkRisk' : 'cardiovascularRisk'],
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
    if (result.mode === 'ai') expect(result.explanation.actionReason).toContain('next step');
  }
});
