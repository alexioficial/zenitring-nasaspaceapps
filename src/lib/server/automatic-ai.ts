import { initialCrew, validMetrics } from '../crew/model';
import { validSuitMetrics } from '../crew/suit';
import {
  analyzeSignals,
  contextualize,
  automaticSources,
  type AutomaticAnswer,
} from '../crew/automatic';
import type { CrewMember } from '../crew/types';

export type AIExplanation = {
  summary: string;
  uncertainty: string;
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
const schema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    uncertainty: { type: 'string' },
    sourceIds: { type: 'array', items: { type: 'string', enum: Object.keys(automaticSources) } },
  },
  required: ['summary', 'uncertainty', 'sourceIds'],
  additionalProperties: false,
};
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
    Array.isArray(x.sourceIds) &&
    x.sourceIds.length > 0 &&
    x.sourceIds.length <= 3 &&
    x.sourceIds.every((id) => Object.hasOwn(automaticSources, id))
  );
}
export async function explainAutomatic(
  member: CrewMember,
  answer: AutomaticAnswer | null,
  options: {
    apiKey?: string;
    model?: string;
    fetcher?: (url: string, init: RequestInit) => Promise<Response>;
    now?: number;
  } = {},
): Promise<AIResult> {
  const assessment = analyzeSignals(member, options.now ?? Date.now());
  if (assessment.state !== 'review' || answer === 'unwell' || answer === 'alert')
    return { mode: 'local', reason: 'not-applicable' };
  if (!options.apiKey) return { mode: 'local', reason: 'not-configured' };
  const model = options.model || 'gemini-3.5-flash-lite';
  const sourceIds = [...new Set([assessment.sourceId, 'medical'])];
  const background = {
    exercise:
      'NASA describes exercise as a countermeasure for altered-gravity effects. Heart rate alone does not identify a cause.',
    suit: 'NASA-STD-3001 section 11.3 covers suit pressure, oxygen and carbon dioxide recording, display and alerts. This synthetic detector does not implement safe limits.',
    medical:
      'NASA medical operations includes crew medical support and mission-specific procedures.',
  };
  try {
    const response = await (options.fetcher ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': options.apiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You explain synthetic telemetry for ZENIT, a NASA Space Apps proof of concept. Write English. Explain possible contributors, never a diagnosis. Use only supplied observations and explicitly confirmed context. Do not invent symptoms, probabilities, baseline health, sensor accuracy or treatment. Do not give medication, suit controls or medical clearance. Do not declare the user safe. State only the unknowns relevant to this pattern. Discuss only the supplied source: do not mention suit atmosphere for ring data. If no activity was confirmed, do not claim exercise occurred. Suit atmosphere is not blood oxygen or body temperature. NASA context is background, not validation of this algorithm. Keep summary and uncertainty each under 90 words. Cite only supplied source IDs. Your output cannot change the detector or next steps.',
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: JSON.stringify({
                    observations: assessment.observations,
                    pattern: assessment.kind,
                    source: assessment.source,
                    confirmedAnswer: answer,
                    localContext: contextualize(assessment, answer),
                    background: Object.fromEntries(
                      sourceIds.map((id) => [id, background[id as keyof typeof background]]),
                    ),
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
          },
        }),
      },
    );
    if (!response.ok) return { mode: 'local', reason: 'unavailable' };
    const body = await response.json();
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason !== 'STOP' || !Array.isArray(candidate.content?.parts))
      return { mode: 'local', reason: 'unavailable' };
    const text = candidate.content.parts
      .filter(
        (part: { thought?: boolean; text?: string }) =>
          !part.thought && typeof part.text === 'string',
      )
      .map((part: { text: string }) => part.text)
      .join('');
    const explanation: unknown = JSON.parse(text);
    return validAIExplanation(explanation) &&
      explanation.sourceIds.every((id) => sourceIds.includes(id))
      ? { mode: 'ai', model, measuredAt: assessment.measuredAt!, explanation }
      : { mode: 'local', reason: 'unavailable' };
  } catch {
    return { mode: 'local', reason: 'unavailable' };
  }
}
