<script lang="ts">
  import { timestamp, type Mission } from '$lib/mission';
  import Observations from './Observations.svelte';
  import Icon from './Icon.svelte';
  let { mission, persistent = true, selected = $bindable<string | null>(null), onAnnotate, onCapture }: {
    mission: Mission; persistent?: boolean; selected?: string | null; onAnnotate: (id: string, symptom: string) => void; onCapture: () => void;
  } = $props();
  let moments = $derived(mission.entries.filter(e => e.kind === 'moment').slice().reverse());
  let awaiting = $derived(moments.filter(m => !mission.entries.some(e => e.momentId === m.id)).length);
  const symptoms = ['No symptoms', 'Fatigue', 'Dizziness', 'Headache', 'Nausea', 'Pain'];
</script>
<section class="moment-log" aria-labelledby="moments-title">
  <div class="section-heading"><div><h2 id="moments-title">Your captured moments <span class="count">{moments.length}</span></h2><p>{awaiting ? `${awaiting} ${awaiting === 1 ? 'moment is' : 'moments are'} ready for your context. Add it when you have a free hand.` : 'A timestamp and the readings are saved first. Your explanation can come later.'}</p></div><button class="text-button" onclick={onCapture}>Log from tablet <Icon name="arrow" size={15}/></button></div>
  {#if !moments.length}<div class="moment-empty"><Icon name="save" size={24}/><p>Double tap the ring to bookmark this moment.<br/><span>No form. No retyping your measurements.</span></p></div>{/if}
  {#each moments as moment (moment.id)}
    {@const annotation = mission.entries.find(e => e.momentId === moment.id)}
    <article class="moment-item" id={`moment-${moment.id}`}>
      <button class="moment-row" aria-expanded={selected === moment.id} onclick={() => selected = selected === moment.id ? null : moment.id}>
        <span class="moment-mark"><Icon name={annotation ? 'check' : 'save'} size={17}/></span><span class="time">{timestamp(moment.time)}<small>UTC · captured</small></span>
        <span class="moment-summary"><strong>{annotation?.summary ?? 'Moment captured'}</strong><small>{moment.origin === 'ring-hold' ? 'Ring hold' : moment.origin === 'ring-double-tap' ? 'Ring double tap' : 'Tablet capture'} · {moment.sensorConnected ? `${moment.reading.pulse} bpm` : 'Ring unavailable'}</small></span>
        <span class="moment-state" class:mint={!!annotation}>{annotation ? 'Context added' : 'Add context'}<Icon name="chevron" size={15}/></span>
      </button>
      {#if selected === moment.id}
        <div class="moment-detail">
          <p class="snapshot-note">Snapshot at {timestamp(moment.time)} UTC · {moment.reading.source}{moment.sensorConnected ? '' : ` · last reading ${moment.reading.pulse} bpm at ${timestamp(moment.reading.time)} UTC (not current)`}</p>
          {#if annotation}<p class="mint">{annotation.summary} · Added at {timestamp(annotation.recordedAt ?? annotation.time)} UTC</p>
          {:else}<h3>How did you feel at that moment?</h3><p class="small-note">Tap once to save. Only your selection names a symptom.</p><div class="quick-actions">{#each symptoms as symptom}<button class="button secondary" onclick={() => onAnnotate(moment.id, symptom)}>{symptom}</button>{/each}</div>{/if}
          <details class="snapshot-measurements"><summary>View captured measurements</summary>{#if moment.observations?.length}<Observations observations={moment.observations} compact/>{:else}<p class="small-note">No additional measurements in this older record.</p>{/if}</details>
          <p class="delivery-note">{moment.receivedAt === null ? (persistent ? 'Snapshot saved locally · delivery pending' : 'Snapshot in this tab only · delivery pending') : `Snapshot received by the medical monitor at ${timestamp(moment.receivedAt)} UTC`}{annotation ? (annotation.receivedAt === null ? ' · symptom delivery pending' : ` · symptom received at ${timestamp(annotation.receivedAt)} UTC`) : ''}</p>
        </div>
      {/if}
    </article>
  {/each}
</section>
