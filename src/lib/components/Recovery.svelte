<script lang="ts">
  import type { Mission, Entry } from '$lib/mission';
  import { timestamp } from '$lib/mission';
  import Icon from './Icon.svelte';
  let {
    mission,
    onSave,
  }: {
    mission: Mission;
    onSave: (input: Pick<Entry, 'kind' | 'summary' | 'notes' | 'manualPulse'>) => void;
  } = $props();
  let editing = $state(false);
  let symptom = $state('');
  let notes = $state('');
  let manual = $state<number | undefined>();
  let last = $derived([...mission.entries].reverse().find((entry) => entry.kind === 'recovery'));
  function submit(event: SubmitEvent) {
    event.preventDefault();
    onSave({
      kind: 'recovery',
      summary: symptom,
      notes,
      manualPulse: !mission.sensorConnected && manual !== undefined ? manual : null,
    });
    editing = false;
    symptom = '';
    notes = '';
    manual = undefined;
  }
</script>

<aside class="recovery panel" aria-labelledby="recovery-title">
  <div class="action-symbol"><Icon name={last ? 'check' : 'heart'} size={25} /></div>
  <span class="action-status">{last ? 'Follow-up recorded' : 'Action pending'}</span>
  <h2 id="recovery-title">Recovery check-in</h2>
  <p>While resting, record how you feel.</p>
  {#if editing}
    <form onsubmit={submit} class="entry-form">
      <label for="symptom">How do you feel?</label>
      <select id="symptom" required bind:value={symptom}
        ><option value="" disabled>Choose an option</option><option>No symptoms</option><option
          >Fatigue</option
        ><option>Dizziness</option><option>Headache</option><option>Other</option></select
      >
      {#if !mission.sensorConnected}<label for="manual">Optional manual pulse · bpm</label><input
          id="manual"
          type="number"
          min="1"
          max="300"
          step="1"
          bind:value={manual}
        />{/if}
      <label for="notes">Add context <span>(optional)</span></label><textarea
        id="notes"
        rows="3"
        maxlength="500"
        bind:value={notes}
        placeholder="How you feel after the activity"></textarea>
      <button class="button primary" type="submit"
        ><Icon name="save" size={16} />Save follow-up</button
      >
      <button class="text-button" type="button" onclick={() => (editing = false)}>Cancel</button>
    </form>
  {:else}
    {#if last}<div class="last-report">
        <strong>{last.summary}</strong><span
          >{timestamp(last.time)} UTC · {last.receivedAt === null
            ? 'Delivery pending'
            : 'Received by the monitor'}</span
        >
      </div>{/if}
    <button class="button primary" onclick={() => (editing = true)}
      >{last ? 'Add follow-up' : 'Log symptoms'}<Icon name="arrow" size={16} /></button
    >
  {/if}
  <div class="local-note">
    <Icon name="save" size={17} />
    <p>Your entry keeps its original timestamp, even while the medical link is offline.</p>
  </div>
</aside>
