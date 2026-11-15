import { expect, test, spyOn } from 'bun:test';
import { explanationDepth } from '../src/lib/crew/explanation';
import { generateExplanation, validEvidenceNotes } from '../src/lib/server/gemini';
import { explainLearning } from '../src/lib/server/learning-ai';

const explanation = {
  summary: 'The reported shorter night needs context.',
  uncertainty: 'The cause of the change is not established.',
  actionReason: 'Reviewing the assigned schedule helps put the diary in context.',
  sourceIds: ['study'],
  evidenceNotes: [
    {
      evidenceId: 'reading-0',
      text: 'This is a sleep diary entry, not a ring measurement.',
      sourceId: 'study',
    },
  ],
};
const request = {
  kind: 'guided',
  scenario: 'archer',
  step: 1,
  answer: 'schedule',
  practiced: false,
  outcome: '',
} as const;
const response = (value: unknown) =>
  Response.json({
    candidates: [
      {
        finishReason: 'STOP',
        content: {
          parts: [
            { thought: true, text: 'Internal text must never enter the explanation.' },
            { text: JSON.stringify(value) },
          ],
        },
      },
    ],
  });

test('depth is a closed choice; arbitrary model IDs and objects are rejected', () => {
  expect(explanationDepth(undefined)).toBe('quick');
  expect(explanationDepth('detailed')).toBe('detailed');
  for (const v of [null, 'gemini-4-carbon', {}, ['detailed'], true])
    expect(explanationDepth(v)).toBeNull();
});
test('each evidence note must refer to supplied evidence and one of its cited sources', () => {
  expect(validEvidenceNotes(explanation.evidenceNotes, ['reading-0'], ['study'], true)).toBe(true);
  for (const notes of [
    undefined,
    [],
    [{ ...explanation.evidenceNotes[0], evidenceId: 'invented' }],
    [{ ...explanation.evidenceNotes[0], sourceId: 'external' }],
    [explanation.evidenceNotes[0], explanation.evidenceNotes[0]],
    [{ ...explanation.evidenceNotes[0], text: 'x'.repeat(601) }],
  ]) {
    expect(validEvidenceNotes(notes, ['reading-0'], ['study'], true)).toBe(false);
  }
});
test('quick and detailed requests route to separate configured models with bounded thinking', async () => {
  for (const depth of ['quick', 'detailed'] as const) {
    let calls = 0;
    const result = await explainLearning(request, {
      apiKey: 'test',
      model: 'gemini-3.8-flash',
      detailModel: 'gemini-3.1-pro-preview',
      depth,
      fetcher: async (url, init) => {
        calls++;
        expect(url).toContain(depth === 'quick' ? 'gemini-3.8-flash' : 'gemini-3.1-pro-preview');
        const body = JSON.parse(String(init.body));
        expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe(
          depth === 'quick' ? 'low' : 'medium',
        );
        expect(body.generationConfig.maxOutputTokens).toBe(depth === 'quick' ? 4096 : 8192);
        expect(
          body.generationConfig.responseJsonSchema.properties.evidenceNotes.items.properties
            .evidenceId.enum,
        ).toEqual(['reading-0', 'reading-1', 'reading-2']);
        return response(explanation);
      },
    });
    expect(result.mode).toBe('ai');
    expect(calls).toBe(1);
    if (result.mode === 'ai') expect(result.explanation).toEqual(explanation);
  }
});
test('invented annotations or missing detailed evidence fall back without another paid request', async () => {
  for (const value of [
    { ...explanation, evidenceNotes: undefined },
    {
      ...explanation,
      evidenceNotes: [{ ...explanation.evidenceNotes[0], evidenceId: 'future-day' }],
    },
  ]) {
    let calls = 0;
    const result = await explainLearning(request, {
      apiKey: 'test',
      depth: 'detailed',
      fetcher: async () => {
        calls++;
        return response(value);
      },
    });
    expect(result).toEqual({ mode: 'local', reason: 'unavailable' });
    expect(calls).toBe(1);
  }
});
test('identical concurrent requests share one provider call and validated results are cached', async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const mocked = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async () => {
        calls++;
        await gate;
        return response(explanation);
      },
      { preconnect: () => {} },
    ),
  );
  const input = {
    instruction: 'cache-test',
    evidence: { test: 'cache-only' },
    schema: {},
    validate: (v: unknown): v is typeof explanation =>
      !!v && typeof v === 'object' && 'summary' in v,
  };
  try {
    const options = { apiKey: 'cache-unit-test-only' };
    const first = generateExplanation(input, options);
    const second = generateExplanation(input, options);
    expect(calls).toBe(1);
    release();
    expect(await first).toEqual(await second);
    await generateExplanation(input, options);
    expect(calls).toBe(1);
    await generateExplanation(input, { ...options, depth: 'detailed' });
    expect(calls).toBe(2);
  } finally {
    release();
    mocked.mockRestore();
  }
});
test('malformed provider output is not cached', async () => {
  let calls = 0;
  const mocked = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async () => {
        calls++;
        return response({});
      },
      { preconnect: () => {} },
    ),
  );
  try {
    for (let i = 0; i < 2; i++)
      await expect(
        generateExplanation(
          {
            instruction: 'invalid-test',
            evidence: {},
            schema: {},
            validate: (_v: unknown): _v is string => false,
          },
          { apiKey: 'invalid-unit-test-only' },
        ),
      ).rejects.toThrow('Invalid explanation');
    expect(calls).toBe(2);
  } finally {
    mocked.mockRestore();
  }
});
