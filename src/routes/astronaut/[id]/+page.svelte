<script lang="ts">
  import MissionWorkspace from '$lib/components/crew/MissionWorkspace.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

{#key data.astronautId}
  <MissionWorkspace astronautId={data.astronautId} />
{/key}
