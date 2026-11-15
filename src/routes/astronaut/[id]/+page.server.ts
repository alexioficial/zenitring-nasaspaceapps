import { error, redirect } from '@sveltejs/kit';
import { crewDefaults } from '$lib/crew/model';
import { firstVisitTarget, onboardedCookie } from '$lib/crew/workspace';
import type { PageServerLoad } from './$types';

// Server-side so the first visit redirects before anything renders: no flash of Health.
export const load: PageServerLoad = ({ params, url, cookies }) => {
  if (!crewDefaults.some((member) => member.id === params.id))
    error(404, 'This astronaut monitor link is not valid.');
  const cookie = onboardedCookie(params.id);
  if (!cookies.get(cookie)) {
    // Any first visit counts, so only the very first one is redirected.
    // `secure` must follow the protocol: the demo runs over plain HTTP on the LAN.
    cookies.set(cookie, '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
    });
    const target = firstVisitTarget(url);
    if (target) redirect(307, target.pathname + target.search);
  }
  return { astronautId: params.id };
};
