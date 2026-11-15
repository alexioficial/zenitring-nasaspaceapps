<script lang="ts">
  import { externalInstruments, nightSummary, type Mission } from '$lib/mission';
  import Observations from './Observations.svelte';
  import Icon from './Icon.svelte';
  let { mission, onSync }: { mission: Mission; onSync: () => void } = $props();
  let current = $derived(
    mission.observations
      .filter((o) => ['respiration', 'activity'].includes(o.id))
      .map((o) => ({ ...o, available: mission.sensorConnected && o.available })),
  );
  let instruments = $derived(
    externalInstruments.map((o) => mission.observations.find((saved) => saved.id === o.id) ?? o),
  );
</script>

<section class="vitals-board" aria-labelledby="auto-title">
  <div class="section-heading">
    <div>
      <h2 id="auto-title">Already collected for you</h2>
      <p>Every saved moment keeps its readings, source and measurement period.</p>
    </div>
  </div>
  <Observations observations={[...current, ...nightSummary]} />
  <details class="source-details instruments">
    <summary
      ><Icon name="pulse" size={17} />External measurements · {instruments.filter(
        (o) => o.available,
      ).length} / 4 available</summary
    >
    <p>
      Blood pressure, glucose, body temperature and SpO₂ come from separate instruments. A sync
      fills these fields automatically.
    </p>
    <Observations observations={instruments} compact /><button
      class="button secondary"
      onclick={onSync}>Simulate instrument sync <Icon name="arrow" size={16} /></button
    >
    <p class="small-note">Demo imports only. No instruments are connected.</p>
  </details>
</section>
