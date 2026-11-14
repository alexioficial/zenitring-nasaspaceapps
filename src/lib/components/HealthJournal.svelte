<script lang="ts">
  import { timestamp, nightSummary, type Entry, type EntryKind, type Mission } from '$lib/mission';
  import Icon from './Icon.svelte';
  import Observations from './Observations.svelte';
  let { module, mission, onSave }: { module: 'sleep' | 'wellbeing' | 'nutrition'; mission: Mission; onSave: (input: Pick<Entry, 'kind' | 'summary' | 'notes' | 'manualPulse'>) => void } = $props();
  let text = $state('');
  let hours = $state<number | undefined>();
  let feeling = $state('Rested');
  let kind = $derived<EntryKind>(module === 'sleep' ? 'sleep' : module === 'nutrition' ? 'nutrition' : 'recovery');
  let entries = $derived(mission.entries.filter(e => e.kind === kind).slice().reverse());
  function save(event: SubmitEvent) {
    event.preventDefault();
    onSave({ kind, summary: module === 'sleep' ? `${hours} h of sleep · ${feeling}` : text, notes: '', manualPulse: null });
    text = ''; hours = undefined;
  }
  function quickSave(summary: string) {
    onSave({ kind, summary: module === 'sleep' ? `5 h 40 min of sleep · ${summary}` : summary, notes: '', manualPulse: null });
  }
</script>
<div class="journal-workspace">
  <section class="panel journal-form">
    <h2>{module === 'sleep' ? 'Sleep & attention' : module === 'nutrition' ? 'Nutrition & hydration' : 'Your wellbeing log'}</h2>
    <p>{module === 'sleep' ? 'Your sleep summary is already here. Just tell us how you feel.' : module === 'nutrition' ? 'One tap records the event and attaches the available readings. Adjust the details only when needed.' : 'Choose how you feel. The timestamp and available readings are attached automatically.'}</p>
    {#if module === 'sleep'}<Observations observations={nightSummary} compact/><p class="small-note">Imported demo summary · Last night 5 h 40 min · Fictional 7-night average 7 h 10 min</p>{/if}
    <div class="quick-actions">
      {#each module === 'sleep' ? ['Rested', 'Sleepy', 'Difficulty concentrating'] : module === 'nutrition' ? ['Water · 250 ml', 'Meal eaten', 'Low appetite'] : ['Feeling well', 'Fatigue', 'Dizziness', 'Feeling stressed'] as option}<button class="button secondary" onclick={() => quickSave(option)}>{option}</button>{/each}
    </div>
    <p class="small-note">Tap once to save. These choices are your report, not a sensor inference.</p>
    <details class="manual-entry"><summary>{module === 'sleep' ? 'Correct the sleep duration' : 'Add a custom entry'}</summary>
    <form class="entry-form" onsubmit={save}>
      {#if module === 'sleep'}
        <label for="sleep-hours">Hours slept</label><input id="sleep-hours" required type="number" min="0" max="24" step="0.1" bind:value={hours}/>
        <label for="sleep-feeling">How do you feel?</label><select id="sleep-feeling" bind:value={feeling}><option>Rested</option><option>Sleepy</option><option>Difficulty concentrating</option></select>
      {:else}
        <label for="journal-entry">{module === 'nutrition' ? 'Meal or drink' : 'How are you feeling?'}</label><input id="journal-entry" maxlength="160" pattern=".*\S.*" required bind:value={text} placeholder={module === 'nutrition' ? 'e.g. Water, 250 ml' : 'e.g. Tired after the activity'}/>
      {/if}
      <button class="button primary" type="submit"><Icon name="save" size={16}/>Save entry</button>
    </form>
    </details>
    {#if module === 'sleep'}
      <div class="research-note"><h3>NASA research context</h3><p>A NASA evidence report summarizes a study of 24 astronauts: 6.5 hours of reported sleep within 8.5 hours of scheduled sleep opportunity. These are group observations, not a personal target.</p><a href="https://humanresearchroadmap.nasa.gov/evidence/reports/HRP-ER-BMED-HFBP-20250210.pdf#page=43" target="_blank" rel="noreferrer">Read the NASA evidence report <Icon name="arrow" size={14}/></a></div>
    {/if}
  </section>
  <section class="journal-log"><h3>Your entries <span class="count">{entries.length}</span></h3>
    {#if !entries.length}<p class="empty-message">Your next entry starts the story. It stays on this device while the medical link is unavailable.</p>{/if}
    {#each entries as entry (entry.id)}<article class="received-entry"><span class="time">{timestamp(entry.time)} UTC</span><h4>{entry.summary}</h4>{#if entry.notes}<p>{entry.notes}</p>{/if}<span class:amber={entry.receivedAt === null}>{entry.receivedAt === null ? 'Delivery pending' : `Received at ${timestamp(entry.receivedAt)} UTC`}</span></article>{/each}
  </section>
</div>
