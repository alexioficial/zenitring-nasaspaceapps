<script lang="ts">
  import { tick } from 'svelte';
  import Icon from '../Icon.svelte';
  import EventCard from './EventCard.svelte';
  import HealthCheckIn from './HealthCheckIn.svelte';
  import { healthTopics } from '$lib/crew/health';
  import { clockLabel } from '$lib/crew/model';
  import { personalRecords, type RecordFilter } from '$lib/crew/workspace';
  import type { CrewMember, CrewEvent, ClientMessage } from '$lib/crew/types';

  let {
    member,
    events,
    online,
    now,
    send,
    onnew,
  }: {
    member: CrewMember;
    events: CrewEvent[];
    online: boolean;
    now: number;
    send: (message: ClientMessage & { id: string }) => Promise<boolean>;
    onnew: () => void;
  } = $props();
  let filter = $state<RecordFilter>('all');
  let selected = $state<string | null>(null);
  let returnToRecord = $state<string | null>(null);
  let recordsElement = $state<HTMLElement>();
  async function reviewCheckin(id: string) {
    returnToRecord = id;
    selected = id;
    await tick();
    const heading = recordsElement?.querySelector<HTMLElement>('#checkin-title');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  async function showRecords() {
    selected = null;
    await tick();
    const trigger = document.getElementById(`record-review-${returnToRecord}`);
    trigger?.focus({ preventScroll: true });
    trigger?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  let records = $derived(personalRecords(member, events, filter));
  const filters: [RecordFilter, string][] = [
    ['all', 'All'],
    ['checkin', 'Check-ins'],
    ['moment', 'Moments'],
    ['emergency', 'Emergencies'],
  ];
  const dateLabel = (time: number) =>
    new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(time);
</script>

<section class="personal-records" aria-label="My records" bind:this={recordsElement}>
  <header class="personal-page-heading">
    <h1>My records</h1>
    <p>Your check-ins and captured moments, together.</p>
  </header>
  {#if selected}
    <button class="crew-inline-button records-back" onclick={showRecords}>
      <Icon name="arrow" size={17} /> All records
    </button>
    {#key selected}<HealthCheckIn
        {member}
        {events}
        {online}
        {now}
        {send}
        initialCheckId={selected}
      />{/key}
  {:else}
    <div class="record-filters" role="group" aria-label="Filter records">
      {#each filters as [id, label]}<button
          aria-pressed={filter === id}
          onclick={() => (filter = id)}>{label}</button
        >{/each}
    </div>
    {#if !records.length}
      <div class="records-empty">
        <Icon name="book" size={28} />
        <h2>
          {filter === 'all'
            ? 'No records yet'
            : `No ${filter === 'checkin' ? 'check-ins' : filter === 'moment' ? 'moments' : 'emergencies'} yet`}
        </h2>
        <p>
          {filter === 'all' || filter === 'checkin'
            ? 'Record how you feel, or capture a moment from your ring or suit.'
            : 'Captured events appear here after the server confirms receipt.'}
        </p>
        <button class="crew-button" onclick={onnew}
          ><Icon name="pen" size={18} />Record how I feel</button
        >
      </div>
    {/if}
    {#each records as record, index (`${record.kind}:${record.id}`)}
      {#if index === 0 || dateLabel(records[index - 1].occurredAt) !== dateLabel(record.occurredAt)}
        <h2 class="record-date">{dateLabel(record.occurredAt)} <span>UTC</span></h2>
      {/if}
      {#if record.kind === 'checkin'}
        <article class="checkin-record">
          <Icon name="pen" size={22} />
          <div>
            <div class="checkin-record-title">
              <h3>Health check-in</h3>
              <time datetime={new Date(record.occurredAt).toISOString()}
                >{clockLabel(record.occurredAt)}</time
              >
            </div>
            <p>
              {healthTopics[record.check.input.topic].title} · {record.check.input.feeling ===
              'help'
                ? 'Asked for help'
                : record.check.input.feeling === 'changed'
                  ? 'Reported a change'
                  : 'Feeling as usual'}
            </p>
            {#if record.check.input.note}<p class="record-note">{record.check.input.note}</p>{/if}
            <small
              >Shared with crew · {record.check.followups.at(-1)?.outcome
                ? `Follow-up: ${record.check.followups.at(-1)!.outcome}`
                : 'No follow-up yet'}</small
            >
            <button
              class="crew-inline-button"
              id={`record-review-${record.id}`}
              onclick={() => reviewCheckin(record.id)}
              >Review &amp; follow up <Icon name="arrow" size={16} /></button
            >
          </div>
        </article>
      {:else}
        <EventCard event={record.event} {member} {send} connected={online} />
      {/if}
    {/each}
    <p class="records-receipt-note">
      Received means saved by the server, not medically reviewed. Event notes and saved check-ins
      are shared with the crew.
    </p>
  {/if}
</section>
