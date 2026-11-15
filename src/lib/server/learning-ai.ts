import type { EvidenceNote } from '../crew/explanation';
import {
  generateExplanation,
  explanationSchema,
  validEvidenceNotes,
  type GeminiOptions,
} from './gemini';
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
  evidenceNotes?: EvidenceNote[];
  summary: string;
  uncertainty: string;
  actionReason: string;
  sourceIds: string[];
};
export async function explainLearning(request: LearningRequest, options: GeminiOptions = {}) {
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
  const evidenceItems = step
    ? step.readings.map((r, i) => ({ evidenceId: `reading-${i}`, ...r }))
    : [{ evidenceId: 'risk-context', label: risk.title, context: risk.meaning }];
  const evidenceIds = evidenceItems.map((e) => e.evidenceId);
  try {
    const result = await generateExplanation<LearningExplanation>(
      {
        instruction:
          'Explain space health education. In general education, no personal readings or symptoms are known: never imply this risk is occurring in the person. In guided practice, all readings and responses are fictional; do not attribute them to a real astronaut. Bubble counts require calibration for dose: never convert them to dose, probabilities or safe locations. Do not infer a cause of concentration changes or recovery from longer sleep. The supplied reading sources distinguish diaries and self-reports from sensors.',
        evidence: {
          mode: scenario ? 'guided practice' : 'general education',
          evidence: step,
          evidenceItems,
          context:
            request.kind === 'guided'
              ? {
                  answer: request.answer,
                  practiced: request.practiced,
                  outcome: request.outcome,
                  response: learningResponse(request.scenario, request.answer, request.practiced),
                }
              : null,
          nextStep: step?.action ?? risk.action,
          unknown: step?.missing ?? risk.missing,
          background,
        },
        schema: explanationSchema(allowedIds, evidenceIds),
        validate: (value): value is LearningExplanation => {
          if (!value || typeof value !== 'object') return false;
          const v = value as LearningExplanation;
          return (
            ['summary', 'uncertainty', 'actionReason'].every((k) => {
              const text = v[k as keyof LearningExplanation];
              return typeof text === 'string' && text.trim().length > 0 && text.length <= 700;
            }) &&
            Array.isArray(v.sourceIds) &&
            v.sourceIds.length > 0 &&
            v.sourceIds.length <= 2 &&
            v.sourceIds.every((id) => allowedIds.includes(id)) &&
            validEvidenceNotes(
              v.evidenceNotes,
              evidenceIds,
              v.sourceIds,
              options.depth === 'detailed',
            )
          );
        },
      },
      options,
    );
    return { mode: 'ai' as const, ...result };
  } catch {
    return { mode: 'local' as const, reason: 'unavailable' };
  }
}
