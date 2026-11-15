<script lang="ts">
  import { untrack } from 'svelte';
  import type { CrewMember, Config, ClientMessage, Scenario } from '$lib/crew/types';
  import { metricKeys, metricInfo, newId, validateConfig } from '$lib/crew/model';
  let {
    member,
    send,
    connected,
  }: {
    member: CrewMember;
    send: (m: ClientMessage & { id: string }) => Promise<boolean>;
    connected: boolean;
  } = $props();
  // Mount per astronaut; telemetry must not reinitialize an in-progress edit.
  let draft = $state<Config>(untrack(() => $state.snapshot(member.config)));
  let saving = $state(false);
  let message = $state('');
  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (!validateConfig(draft)) {
      message = 'Use an interval from 1–15 seconds and ordered ranges.';
      return;
    }
    saving = true;
    const ok = await send({
      type: 'config',
      id: newId(),
      astronautId: member.id,
      config: $state.snapshot(draft),
    });
    saving = false;
    message = ok
      ? 'Saved on server. The ring confirms when it has applied this configuration.'
      : 'Configuration was not confirmed. Your changes are preserved.';
  }
</script>

<form class="simulation-settings" onsubmit={save}>
  <div class="settings-intro">
    <span class="crew-eyebrow">Simulation lab · {member.name}</span>
    <h3>Control the signal at its source.</h3>
    <p>
      These controls change this ring's transmitter. Ranges are demonstration references, never
      validated clinical thresholds.
    </p>
  </div>
  <div class="settings-fields">
    <label
      >Transmission interval <span>seconds</span><input
        aria-label="Transmission interval in seconds"
        type="number"
        min="1"
        max="15"
        step="1"
        value={draft.intervalMs / 1000}
        oninput={(e) => (draft.intervalMs = Number(e.currentTarget.value) * 1000)}
        required
      /></label
    ><label
      >Signal scenario<select bind:value={draft.scenario}
        ><option value="normal">Normal baseline</option><option value="drift"
          >Progressive change</option
        ><option value="excursion">Outside demo ranges</option></select
      ></label
    >
  </div>
  <fieldset>
    <legend>Demo reference ranges</legend>
    <div class="range-fields">
      {#each metricKeys as key}<div>
          <label for={`min-${member.id}-${key}`}
            >{metricInfo[key].label} <span>{metricInfo[key].unit}</span></label
          >
          <div>
            <input
              id={`min-${member.id}-${key}`}
              type="number"
              step="0.1"
              aria-label={`${metricInfo[key].label} minimum`}
              bind:value={draft.ranges[key][0]}
              required
            /><span>to</span><input
              type="number"
              step="0.1"
              aria-label={`${metricInfo[key].label} maximum`}
              bind:value={draft.ranges[key][1]}
              required
            />
          </div>
        </div>{/each}
    </div>
  </fieldset>
  <button class="crew-button" disabled={!connected || saving}
    >{saving ? 'Waiting for server…' : 'Apply to this ring'}</button
  >
  <p class="config-receipt">
    Server configuration v{member.config.revision} · {member.appliedRevision ===
    member.config.revision
      ? 'Applied by ring'
      : member.connected
        ? 'Awaiting ring confirmation'
        : 'Will apply when the ring reconnects'}
  </p>
  {#if message}<p role="status">{message}</p>{/if}
</form>
