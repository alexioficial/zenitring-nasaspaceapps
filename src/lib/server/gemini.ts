import { createHash } from 'node:crypto';
import type { ExplanationDepth, EvidenceNote } from '../crew/explanation';

export const defaultModel = 'gemini-3.8-flash';
export const defaultDetailModel = 'gemini-3.1-pro-preview';
export type GeminiOptions = {
  apiKey?: string;
  model?: string;
  detailModel?: string;
  depth?: ExplanationDepth;
  fetcher?: (url: string, init: RequestInit) => Promise<Response>;
};
type Cached = { value: unknown; expires: number };
const cache = new Map<string, Cached>();
const pending = new Map<string, Promise<unknown>>();
const ttl = 5 * 60_000;
const maxEntries = 100;

export function explanationSchema(sourceIds: string[], evidenceIds: string[]) {
  return {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      uncertainty: { type: 'string' },
      actionReason: { type: 'string' },
      sourceIds: { type: 'array', items: { type: 'string', enum: sourceIds } },
      evidenceNotes: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            evidenceId: { type: 'string', enum: evidenceIds },
            text: { type: 'string' },
            sourceId: { type: 'string', enum: sourceIds },
          },
          required: ['evidenceId', 'text', 'sourceId'],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'uncertainty', 'actionReason', 'sourceIds', 'evidenceNotes'],
    additionalProperties: false,
  };
}
export function validEvidenceNotes(
  notes: unknown,
  evidenceIds: string[],
  sourceIds: string[],
  required = false,
): notes is EvidenceNote[] | undefined {
  if (notes === undefined) return !required;
  return (
    Array.isArray(notes) &&
    notes.length > 0 &&
    notes.length <= 3 &&
    new Set(notes.map((n) => n?.evidenceId)).size === notes.length &&
    notes.every(
      (n) =>
        n &&
        typeof n === 'object' &&
        evidenceIds.includes(n.evidenceId) &&
        sourceIds.includes(n.sourceId) &&
        typeof n.text === 'string' &&
        n.text.trim().length > 0 &&
        n.text.length <= 600,
    )
  );
}

export const explanationInstruction = `Write in English, addressing the astronaut in plain language. Use only supplied evidence and source context. Explain the relationship between observations and why the supplied next step is useful. Do not invent causes, symptoms, numbers, thresholds, probabilities, diagnoses, treatment, safety clearance or suit adjustments. Do not change or contradict the supplied next step. Do not claim that NASA validates this algorithm. Summary: at most 45 words. Uncertainty: at most 35 words about what this evidence cannot establish. actionReason: at most 60 words explaining the supplied next step. evidenceNotes: one to three distinct observations, each referencing an allowed evidenceId and sourceId; describe its significance in at most 50 words without repeating the measurements or giving new instructions. Each note's sourceId must also occur in sourceIds. Distinguish observed change from a possible explanation. Source context is educational, not proof of a cause. The interface already labels simulated data: do not repeatedly say fictional, synthetic, educational or demo. Use short concrete sentences, not phrases such as contextualizes, underscores the importance or comprehensive tracking. State the specific missing context once, rather than a list of generic limitations. Do not equate lack of a triggered change with an unchanged value. Avoid speculative explanations about movement or environmental causes unless supplied as confirmed context.`;

/** Cache only validated output; identical requests share a single provider call. No retries or hidden model escalation. */
export async function generateExplanation<T>(
  input: {
    instruction: string;
    evidence: unknown;
    schema: unknown;
    validate: (value: unknown) => value is T;
  },
  options: GeminiOptions,
): Promise<{ model: string; explanation: T }> {
  const detailed = options.depth === 'detailed';
  const model = detailed
    ? options.detailModel || defaultDetailModel
    : options.model || defaultModel;
  const body = JSON.stringify({
    systemInstruction: {
      parts: [
        {
          text: `${explanationInstruction} ${input.instruction} ${
            detailed
              ? 'Use the evidenceNotes to explain up to three distinct relationships and their limits. Connect them to the source context.'
              : 'Keep the answer concise. Prefer one or two evidenceNotes about the most relevant observations.'
          }`,
        },
      ],
    },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input.evidence) }] }],
    generationConfig: {
      maxOutputTokens: detailed ? 8192 : 4096,
      ...(model.startsWith('gemini-3') || model.startsWith('gemini-4')
        ? { thinkingConfig: { thinkingLevel: detailed ? 'medium' : 'low' } }
        : {}),
      responseMimeType: 'application/json',
      responseJsonSchema: input.schema,
    },
  });
  // Key is a digest; credentials and evidence are never retained as map keys or logged.
  const key = createHash('sha256').update(`${options.apiKey}:${model}:${body}`).digest('hex');
  const useCache = !options.fetcher;
  const hit = useCache ? cache.get(key) : undefined;
  if (hit && hit.expires > Date.now()) return { model, explanation: hit.value as T };
  if (useCache) cache.delete(key);
  const run = async (): Promise<T> => {
    const response = await (options.fetcher ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': options.apiKey! },
        body,
        signal: AbortSignal.timeout(detailed ? 55_000 : 25_000),
      },
    );
    if (!response.ok) throw Error('Provider unavailable');
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate?.finishReason !== 'STOP' || !Array.isArray(candidate.content?.parts))
      throw Error('Incomplete explanation');
    const value: unknown = JSON.parse(
      candidate.content.parts
        .filter(
          (p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === 'string',
        )
        .map((p: { text: string }) => p.text)
        .join(''),
    );
    if (!input.validate(value)) throw Error('Invalid explanation');
    if (useCache) {
      for (const [id, entry] of cache) if (entry.expires <= Date.now()) cache.delete(id);
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value!);
      cache.set(key, { value, expires: Date.now() + ttl });
    }
    return value;
  };
  let task = useCache ? (pending.get(key) as Promise<T> | undefined) : undefined;
  if (!task) {
    if (useCache && pending.size >= 15) throw Error('Busy');
    task = run();
    if (useCache) pending.set(key, task);
  }
  try {
    return { model, explanation: await task };
  } finally {
    if (useCache && pending.get(key) === task) pending.delete(key);
  }
}
