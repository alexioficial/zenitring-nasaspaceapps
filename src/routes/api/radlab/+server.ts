import { json } from '@sveltejs/kit';
import { refreshRadiation, type RadiationSeries } from '$lib/nasa/radlab';

let cached: RadiationSeries | undefined;
let expires = 0;
let inflight: Promise<RadiationSeries> | undefined;
export async function GET() {
  if (!cached || Date.now() >= expires) {
    inflight ??= refreshRadiation().finally(() => {
      inflight = undefined;
    });
    cached = await inflight;
    expires = Date.now() + (cached.mode === 'refreshed' ? 300_000 : 30_000);
  }
  return json(cached, { headers: { 'Cache-Control': 'no-store' } });
}
