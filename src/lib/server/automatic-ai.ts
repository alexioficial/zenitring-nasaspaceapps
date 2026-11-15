import type { EvidenceNote } from '../crew/explanation';
import {
  generateExplanation,
  explanationSchema,
  validEvidenceNotes,
  type GeminiOptions,
} from './gemini';
import { initialCrew, validMetrics } from '../crew/model';
import { validSuitMetrics } from '../crew/suit';
import {
  analyzeSignals,
  contextualize,
  automaticSources,
  type AutomaticAnswer,
} from '../crew/automatic';
import type { CrewMember } from '../crew/types';
import { healthInsight } from '../crew/health-insight';

export type AIExplanation = {
  evidenceNotes?: EvidenceNote[];
  summary: string;
  uncertainty: string;
  actionReason?: string;
  sourceIds: (keyof typeof automaticSources)[];
};
export type AIResult =
  | { mode: 'ai'; model: string; measuredAt: number; explanation: AIExplanation }
  | { mode: 'local'; reason: 'not-configured' | 'not-applicable' | 'unavailable' };
const answers = ['resting', 'finished', 'active', 'unwell', 'check-fit', 'alert', 'no-alert'];
export function parseAutomaticRequest(
  raw: unknown,
): { member: CrewMember; answer: AutomaticAnswer | null } | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (
    typeof v.source !== 'string' ||
    typeof v.phase !== 'string' ||
    !['ring', 'spacesuit'].includes(v.source) ||
    !['cabin', 'spacewalk', 'recovery'].includes(String(v.phase)) ||
    (v.source === 'spacesuit') !== (v.phase === 'spacewalk') ||
    !Array.isArray(v.samples) ||
    v.samples.length < 9 ||
    v.samples.length > 120 ||
    typeof v.phaseStart !== 'number' ||
    !Number.isFinite(v.phaseStart) ||
    v.phaseStart < 0 ||
    !(v.answer === null || (typeof v.answer === 'string' && answers.includes(v.answer)))
  )
    return null;
  const interval = v.intervalMs ?? 3000;
  if (
    typeof interval !== 'number' ||
    !Number.isInteger(interval) ||
    interval < 1000 ||
    interval > 15000
  )
    return null;
  const c = initialCrew()[0];
  c.config.intervalMs = interval;
  c.phase = v.phase as CrewMember['phase'];
  c.phaseHistory = [{ phase: c.phase, changedAt: v.phaseStart }];
  c.deviceId = 'synthetic-ring';
  c.connected = true;
  c.suit.deviceId = 'synthetic-suit';
  c.suit.connected = true;
  for (const [i, item] of v.samples.entries()) {
    if (!item || typeof item !== 'object') return null;
    const s = item as Record<string, unknown>;
    if (
      typeof s.measuredAt !== 'number' ||
      !Number.isFinite(s.measuredAt) ||
      s.measuredAt < 0 ||
      typeof s.receivedAt !== 'number' ||
      !Number.isFinite(s.receivedAt) ||
      s.receivedAt < 0
    )
      return null;
    const base = {
      id: `sample-${i}`,
      astronautId: c.id,
      measuredAt: s.measuredAt,
      receivedAt: s.receivedAt,
    };
    if (v.source === 'ring') {
      if (!validMetrics(s.values)) return null;
      c.samples.push({ ...base, deviceId: 'synthetic-ring', values: { ...s.values } });
    } else {
      if (!validSuitMetrics(s.values)) return null;
      c.suit.samples.push({
        ...base,
        deviceId: 'synthetic-suit',
        sourceType: 'spacesuit',
        values: { ...s.values },
      });
    }
  }
  c.samples.sort((a, b) => a.measuredAt - b.measuredAt);
  c.suit.samples.sort((a, b) => a.measuredAt - b.measuredAt);
  c.latest = c.samples.at(-1) ?? null;
  c.suit.latest = c.suit.samples.at(-1) ?? null;
  return { member: c, answer: v.answer as AutomaticAnswer | null };
}
export function validAIExplanation(v: unknown): v is AIExplanation {
  if (!v || typeof v !== 'object') return false;
  const x = v as AIExplanation;
  return (
    typeof x.summary === 'string' &&
    x.summary.trim().length > 0 &&
    x.summary.length <= 700 &&
    typeof x.uncertainty === 'string' &&
    x.uncertainty.trim().length > 0 &&
    x.uncertainty.length <= 700 &&
    (x.actionReason === undefined ||
      (typeof x.actionReason === 'string' &&
        x.actionReason.trim().length > 0 &&
        x.actionReason.length <= 700)) &&
    Array.isArray(x.sourceIds) &&
    x.sourceIds.length > 0 &&
    x.sourceIds.length <= 3 &&
    x.sourceIds.every((id) => Object.hasOwn(automaticSources, id))
  );
}
export async function explainAutomatic(
  member: CrewMember,
  answer: AutomaticAnswer | null,
  options: GeminiOptions & { now?: number } = {},
): Promise<AIResult> {
  const assessment = analyzeSignals(member, options.now ?? Date.now());
  if (assessment.state !== 'review' || answer === 'unwell' || answer === 'alert')
    return { mode: 'local', reason: 'not-applicable' };
  if (!options.apiKey) return { mode: 'local', reason: 'not-configured' };
  const sourceIds = [...new Set([assessment.sourceId, 'medical'])];
  if (assessment.kind === 'pulse-rise') sourceIds.push('cardiovascularRisk');
  if (assessment.kind === 'suit-change') sourceIds.push('spacewalkRisk');
  const background = Object.fromEntries(
    sourceIds.map((id) => {
      const source = automaticSources[id as keyof typeof automaticSources];
      return [
        id,
        {
          title: source.title,
          url: source.url,
          context: source.context,
          relevance: source.relevance,
        },
      ];
    }),
  );
  const evidenceIds = assessment.observations.map((o) => o.metric);
  try {
    const result = await generateExplanation<AIExplanation>(
      {
        instruction:
          'You explain synthetic telemetry for ZENIT. Interpret only the supplied device and phase. Suit atmosphere is not blood oxygen or body temperature. If no activity was confirmed, do not claim exercise occurred. Never infer sleep, mood, recovery or exertion safety from these signals. Earlier and recent values are short-window medians, not a clinical baseline. Prioritize observations with triggered=true; mention unchanged observations only when useful.',
        evidence: {
          observations: assessment.observations.map((o) => ({ ...o, evidenceId: o.metric })),
          pattern: assessment.kind,
          source: assessment.source,
          confirmedAnswer: answer,
          localContext: contextualize(assessment, answer),
          nextStep: healthInsight(assessment, answer).action,
          background,
        },
        schema: explanationSchema(sourceIds, evidenceIds),
        validate: (value): value is AIExplanation =>
          validAIExplanation(value) &&
          value.sourceIds.every((id) => sourceIds.includes(id)) &&
          validEvidenceNotes(
            value.evidenceNotes,
            evidenceIds,
            value.sourceIds,
            options.depth === 'detailed',
          ),
      },
      options,
    );
    return { mode: 'ai', ...result, measuredAt: assessment.measuredAt! };
  } catch {
    return { mode: 'local', reason: 'unavailable' };
  }
}
