import {
  guidedScenarios,
  learningResponse,
  spaceRisks,
  type GuidedScenario,
  type LearningAnswer,
} from '../crew/health-learning';

export type LearningRequest =
  | { kind: 'risk'; riskId: string }
  | {
      kind: 'guided';
      scenario: GuidedScenario;
      step: number;
      answer: LearningAnswer;
      practiced: boolean;
      outcome: '' | 'better' | 'same' | 'worse';
    };
export function parseLearningRequest(raw: unknown): LearningRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (
    v.kind === 'risk' &&
    typeof v.riskId === 'string' &&
    spaceRisks.some((r) => r.id === v.riskId)
  )
    return { kind: 'risk', riskId: v.riskId };
  if (
    v.kind === 'guided' &&
    (v.scenario === 'archer' || v.scenario === 'radin2') &&
    Number.isInteger(v.step) &&
    Number(v.step) >= 0 &&
    Number(v.step) <= 2 &&
    (v.answer === null ||
      v.answer === 'schedule' ||
      v.answer === 'unsure' ||
      v.answer === 'unwell') &&
    typeof v.practiced === 'boolean' &&
    ['', 'better', 'same', 'worse'].includes(String(v.outcome)) &&
    typeof v.outcome === 'string'
  ) {
    if (v.scenario === 'radin2' && (v.answer !== null || v.outcome !== '')) return null;
    return {
      kind: 'guided',
      scenario: v.scenario,
      step: v.step as number,
      answer: v.answer as LearningAnswer,
      practiced: v.practiced,
      outcome: v.outcome as '' | 'better' | 'same' | 'worse',
    };
  }
  return null;
}
export type LearningExplanation = {
  summary: string;
  uncertainty: string;
  actionReason: string;
  sourceIds: string[];
};
export async function explainLearning(
  request: LearningRequest,
  options: {
    apiKey?: string;
    model?: string;
    fetcher?: (url: string, init: RequestInit) => Promise<Response>;
  } = {},
) {
  if (request.kind === 'guided' && (request.answer === 'unwell' || request.outcome === 'worse'))
    return { mode: 'local' as const, reason: 'not-applicable' };
  if (!options.apiKey) return { mode: 'local' as const, reason: 'not-configured' };
  const scenario = request.kind === 'guided' ? guidedScenarios[request.scenario] : null;
  const risk = spaceRisks.find(
    (r) => r.id === (request.kind === 'risk' ? request.riskId : scenario!.risk),
  )!;
  const step = request.kind === 'guided' ? scenario!.steps[request.step] : null;
  const background = {
    risk: { title: risk.title, url: risk.url, context: risk.meaning },
    ...(scenario ? { study: scenario.source } : {}),
  };
  const allowedIds = Object.keys(background);
  const model = options.model || 'gemini-3.5-flash-lite';
  try {
    const response = await (options.fetcher ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'Explain space health education in English using only the supplied evidence and sources. Address the astronaut in plain language. This is a synthetic demonstration, not a clinical risk assessment. If mode is general education, no personal readings or symptoms are known: never imply this risk is occurring in the person. If mode is guided practice, all readings and responses are fictional; do not attribute them to a real astronaut. Summary: at most 45 words connecting observations to the relevant risk. Uncertainty: at most 25 words about missing information. actionReason: at most 45 words explaining why the supplied next step is useful and how the supplied context helps. Do not add, replace, or contradict the next step; the interface displays it independently. Do not give treatments, medications, numerical thresholds, emergency procedures, suit adjustments, dose conversions, risk probabilities or medical clearance. Do not infer causation, recovery, safe locations, sleep or mental state from sensors. Radiation bubble counts require calibration for dose. NASA research supports educational context, not validation of ZENIT. Cite only the supplied source IDs.',
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: JSON.stringify({
                    mode: scenario ? 'guided practice' : 'general education',
                    evidence: step,
                    context:
                      request.kind === 'guided'
                        ? {
                            answer: request.answer,
                            practiced: request.practiced,
                            outcome: request.outcome,
                            response: learningResponse(
                              request.scenario,
                              request.answer,
                              request.practiced,
                            ),
                          }
                        : null,
                    nextStep: step?.action ?? risk.action,
                    unknown: step?.missing ?? risk.missing,
                    background,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                uncertainty: { type: 'string' },
                actionReason: { type: 'string' },
                sourceIds: { type: 'array', items: { type: 'string', enum: allowedIds } },
              },
              required: ['summary', 'uncertainty', 'actionReason', 'sourceIds'],
              additionalProperties: false,
            },
          },
        }),
      },
    );
    if (!response.ok) throw Error();
    const body = await response.json();
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason !== 'STOP' || !Array.isArray(candidate.content?.parts))
      throw Error();
    const result = JSON.parse(
      candidate.content.parts
        .filter(
          (p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === 'string',
        )
        .map((p: { text: string }) => p.text)
        .join(''),
    );
    if (
      !result ||
      !['summary', 'uncertainty', 'actionReason'].every(
        (k) =>
          typeof result[k] === 'string' && result[k].trim().length > 0 && result[k].length <= 700,
      ) ||
      !Array.isArray(result.sourceIds) ||
      !result.sourceIds.length ||
      result.sourceIds.length > 2 ||
      !result.sourceIds.every((id: unknown) => typeof id === 'string' && allowedIds.includes(id))
    )
      throw Error();
    return { mode: 'ai' as const, model, explanation: result as LearningExplanation };
  } catch {
    return { mode: 'local' as const, reason: 'unavailable' };
  }
}
