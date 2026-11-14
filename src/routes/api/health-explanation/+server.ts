import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { explainAutomatic, parseAutomaticRequest } from '$lib/server/automatic-ai';
import type { RequestHandler } from './$types';

let windowStart = 0,
  requests = 0;
const headers = { 'Cache-Control': 'no-store' };
export const POST: RequestHandler = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin)
    return json({ error: 'Same-origin requests only.' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'JSON required.' }, { status: 415, headers });
  // Bound the body while reading, rather than trusting Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing evidence.' }, { status: 400, headers });
  const decoder = new TextDecoder();
  let bytes = 0,
    text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 48000) {
      await reader.cancel();
      return json({ error: 'Evidence is too large.' }, { status: 413, headers });
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  let parsed;
  try {
    parsed = parseAutomaticRequest(JSON.parse(text));
  } catch {
    return json({ error: 'Invalid evidence.' }, { status: 400, headers });
  }
  if (!parsed) return json({ error: 'Invalid evidence.' }, { status: 400, headers });
  if (Date.now() - windowStart > 60000) {
    windowStart = Date.now();
    requests = 0;
  }
  if (++requests > 15)
    return json({ mode: 'local', reason: 'unavailable' }, { status: 429, headers });
  const result = await explainAutomatic(parsed.member, parsed.answer, {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  });
  return json(result, { headers });
};
