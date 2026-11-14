<script lang="ts">
  import Icon from '../Icon.svelte';
  import AstronautFigure from './AstronautFigure.svelte';
  import VitalReadings from './VitalReadings.svelte';
  import HealthCheckIn from './HealthCheckIn.svelte';
  import AutomaticHealth from './AutomaticHealth.svelte';
  import { healthTopics } from '$lib/crew/health';
  import '$lib/crew/health.css';
  import MissionSources from './MissionSources.svelte';
  import RadiationContext from './RadiationContext.svelte';
  import { activeSource } from '$lib/crew/suit';
  import { freshness, ageLabel, clockLabel } from '$lib/crew/model';
  import type { MissionState, ClientMessage } from '$lib/crew/types';
  let {
    mission,
    online,
    now,
    ondetail,
    onhistory,
    send,
    identity,
  }: {
    send: (m: ClientMessage & { id: string }) => Promise<boolean>;
    identity: string;
    mission: MissionState;
    online: boolean;
    now: number;
    ondetail: (id: string) => void;
    onhistory: (id: string) => void;
  } = $props();
  let person = $derived(mission.crew.find((c) => c.id === identity)!);
  let primary = $derived(activeSource(person));
  let status = $derived(
    online
      ? freshness(primary.connected, primary.latest?.receivedAt ?? null, primary.intervalMs, now)
      : 'offline',
  );
  let reportForm = $state<HTMLDetailsElement>();
  function addContext() {
    if (!reportForm) return;
    reportForm.open = true;
    reportForm.scrollIntoView({ behavior: 'instant', block: 'start' });
    reportForm.querySelector<HTMLElement>('button, input, textarea')?.focus();
  }
  let events = $derived(mission.events.filter((e) => e.astronautId === identity));
  let open = $derived(events.filter((e) => e.kind === 'emergency' && e.status !== 'resolved'));
</script>

<div class="medbay-overview">
  <section class="medbay-heading">
    <div>
      <h1>My health</h1>
    </div>
  </section>
  <div class="medbay-console">
    <section class="medbay-telemetry" aria-label="My telemetry">
      <VitalReadings member={person} {online} {now} />
      <MissionSources member={person} {online} {now} {send} presentation="trend" />
      <button class="crew-inline-button" onclick={() => ondetail(identity)}
        >All measurements &amp; source details <Icon name="arrow" size={16} /></button
      >
    </section>
    <AstronautFigure member={person} {online} {now} />
    <div class="medbay-assessment">
      {#key identity}<AutomaticHealth
          member={person}
          {online}
          {now}
          compact
          oncontext={addContext}
        />{/key}
      {#if status !== 'live'}
        <a
          class="crew-button medbay-connect"
          href={`/${primary.type === 'spacesuit' ? 'suit' : 'ring'}?astronaut=${identity}`}
          target="_blank"
          rel="noreferrer"
          >Open my {primary.type === 'spacesuit' ? 'suit' : 'ring'} simulator <Icon
            name="arrow"
            size={17}
          /></a
        >
      {/if}
      <a class="medbay-nasa" href="https://www.nasa.gov/hrp/risks/" target="_blank" rel="noreferrer"
        ><Icon name="book" size={18} /> NASA health resources <Icon name="arrow" size={16} /></a
      >
    </div>
  </div>
  <section class="medbay-phase" aria-label="Mission phase control">
    <div>
      <h2>Mission phases</h2>
      <p>{primary.label} is the primary source.</p>
    </div>
    <MissionSources member={person} {online} {now} {send} presentation="phase" />
  </section>
  <p class="medbay-scene-credit">AI-generated concept illustration</p>
</div>
{#if open.length}
  <div class="medbay-open-emergency">
    <strong>Your emergency is still open.</strong><button
      class="crew-button danger"
      onclick={() => onhistory(identity)}>Review emergency <Icon name="arrow" size={17} /></button
    >
  </div>
{/if}
{#key identity}
  <details
    bind:this={reportForm}
    class="optional-checkin medbay-report"
    open={person.healthChecks.at(-1)?.guide.level === 'help' ||
      person.healthChecks.at(-1)?.followups.at(-1)?.outcome === 'worse'}
  >
    <summary
      ><span>Report symptoms or review saved check-ins</span><span class="medbay-summary-note"
        >Your words add context to your readings</span
      ></summary
    >
    <HealthCheckIn member={person} {events} {online} {now} {send} />
  </details>
{/key}
<div class="medbay-followup">
  <section class="health-journal-preview">
    <h2>Your recorded moments</h2>
    <p>Keep the reading. Add what you experienced.</p>
    {#if events.length}{#each events.slice(0, 3) as event (event.id)}<button
          class="activity-preview"
          onclick={() => onhistory(identity)}
          ><span>{clockLabel(event.occurredAt)}</span><strong
            >{event.kind === 'emergency'
              ? `Emergency · ${event.status}`
              : 'Moment captured'}</strong
          ><small
            >{event.annotations.length
              ? `${event.annotations.length} notes attached`
              : 'Ready for your context'}<Icon name="arrow" size={16} /></small
          ></button
        >{/each}<button class="crew-inline-button" onclick={() => onhistory(identity)}
        >Open my records <Icon name="arrow" size={17} /></button
      >
    {:else}<div class="personal-empty">
        <Icon name="book" size={28} />
        <h3>No moments recorded yet</h3>
        <p>Capture on your active source, then add your words to the received event.</p>
        <a
          class="crew-inline-button"
          href={`/${primary.type === 'spacesuit' ? 'suit' : 'ring'}?astronaut=${identity}`}
          target="_blank"
          rel="noreferrer"
          >Open {primary.type === 'spacesuit' ? 'suit' : 'ring'} controls <Icon
            name="arrow"
            size={17}
          /></a
        >
      </div>{/if}
    <p class="health-source-note">
      Received means saved by the server. It does not mean reviewed by a medical officer. This demo
      shares event notes with the crew monitor.
    </p>
  </section>
  <details class="health-learning medbay-learning">
    <summary>Understand your health</summary>
    <p>What the indicators can tell you, and why your own report matters.</p>
    {#each Object.values(healthTopics) as topic}<article>
        <h3>{topic.title}</h3>
        <p>{topic.why}</p>
        <a href={topic.source} target="_blank" rel="noreferrer">{topic.sourceTitle} ↗</a>
      </article>{/each}
    <article>
      <h3>When to involve the crew</h3>
      <p>
        Ask directly when you need help. Bring new, worsening or unexplained changes to the crew
        medical officer. A received record is not a medical consultation.
      </p>
    </article>
  </details>
</div>
<details class="crew-disclosure medbay-sources">
  <summary>Mission sources, suit telemetry &amp; phase history</summary>
  <MissionSources member={person} {online} {now} {send} />
</details>
<details class="crew-disclosure">
  <summary>Explore NASA environmental context · historical radiation</summary><RadiationContext />
</details>
