<script lang="ts">
  import { timestamp, type Observation } from '$lib/mission';
  let { observations, compact = false }: { observations: Observation[]; compact?: boolean } = $props();
</script>
<dl class="observations" class:compact>
  {#each observations as item (item.id)}
    <div class="observation" class:unavailable={!item.available}>
      <dt>{item.label}</dt><dd>{item.available ? item.value : '—'}{#if item.available && item.unit}<small>{item.unit}</small>{/if}</dd>
      <span>{item.source}</span><span>{item.available ? item.period : 'No current reading'}{item.available && ['Current sample', 'Spot measurement'].includes(item.period) ? ` · ${timestamp(item.time)} UTC` : ''}</span>
    </div>
  {/each}
</dl>
