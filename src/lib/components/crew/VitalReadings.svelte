<script lang="ts">
  import Icon, { type IconName } from '../Icon.svelte';
  import { activeSource, suitInfo, suitKeys } from '$lib/crew/suit';
  import { freshness, ageLabel, metricInfo } from '$lib/crew/model';
  import type { CrewMember, MetricKey } from '$lib/crew/types';
  let { member, online, now }: { member: CrewMember; online: boolean; now: number } = $props();
  let source = $derived(activeSource(member));
  let state = $derived(
    online
      ? freshness(source.connected, source.latest?.receivedAt ?? null, source.intervalMs, now)
      : 'offline',
  );
  const ringRows: { key: MetricKey; icon: IconName; label: string }[] = [
    { key: 'pulse', icon: 'heart', label: 'Heart rate' },
    { key: 'spo2', icon: 'oxygen', label: 'SpO₂' },
    { key: 'respiration', icon: 'lungs', label: 'Respiration' },
    { key: 'skin', icon: 'temperature', label: 'Skin deviation' },
  ];
</script>

{#if !source.latest}
  <!-- Nothing received yet: no table of dashes, just the plain fact. -->
  <p class="medbay-measured medbay-no-readings">No readings yet.</p>
{:else}
  <div class="medbay-vitals-heading">
    <h2>Your readings</h2>
    <span class="vitals-state" class:is-live={state === 'live'}
      >{state === 'live' ? 'Live' : 'Last known'}</span
    >
  </div>
  <dl
    class="medbay-vitals"
    class:medbay-suit-vitals={source.type === 'spacesuit'}
    class:medbay-retained={state !== 'live'}
  >
    {#if source.type === 'ring'}
      {#each ringRows as row}
        <div>
          <dt><Icon name={row.icon} size={24} /><span>{row.label}</span></dt>
          <dd>
            {member.latest
              ? member.latest.values[row.key].toFixed(metricInfo[row.key].digits)
              : '—'}<small>{metricInfo[row.key].unit}</small>
          </dd>
        </div>
      {/each}
    {:else}
      {#each suitKeys as key}
        <div>
          <dt>
            <Icon
              name={key === 'pulse' ? 'heart' : key === 'temperature' ? 'temperature' : 'pulse'}
              size={23}
            /><span>{suitInfo[key].label}</span>
          </dt>
          <dd>
            {member.suit.latest?.values[key].toFixed(suitInfo[key].digits) ?? '—'}<small
              >{suitInfo[key].unit}</small
            >
          </dd>
        </div>
      {/each}
    {/if}
  </dl>
  {#if source.type === 'ring'}<p class="medbay-secondary-metric">
      <Icon name="pulse" size={17} />HRV
      <strong
        >{member.latest ? member.latest.values.hrv.toFixed(metricInfo.hrv.digits) : '—'} ms</strong
      >
    </p>{/if}
  <p class="medbay-measured">Updated {ageLabel(source.latest.receivedAt, now)}</p>
  {#if source.type === 'spacesuit'}<p class="medbay-measured">
      Suit oxygen is atmospheric pressure, not blood SpO₂.
    </p>{/if}
{/if}
