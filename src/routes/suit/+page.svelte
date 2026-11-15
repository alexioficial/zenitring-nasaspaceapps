<script lang="ts">
  import ViewHeader from '$lib/components/crew/ViewHeader.svelte';
  import { onMount } from 'svelte';
  import { SuitClient } from '$lib/crew/suit-client';
  import { socketUrl } from '$lib/crew/connection';
  import { crewDefaults, newId, clockLabel } from '$lib/crew/model';
  import { suitKeys, suitInfo } from '$lib/crew/suit';
  import type { EventInput } from '$lib/crew/types';
  import '$lib/crew/crew.css';
  import '$lib/crew/sources.css';
  let selected = $state('vega');
  let deviceId = '';
  let ready = $state(false);
  let active = $state(false);
  let suit: SuitClient | undefined;
  let revision = $state(0);
  let last = $state<EventInput | null>(null);
  let warning = $state('');
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
    content="Independent simulated spacesuit telemetry. Read-only monitoring; no life-support controls."
  /></svelte:head
>
<div class="crew-app ring-app">
  <ViewHeader
    title="Suit simulator"
    context={`${selected.toUpperCase()} · Demo tool generating simulated readings`}
    keepSourceOpen
  />
  <main class="ring-content">
    <p class="simulator-orientation">
      Keep this tab open to send readings.
      <a href={`/astronaut/${selected}`} target="_blank" rel="noreferrer"
        >Open {selected.toUpperCase()}’s astronaut view ↗</a
      >
    </p>
    {#if !active}
      <section class="ring-pairing">
        <h1>Outside.<br />Still connected.</h1>
        <p>
          Send a separate suit signal to the same astronaut’s mission history. The ring keeps its
          own identity.
        </p>
        <form
          onsubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label for="suit-astronaut">Choose your astronaut</label><select
            id="suit-astronaut"
            bind:value={selected}
            >{#each crewDefaults as c}<option value={c.id}>{c.name}</option>{/each}</select
          ><button class="crew-button" disabled={!ready}>Link this suit</button>
        </form>
      </section>
    {:else if ui}
      <section class="crew-page-intro">
        <div>
          <span class="crew-eyebrow"
            >{crewDefaults.find((c) => c.id === selected)?.name} / SUIT TRANSMITTER</span
          >
          <h1>Spacewalk signals</h1>
          <p>Read-only telemetry concept · 3-second sampling</p>
        </div>
      </section>
      <div class="ring-connection" class:ring-disconnected={ui.status !== 'online'}>
        <span
          ><span class="status-dot"></span>{ui.status === 'online'
            ? 'Connected to crew monitor'
            : ui.status === 'conflict'
              ? 'Suit association blocked'
              : 'Monitor link unavailable'}</span
        >
      </div>
      {#if ui.error}<p class="crew-error" role="alert">{ui.error}</p>{/if}
      <section class="source-metrics" aria-label="Local simulated suit readings">
        {#each suitKeys as key}<div>
            <span>{suitInfo[key].label}</span><strong
              >{ui.values[key].toFixed(suitInfo[key].digits)}
              <small>{suitInfo[key].unit}</small></strong
            >
          </div>{/each}
      </section>
      <p class="snapshot-caption">
        {ui.paused ? 'Retained reading' : 'Locally sampled'}
        {clockLabel(ui.sampledAt)}. Fictional values, not NASA measurements or safe operating
        limits.
      </p>
      <button
        class="crew-button"
        onclick={() => {
          last = suit!.capture();
        }}>Capture suit moment</button
      >
      <section class="ring-feedback" aria-live="polite">
        <strong>{last ? 'Suit moment captured' : 'Ready to capture'}</strong>{#if last}<p>
            Original time {clockLabel(last.occurredAt)} · {ui.deliveries[last.id]?.status ===
            'confirmed'
              ? `Confirmed by server at ${clockLabel(ui.deliveries[last.id].receivedAt!)}`
              : 'Pending delivery · not confirmed'}
          </p>
          {#if ui.deliveries[last.id]?.status === 'rejected'}<p>{ui.deliveries[last.id].message}</p>
            <button class="crew-inline-button" onclick={() => suit!.retry(last!.id)}
              >Retry suit event</button
            >{/if}{/if}
        <p>
          {ui.pending.length} pending events. Add the astronaut’s words in the shared event log.
        </p>
      </section>
      <div class="source-buttons">
        <button
          class="crew-button secondary"
          onclick={() => (ui?.status === 'online' ? suit!.disconnect() : suit!.connect())}
          >{ui.status === 'online' ? 'Disconnect suit' : 'Connect suit'}</button
        ><button class="crew-button secondary" onclick={() => suit!.pause()}
          >{ui.paused ? 'Resume suit telemetry' : 'Pause suit telemetry'}</button
        >
      </div>
      <p class="snapshot-caption">
        Local sampling continues when disconnected. Pausing retains the last reading. Keep this page
        visible; mobile browsers can suspend background work.
      </p>
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
    <footer class="ring-footer">
      <a href="/crew" target="_blank" rel="noreferrer">Open crew monitor ↗</a><strong
        >Simulated suit · no flight hardware connected.</strong
      >
    </footer>
  </main>
</div>

<style>
  .simulator-orientation {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--instrument-line);
    color: var(--instrument-muted);
  }
  .simulator-orientation a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
</style>
