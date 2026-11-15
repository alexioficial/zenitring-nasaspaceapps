<script lang="ts">
  import ViewHeader from '$lib/components/crew/ViewHeader.svelte';
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import RingScene from '$lib/components/RingScene.svelte';
  import { RingClient } from '$lib/crew/ring-client';
  import { GestureRecognizer, type Gesture } from '$lib/crew/gestures';
  import { socketUrl } from '$lib/crew/connection';
  import { crewDefaults, metricInfo, newId, clockLabel, validMetrics } from '$lib/crew/model';
  import type { EventInput, MetricKey, Scenario } from '$lib/crew/types';
  import '$lib/crew/crew.css';

  let selected = $state('vega');
  let deviceName = $state('Cabin ring');
  let deviceId = $state('');
  let ready = $state(false);
  let ring: RingClient | null = null;
  let revision = $state(0);
  let active = $state(false);
  let feedback = $state('Ready for a gesture.');
  let confirmEmergency = $state(false);
  let visualPulse = $state(0);
  let lastEvent = $state<EventInput | null>(null);
  let history = $state<EventInput[]>([]);
  let storageWarning = $state('');
  let pressed = $state(false);
  let surface = $state<HTMLButtonElement>();
  let pointer: number | null = null;
  const recognizer = new GestureRecognizer();
  let ui = $derived.by(() => {
    void revision;
    return ring
      ? {
          status: ring.status,
          error: ring.error,
          config: ring.config,
          values: ring.values,
          sampledAt: ring.sampledAt,
          transmittedAt: ring.transmittedAt,
          transmissions: ring.transmissions,
          pending: ring.pending,
          deliveries: ring.deliveries,
          paused: ring.paused,
          storageError: ring.storageError,
        }
      : null;
  });
  let astronaut = $derived(crewDefaults.find((c) => c.id === selected)!);
  // The four readings that matter first, in the same order and words as My health.
  const ringRows: [MetricKey, string][] = [
    ['pulse', 'Heart rate'],
    ['spo2', 'SpO₂'],
    ['respiration', 'Respiration'],
    ['skin', 'Skin deviation'],
  ];
  let delivery = $derived(lastEvent ? ui?.deliveries[lastEvent.id] : undefined);
  let pendingEmergencies = $derived(ui?.pending.filter((e) => e.kind === 'emergency') ?? []);
  function remember() {
    try {
      sessionStorage.setItem(
        'zenit-ring-identity',
        JSON.stringify({ deviceId, selected, deviceName }),
      );
    } catch {
      storageWarning =
        'Device identity is in this tab only. Keep this page open through the demonstration.';
    }
  }
  function start() {
    if (!ready) return;
    ring?.dispose();
    remember();
    const key = `zenit-ring-outbox-${deviceId}`;
    ring = new RingClient({
      url: socketUrl(),
      deviceId,
      astronautId: selected,
      deviceName,
      onChange: () => revision++,
      load: () => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (
          !Array.isArray(saved.pending) ||
          !saved.deliveries ||
          saved.pending.some(
            (e: EventInput) =>
              e.deviceId !== deviceId ||
              e.astronautId !== selected ||
              typeof e.id !== 'string' ||
              typeof e.occurredAt !== 'number' ||
              (e.snapshot !== null && !validMetrics(e.snapshot)),
          )
        )
          throw Error('Invalid saved outbox');
        history = saved.pending;
        lastEvent = saved.pending.at(-1) ?? null;
        return saved;
      },
      save: (saved) => localStorage.setItem(key, JSON.stringify(saved)),
    });
    active = true;
    ring.connect();
    revision++;
  }
  onMount(() => {
    deviceId = newId();
    const query = new URLSearchParams(location.search).get('astronaut');
    let resume = false;
    try {
      const saved = JSON.parse(sessionStorage.getItem('zenit-ring-identity') ?? 'null');
      if (saved?.deviceId) {
        deviceId = saved.deviceId;
        selected = saved.selected;
        deviceName = saved.deviceName;
        resume = true;
      }
    } catch {
      storageWarning =
        'Browser storage is unavailable. Keep this tab open until pending events are confirmed.';
    }
    // Preserve a tab's original association and outbox when opening another crew link.
    // Changing identity must be explicit and is blocked while events are pending.
    if (query && crewDefaults.some((c) => c.id === query)) {
      let savedIdentity = false;
      try {
        savedIdentity = !!sessionStorage.getItem('zenit-ring-identity');
      } catch {
        /* No durable identity. */
      }
      if (!savedIdentity) selected = query;
      else if (query !== selected)
        storageWarning =
          'This tab belongs to a different astronaut. Reconnect it to deliver pending events first, then use Change astronaut / device or open this link in a fresh tab.';
    }
    if (!crewDefaults.some((c) => c.id === selected)) selected = 'vega';
    ready = true;
    // Resume the original association before exposing any rebinding control.
    if (resume) start();
    return () => ring?.dispose();
  });
  function capture(gesture: Gesture | 'button', emergency = false) {
    if (!ring) return;
    const event = ring.capture(gesture, emergency);
    visualPulse++;
    lastEvent = event;
    history = [event, ...history].slice(0, 20);
    confirmEmergency = false;
    feedback =
      event.kind === 'emergency'
        ? 'Emergency recorded. Check delivery below.'
        : gesture === 'button'
          ? 'Moment captured.'
          : 'Double tap detected. Moment captured.';
    try {
      navigator.vibrate?.(event.kind === 'emergency' ? [60, 40, 60] : 35);
    } catch {
      /* Haptics are optional. */
    }
    revision++;
  }
  function down(event: PointerEvent) {
    if (!event.isPrimary || pointer !== null) {
      recognizer.cancel();
      pointer = null;
      pressed = false;
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointer = event.pointerId;
    pressed = true;
    recognizer.down(event.clientX, event.clientY, performance.now());
    surface?.setPointerCapture(pointer);
  }
  function move(event: PointerEvent) {
    if (event.pointerId === pointer) recognizer.move(event.clientX, event.clientY);
  }
  function up(event: PointerEvent) {
    if (event.pointerId !== pointer) return;
    pointer = null;
    pressed = false;
    const gesture = recognizer.up(event.clientX, event.clientY, performance.now());
    if (gesture) capture(gesture);
  }
  function cancel() {
    pointer = null;
    pressed = false;
    recognizer.cancel();
  }
  // Capture is normally released after pointerup; keep the first tap candidate.
  function lostCapture() {
    if (pointer !== null) cancel();
  }
  function scenario(value: Scenario) {
    ring?.connection.command({ type: 'simulation', id: newId(), scenario: value });
  }
  function changeBinding() {
    if (ui?.pending.length) {
      feedback = 'Deliver every pending event before changing the astronaut or device.';
      return;
    }
    ring?.dispose();
    ring = null;
    active = false;
    deviceId = newId();
    history = [];
    lastEvent = null;
    revision++;
  }
</script>

<svelte:head
  ><title>ZENIT · Ring simulator</title><meta
    name="description"
    content="A mobile astronaut ring. Double tap to capture a moment; deliberately swipe to send an emergency to the crew monitor."
  /></svelte:head
>

<div class="crew-app sim-app astronaut-workspace">
  <ViewHeader
    title="Ring simulator"
    context={`${astronaut.callsign} · ${astronaut.name}`}
    keepSourceOpen
  />
  <main class="crew-content sim-content">
    <div class="sim-heading">
      <h1>{active ? 'Ring' : 'Link your ring'}</h1>
      <a class="sim-link" href={`/astronaut/${selected}`} target="_blank" rel="noreferrer"
        >My health <Icon name="arrow" size={16} /></a
      >
    </div>
    {#if !active}
      <section class="sim-pairing">
        <p class="sim-lead">
          Choose the astronaut this ring belongs to. It sends readings and real gestures to the crew
          monitor.
        </p>
        <form
          class="sim-form"
          onsubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label for="ring-astronaut">Astronaut</label><select
            id="ring-astronaut"
            bind:value={selected}
            >{#each crewDefaults as c}<option value={c.id}>{c.callsign} · {c.name}</option
              >{/each}</select
          ><label for="ring-device-name">Device name</label><input
            id="ring-device-name"
            bind:value={deviceName}
            maxlength="60"
            required
          />
          <button class="crew-button" disabled={!ready}
            >Link this ring <Icon name="link" size={18} /></button
          >
          <p class="sim-meta">Device ID {deviceId.slice(0, 12) || 'Preparing…'}</p>
        </form>
        <p class="sim-note">
          One ring per astronaut. If it is reserved, release it from the crew monitor first.
        </p>
      </section>
    {:else if ui}
      <div class="sim-status" class:is-offline={ui.status !== 'online'} role="status">
        <span
          ><i aria-hidden="true"></i>{ui.status === 'online'
            ? 'Connected to crew monitor'
            : ui.status === 'connecting'
              ? 'Connecting to mission server'
              : ui.status === 'conflict'
                ? 'Ring association blocked'
                : 'Offline · events will queue'}</span
        ><span class="sim-rate">Every {ui.config.intervalMs / 1000} s</span>
      </div>
      {#if ui.error}<p class="crew-error" role="alert">{ui.error}</p>{/if}
      {#if pendingEmergencies.length}<div class="sim-undelivered" role="alert">
          <strong>Emergency not delivered</strong>
          <p>
            {pendingEmergencies.length} emergency {pendingEmergencies.length === 1
              ? 'event is'
              : 'events are'} still pending. The crew monitor has not confirmed receipt. Reconnect and
            keep this page open.
          </p>
        </div>{/if}
      <section class="medbay-telemetry sim-readings" aria-label="Signal being transmitted">
        <div class="medbay-vitals-heading">
          <h2>{ui.paused ? 'Retained readings' : 'Sending now'}</h2>
          <span>{ui.transmittedAt ? `Sent ${clockLabel(ui.transmittedAt)}` : 'Not yet sent'}</span>
        </div>
        <dl class="medbay-vitals" class:medbay-retained={ui.paused}>
          {#each ringRows as [key, label]}<div>
              <dt><span>{label}</span></dt>
              <dd>
                {ui.values[key].toFixed(metricInfo[key].digits)}<small>{metricInfo[key].unit}</small
                >
              </dd>
            </div>{/each}
        </dl>
        <p class="medbay-secondary-metric">
          HRV <strong>{ui.values.hrv.toFixed(metricInfo.hrv.digits)} ms</strong>
        </p>
        <p class="medbay-measured">
          Skin deviation is a change from a fictional baseline, not body temperature. Keep this tab
          open and the screen awake to keep sending.
        </p>
      </section>
      <section class="sim-actions" aria-label="Quick actions">
        <div class="sim-buttons">
          <button class="crew-button" onclick={() => capture('button')}>Capture moment</button>
          <button
            class="crew-button secondary"
            aria-expanded={confirmEmergency}
            onclick={() => (confirmEmergency = !confirmEmergency)}>Send emergency</button
          >
        </div>
        {#if confirmEmergency}<div class="sim-confirm" role="group" aria-label="Confirm emergency">
            <h2>Send an emergency to the crew?</h2>
            <p>This records an emergency and its current readings. Delivery is confirmed below.</p>
            <div class="sim-buttons">
              <button class="crew-button danger" onclick={() => capture('button', true)}
                >Confirm emergency</button
              ><button class="crew-button secondary" onclick={() => (confirmEmergency = false)}
                >Cancel</button
              >
            </div>
          </div>{/if}
        <div
          class="sim-feedback"
          class:is-emergency={lastEvent?.kind === 'emergency'}
          aria-live="polite"
        >
          <strong>{feedback}</strong>
          {#if lastEvent}<p>
              {clockLabel(lastEvent.occurredAt)} · {delivery?.status === 'confirmed'
                ? `Confirmed by server at ${clockLabel(delivery.receivedAt!)}`
                : delivery?.status === 'rejected'
                  ? `Not delivered: ${delivery.message}`
                  : 'Pending · waiting for server confirmation'}
            </p>
            {#if delivery?.status === 'rejected'}<button
                class="crew-inline-button"
                onclick={() => ring?.retryRejected(lastEvent!.id)}>Retry this event</button
              >{/if}{:else}<p>
              A gesture captures available readings. It never guesses a symptom.
            </p>{/if}
        </div>
      </section>
      <section class="sim-gesture" aria-label="Ring gesture controls">
        <h2>Record a moment</h2>
        <button
          bind:this={surface}
          class="sim-surface"
          class:surface-pressed={pressed}
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={cancel}
          onlostpointercapture={lostCapture}
          oncontextmenu={(e) => e.preventDefault()}
          onclick={(e) => {
            if (e.detail === 0) capture('button');
          }}
          aria-label="Ring touch surface. Double tap to capture a moment. Swipe horizontally at least 110 pixels over a quarter second to activate an emergency. Enter captures a moment."
        >
          <RingScene
            connected={ui.status === 'online'}
            {pressed}
            pulse={visualPulse}
            emergency={lastEvent?.kind === 'emergency'}
            labeled={false}
          />
          <span class="sim-surface-hint">Double tap anywhere on this surface</span>
        </button>
        <ul class="sim-legend">
          <li><strong>Double tap</strong><span>Capture this moment</span></li>
          <li><strong>Deliberate swipe</strong><span>Send an emergency</span></li>
        </ul>
      </section>

      <details class="crew-disclosure sim-controls">
        <summary>Simulation controls <span class="sim-count">{ui.transmissions} sent</span></summary
        >
        <div>
          <h3>Signal scenario</h3>
          <div class="sim-scenarios">
            {#each [{ id: 'normal', label: 'Normal' }, { id: 'drift', label: 'Progressive' }, { id: 'excursion', label: 'Excursion' }] as s}<button
                class="crew-button secondary"
                aria-pressed={ui.config.scenario === s.id}
                disabled={ui.status !== 'online'}
                onclick={() => scenario(s.id as Scenario)}>{s.label}</button
              >{/each}
          </div>
          <p>
            Values move gradually. These scenarios and ranges are presentation fixtures, not medical
            conditions.
          </p>
          <div class="sim-buttons">
            <button
              class="crew-button secondary"
              onclick={() => {
                if (ui?.status === 'online') ring?.disconnect();
                else ring?.connect();
                revision++;
              }}>{ui.status === 'online' ? 'Disconnect ring' : 'Connect / retry'}</button
            ><button
              class="crew-button secondary"
              onclick={() => {
                ring?.pause(!ui?.paused);
                revision++;
              }}>{ui.paused ? 'Resume telemetry' : 'Pause telemetry'}</button
            >
          </div>
          <p>Pausing keeps the connection open so the monitor can show a stale signal.</p>
          <button
            class="crew-inline-button"
            disabled={ui.pending.length > 0}
            onclick={changeBinding}>Change astronaut / device</button
          >
          <p>
            Release the old binding on the monitor before linking a different ring. Pending events
            must be confirmed first.
          </p>
        </div>
      </details>
      {#if history.length}<details class="crew-disclosure sim-controls">
          <summary
            >Recent gestures <span class="sim-count">{ui.pending.length} pending</span></summary
          >
          <ul class="sim-recent">
            {#each history as event (event.id)}<li>
                <strong>{event.kind === 'emergency' ? 'Emergency' : 'Moment'}</strong><span
                  >{clockLabel(event.occurredAt)}</span
                ><span>{ui.deliveries[event.id]?.status ?? 'pending'}</span>
              </li>{/each}
          </ul>
        </details>{/if}
    {/if}
    {#if storageWarning || ui?.storageError}<p class="crew-error" role="alert">
        {storageWarning || ui?.storageError}
      </p>{/if}
    <footer class="crew-footer">
      <span><strong>No commercial wearable connected.</strong></span>
      <div>
        <a href="/crew" target="_blank" rel="noreferrer"
          >Open crew monitor <Icon name="arrow" size={15} /></a
        >
      </div>
    </footer>
  </main>
</div>
