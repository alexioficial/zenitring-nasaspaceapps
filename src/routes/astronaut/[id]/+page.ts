import { error } from '@sveltejs/kit';
import { crewDefaults } from '$lib/crew/model';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  if (!crewDefaults.some((member) => member.id === params.id))
    error(404, 'This astronaut monitor link is not valid.');
  return { astronautId: params.id };
};
