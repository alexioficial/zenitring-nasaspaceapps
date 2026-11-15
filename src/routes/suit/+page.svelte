<script lang="ts">
  import ViewHeader from '$lib/components/crew/ViewHeader.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { onMount } from 'svelte';
  import { SuitClient } from '$lib/crew/suit-client';
  import { socketUrl } from '$lib/crew/connection';
  import { crewDefaults, newId, clockLabel } from '$lib/crew/model';
  import { suitKeys, suitInfo } from '$lib/crew/suit';
  import type { EventInput } from '$lib/crew/types';
  import '$lib/crew/crew.css';
  let selected = $state('vega');
  let deviceId = '';
  let ready = $state(false);
  let active = $state(false);
  let suit: SuitClient | undefined;
  let revision = $state(0);
  let last = $state<EventInput | null>(null);
  let warning = $state('');
  let astronaut = $derived(crewDefaults.find((c) => c.id === selected)!);
  let ui = $derived.by(() => {
    void revision;
    return suit
      ? {
          status: suit.connection.status,
          error: suit.connection.error,
          values: suit.values,
          sampledAt: suit.sampledAt,
          paused: suit.paused,
          pending: suit.pending,
          deliveries: suit.deliveries,
          storageError: suit.storageError,
        }
      : null;
  });
  function start() {
    if (!ready) return;
    try {
      sessionStorage.setItem('zenit-suit-identity', JSON.stringify({ deviceId, selected }));
    } catch {
      warning = 'Identity is in this tab only. Keep the tab open through the demonstration.';
    }
    suit?.dispose();
    suit = new SuitClient({
      url: socketUrl(),
      deviceId,
      astronautId: selected,
      onChange: () => revision++,
      load: () => JSON.parse(localStorage.getItem(`zenit-suit-outbox-${deviceId}`) ?? 'null'),
      save: (saved) => localStorage.setItem(`zenit-suit-outbox-${deviceId}`, JSON.stringify(saved)),
    });
    last = suit.pending.at(-1) ?? null;
    active = true;
    suit.connect();
    revision++;
  }
  onMount(() => {
    deviceId = newId();
    const query = new URLSearchParams(location.search).get('astronaut');
    if (crewDefaults.some((c) => c.id === query)) selected = query!;
    let resume = false;
    try {
      const saved = JSON.parse(sessionStorage.getItem('zenit-suit-identity') ?? 'null');
      if (saved?.deviceId && crewDefaults.some((c) => c.id === saved.selected)) {
        deviceId = saved.deviceId;
        selected = saved.selected;
        resume = true;
        if (query && query !== selected)
          warning =
            'Resuming this tab’s original astronaut to preserve its pending evidence. Use a fresh tab for another astronaut.';
      }
    } catch {
      warning = 'Identity could not be restored. Keep this tab open until events are confirmed.';
    }
    ready = true;
    if (resume) start();
    return () => suit?.dispose();
  });
</script>

<svelte:head
  ><title>ZENIT · Suit simulator</title><meta
    name="description"
    content="Independent spacesuit telemetry. Read-only monitoring; no life-support controls."
  /></svelte:head
