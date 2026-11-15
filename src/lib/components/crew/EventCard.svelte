<script lang="ts">
  import { untrack } from 'svelte';
  import type { CrewEvent, CrewMember, ClientMessage } from '$lib/crew/types';
  import { clockLabel, newId, metricInfo, metricKeys } from '$lib/crew/model';
  import Icon from '../Icon.svelte';
  import { suitInfo, suitKeys } from '$lib/crew/suit';
  let {
    event,
    member,
    send,
    connected,
  }: {
    event: CrewEvent;
    member: CrewMember;
    send: (m: ClientMessage & { id: string }) => Promise<boolean>;
    connected: boolean;
  } = $props();
  let expanded = $state(untrack(() => event.kind === 'emergency' && event.status !== 'resolved'));
  let text = $state('');
  let resolution = $state('');
  let saving = $state(false);
  let error = $state('');
  const late = () => event.receivedAt - event.occurredAt > 5000;
  async function annotate(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    error = '';
    const ok = await send({
      type: 'annotate',
      id: newId(),
      eventId: event.id,
      text,
      createdAt: Date.now(),
    });
    saving = false;
    if (ok) text = '';
    else error = 'The note was not confirmed. Your text is preserved; retry.';
  }
  async function action(action: 'acknowledged' | 'resolved') {
    saving = true;
    error = '';
    const ok = await send({
      type: 'emergency-action',
      id: newId(),
      eventId: event.id,
      action,
      note: resolution,
    });
    saving = false;
    if (!ok) error = 'The action was not confirmed. Check the connection and retry.';
  }
</script>

<article
  class="crew-event"
  class:emergency={event.kind === 'emergency'}
  class:resolved={event.status === 'resolved'}
  id={`event-${event.id}`}
>
  <button class="event-summary" aria-expanded={expanded} onclick={() => (expanded = !expanded)}>
    <span class="event-symbol"
      ><Icon name={event.kind === 'emergency' ? 'pulse' : 'save'} size={19} /></span
    >
    <span
      ><span class="event-kicker">{member.callsign} · {clockLabel(event.occurredAt)}</span><strong
        >{event.kind === 'emergency' ? 'Emergency gesture' : 'Moment captured'}</strong
      ></span
    >
    <span class="event-status"
      >{event.kind === 'emergency' ? event.status : 'Received'}<span aria-hidden="true"
        >{expanded ? '−' : '+'}</span
      ></span
    >
  </button>
  {#if expanded}
    <div class="event-detail">
      <p class="crew-muted">
        {member.name} · {event.gesture === 'double-tap'
          ? 'Double tap'
          : event.gesture === 'swipe'
            ? 'Deliberate swipe'
            : 'Test button'} · {event.sourceType === 'spacesuit' ? 'Suit' : 'Ring'}
        {event.deviceId.slice(0, 8)}
      </p>
      <p class="event-reception">
        Captured {new Date(event.occurredAt).toISOString().slice(0, 10)} · Received {clockLabel(
          event.receivedAt,
        )}{late() ? ' · Late delivery — original capture time preserved' : ''}
      </p>
      <div class="event-snapshot">
        {#if event.sourceType === 'spacesuit'}{#each suitKeys as key}<div>
              <span>{suitInfo[key].label}</span><strong
                >{event.suitSnapshot?.[key].toFixed(suitInfo[key].digits) ?? '—'}
                <small>{suitInfo[key].unit}</small></strong
              >
            </div>{/each}{:else}
          {#each metricKeys as key}<div>
              <span>{metricInfo[key].label}</span><strong
                >{event.snapshot?.[key].toFixed(metricInfo[key].digits) ?? '—'}
                <small>{metricInfo[key].unit}</small></strong
              >
            </div>{/each}
        {/if}
      </div>
      <p class="snapshot-caption">
        Immutable simulated snapshot{event.snapshotAt
          ? ` · measured ${clockLabel(event.snapshotAt)}`
          : ' · no available measurement'}. A gesture does not identify a symptom.
      </p>
      {#if event.kind === 'emergency'}
        <div class="emergency-actions">
          {#if event.status === 'active'}<p>Active · awaiting crew response.</p>
            <button
              class="crew-button danger"
              disabled={!connected || saving}
              onclick={() => action('acknowledged')}>Acknowledge emergency</button
            >
          {:else if event.status === 'acknowledged'}<p>
              Acknowledged · the emergency remains open.
            </p>
            <label for={`resolution-${event.id}`}>Resolution note</label><textarea
              id={`resolution-${event.id}`}
              maxlength="500"
              bind:value={resolution}
              placeholder="Record what was done and why this can be closed"
              rows="2"></textarea><button
              class="crew-button"
              disabled={!connected || saving || !resolution.trim()}
              onclick={() => action('resolved')}>Resolve and keep in history</button
            >
          {:else}<p>Resolved · retained in mission history.</p>{/if}
          {#each event.actions as audit (audit.id)}<p class="event-audit">
              <strong>{audit.action}</strong> · {clockLabel(audit.receivedAt)}{audit.note
                ? ` · ${audit.note}`
                : ''}
            </p>{/each}
        </div>
      {/if}
      {#each event.annotations as note (note.id)}<blockquote class="event-note">
          <p>{note.text}</p>
          <footer>
            Entered {clockLabel(note.createdAt)} · Received {clockLabel(note.receivedAt)}
          </footer>
        </blockquote>{/each}
      <form onsubmit={annotate} class="event-note-form">
        <label for={`note-${event.id}`}>What did the astronaut report?</label><textarea
          id={`note-${event.id}`}
          bind:value={text}
          maxlength="500"
          required
          rows="2"
          placeholder="Add their words or record the crew's observation"></textarea><button
          class="crew-button secondary"
          disabled={!connected || saving || !text.trim()}
          >{saving ? 'Waiting for confirmation…' : 'Save annotation'}</button
        >
      </form>
      {#if error}<p role="alert" class="crew-error">{error}</p>{/if}
    </div>
  {/if}
</article>
