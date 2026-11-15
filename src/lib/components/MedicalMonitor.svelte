<script lang="ts">
  import { timestamp, type Mission } from '$lib/mission';
  import Icon from './Icon.svelte';
  import Observations from './Observations.svelte';
  let { mission }: { mission: Mission } = $props();
  let received = $derived(
    mission.entries
      .filter((e) => e.receivedAt !== null)
      .slice()
      .reverse(),
  );
</script>

<section class="panel medical" aria-labelledby="medical-title">
  <div class="panel-heading">
    <div>
      <h2 id="medical-title">Medical monitor</h2>
      <p>Reception · Crew member 01</p>
    </div>
    <span class="connection" class:offline={!mission.monitorConnected}
      ><Icon
        name={mission.monitorConnected ? 'link' : 'unlink'}
        size={16}
      />{mission.monitorConnected ? 'Link active' : 'Offline'}</span
    >
  </div>
  <div class="medical-content">
    <div class="medical-last">
      <span>Last received reading</span><strong data-testid="remote-pulse"
        >{mission.remote.pulse} <small>bpm</small></strong
      >
      <p>{mission.remote.source}</p>
      <dl>
        <dt>Measured</dt>
        <dd data-testid="remote-time">{timestamp(mission.remote.time)} UTC</dd>
        <dt>Received</dt>
        <dd>{timestamp(mission.remote.receivedAt)} UTC</dd>
      </dl>
      {#if !mission.monitorConnected}<p class="amber">
          This reading stays frozen until the link is restored.
        </p>{/if}
    </div>
    <div class="medical-log">
      <h3>Received follow-ups <span class="count">{received.length}</span></h3>
      {#if !received.length}<p class="empty-message">
          No follow-ups received yet. Record how you feel and restore the medical link.
        </p>{/if}
      {#each received as entry (entry.id)}
        <article class="received-entry">
          <strong>{entry.summary}</strong>
          <p>{entry.notes}</p>
          <span
            >Original timestamp {timestamp(entry.time)} UTC · Received {timestamp(
              entry.receivedAt!,
            )} UTC</span
          >
          {#if entry.kind === 'recovery' || entry.kind === 'moment'}<p>
              {entry.manualPulse !== null
                ? `Manual pulse: ${entry.manualPulse} bpm`
                : `${entry.sensorConnected ? entry.reading.source : 'Last reading before sensor signal loss'}: ${entry.reading.pulse} bpm · ${timestamp(entry.reading.time)} UTC`}
            </p>{/if}
          {#if entry.momentId}<p>
              Context added {timestamp(entry.recordedAt ?? entry.time)} UTC · Linked to original captured
              moment
            </p>{/if}
          {#if entry.observations?.length}<details>
              <summary>Captured measurements</summary><Observations
                observations={entry.observations}
                compact
              />
            </details>{/if}
        </article>
      {/each}
    </div>
  </div>
</section>