>
<div class="crew-app sim-app astronaut-workspace">
  <ViewHeader
    title="Suit simulator"
    context={`${astronaut.callsign} · ${astronaut.name}`}
    keepSourceOpen
  />
  <main class="crew-content sim-content">
    <div class="sim-heading">
      <h1>{active ? 'EVA suit' : 'Link your suit'}</h1>
      <a class="sim-link" href={`/astronaut/${selected}`} target="_blank" rel="noreferrer"
        >My health <Icon name="arrow" size={16} /></a
      >
    </div>
    {#if !active}
      <section class="sim-pairing">
        <p class="sim-lead">
          Send a separate suit signal to the same astronaut’s mission history. The ring keeps its
          own identity.
        </p>
        <form
          class="sim-form"
          onsubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label for="suit-astronaut">Astronaut</label><select
            id="suit-astronaut"
            bind:value={selected}
            >{#each crewDefaults as c}<option value={c.id}>{c.callsign} · {c.name}</option
              >{/each}</select
          ><button class="crew-button" disabled={!ready}
            >Link this suit <Icon name="link" size={18} /></button
          >
        </form>
        <p class="sim-note">Optional. Only needed to demonstrate a spacewalk.</p>
      </section>
    {:else if ui}
      <div class="sim-status" class:is-offline={ui.status !== 'online'} role="status">
        <span
          ><i aria-hidden="true"></i>{ui.status === 'online'
            ? 'Connected to crew monitor'
            : ui.status === 'conflict'
              ? 'Suit association blocked'
              : 'Monitor link unavailable'}</span
        ><span class="sim-rate">Every 3 s</span>
      </div>
      {#if ui.error}<p class="crew-error" role="alert">{ui.error}</p>{/if}
      <section class="medbay-telemetry sim-readings" aria-label="Local suit readings">
        <div class="medbay-vitals-heading">
          <h2>{ui.paused ? 'Retained readings' : 'Sending now'}</h2>
          <span>{ui.paused ? 'Paused at' : 'Sampled'} {clockLabel(ui.sampledAt)}</span>
        </div>
        <dl class="medbay-vitals medbay-suit-vitals" class:medbay-retained={ui.paused}>
          {#each suitKeys as key}<div>
              <dt><span>{suitInfo[key].label}</span></dt>
              <dd>
                {ui.values[key].toFixed(suitInfo[key].digits)}<small>{suitInfo[key].unit}</small>
              </dd>
            </div>{/each}
        </dl>
        <p class="medbay-measured">
          Fictional values, not NASA measurements or safe operating limits. Keep this tab open and
          the screen awake to keep sending.
        </p>
      </section>
      <section class="sim-actions" aria-label="Quick actions">
        <div class="sim-buttons">
          <button
            class="crew-button"
            onclick={() => {
              last = suit!.capture();
            }}>Capture suit moment</button
          >
        </div>
        <div class="sim-feedback" aria-live="polite">
          <strong>{last ? 'Suit moment captured' : 'Ready to capture'}</strong>
          {#if last}<p>
              Original time {clockLabel(last.occurredAt)} · {ui.deliveries[last.id]?.status ===
              'confirmed'
                ? `Confirmed by server at ${clockLabel(ui.deliveries[last.id].receivedAt!)}`
                : 'Pending · waiting for server confirmation'}
            </p>
            {#if ui.deliveries[last.id]?.status === 'rejected'}<p>
                {ui.deliveries[last.id].message}
              </p>
              <button class="crew-inline-button" onclick={() => suit!.retry(last!.id)}
                >Retry suit event</button
              >{/if}{/if}
          <p>
            {ui.pending.length} pending events. Add the astronaut’s words in the shared event log.
          </p>
        </div>
      </section>
      <section class="sim-actions" aria-label="Connection controls">
        <div class="sim-buttons">
          <button
            class="crew-button secondary"
            onclick={() => (ui?.status === 'online' ? suit!.disconnect() : suit!.connect())}
            >{ui.status === 'online' ? 'Disconnect suit' : 'Connect suit'}</button
          ><button class="crew-button secondary" onclick={() => suit!.pause()}
            >{ui.paused ? 'Resume telemetry' : 'Pause telemetry'}</button
          >
        </div>
        <p class="sim-note">
          Sampling continues when disconnected; pausing keeps the last reading. Mobile browsers can
          suspend background work, so keep this page visible.
        </p>
      </section>
    {/if}
    {#if warning || ui?.storageError}<p class="crew-error" role="alert">
        {warning || ui?.storageError}
      </p>{/if}
    <details class="crew-disclosure">
      <summary>Why these measurements?</summary>
      <div>
        <p>
          NASA-STD-3001 §11.3 describes recording pressure and oxygen/carbon dioxide partial
          pressures. These are atmosphere measurements, distinct from blood oxygen or body
          temperature.
        </p>
        <a
          href="https://www.nasa.gov/reference/11-0-spacesuits-vol-2/"
          target="_blank"
          rel="noreferrer">Read NASA’s suit reference ↗</a
        >
        <p>
          ZENIT does not operate oxygen, pressure, cooling or other life-support functions. This
          page simulates data only.
        </p>
      </div>
    </details>
    <footer class="crew-footer">
      <span><strong>No flight hardware connected.</strong></span>
      <div>
        <a href="/crew" target="_blank" rel="noreferrer"
          >Open crew monitor <Icon name="arrow" size={15} /></a
        >
      </div>
    </footer>
  </main>
</div>
