<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import Icon from '../Icon.svelte';
  import MissionStatus from './MissionStatus.svelte';
  import VitalReadings from './VitalReadings.svelte';
  import HealthCheckIn from './HealthCheckIn.svelte';
  import AutomaticHealth from './AutomaticHealth.svelte';
  import '$lib/crew/health.css';
  import MissionSources from './MissionSources.svelte';
  import { activeSource } from '$lib/crew/suit';
  import type { MissionState, ClientMessage } from '$lib/crew/types';
  let {
    mission,
    online,
    now,
    ondetail,
    onhistory,
    ondevices,
    send,
    identity,
    startCheckin = false,
  }: {
    send: (m: ClientMessage & { id: string }) => Promise<boolean>;
    identity: string;
    startCheckin?: boolean;
    mission: MissionState;
    online: boolean;
    now: number;
    ondetail: (id: string) => void;
    onhistory: (id: string) => void;
    ondevices: () => void;
  } = $props();
  let person = $derived(mission.crew.find((c) => c.id === identity)!);
  let primary = $derived(activeSource(person));
  let reportForm = $state<HTMLDetailsElement>();
  let trendOpen = $state(false);
  onMount(() => {
    const screen = matchMedia('(min-width: 651px)');
    const resize = () => (trendOpen = screen.matches);
    resize();
    screen.addEventListener('change', resize);
    return () => screen.removeEventListener('change', resize);
  });
  let checkinStarted = $state(false);
  $effect(() => {
    if (startCheckin && !checkinStarted) {
      checkinStarted = true;
      untrack(() => void addContext());
    }
  });
  let reportRequest = $state(0);
  async function addContext() {
    reportRequest += 1;
    await tick();
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
    <h1>My health</h1>
  </section>
  {#if open.length}
    <div class="medbay-open-emergency" role="alert">
      <strong>Your emergency is still open.</strong>
      <button class="crew-button danger" onclick={() => onhistory(identity)}
        >Review emergency <Icon name="arrow" size={17} /></button
      >
    </div>
  {/if}
  <MissionStatus member={person} {online} {now} {ondevices} />
  <div class="medbay-console" class:is-solo={!primary.latest}>
    <div class="medbay-assessment">
      {#key identity}<AutomaticHealth
          member={person}
          {online}
          {now}
          compact
          oncontext={addContext}
          connectHref={`/${primary.type === 'spacesuit' ? 'suit' : 'ring'}?astronaut=${identity}`}
        />{/key}
    </div>
    <!-- Until the source has sent something there is nothing to show: no empty table. -->
    {#if primary.latest}<section class="medbay-telemetry" aria-label="My telemetry">
        <VitalReadings member={person} {online} {now} />
        <details class="medbay-trend" bind:open={trendOpen}>
          <summary>Heart rate trend <Icon name="chevron" size={17} /></summary>
          <MissionSources member={person} {online} {now} {send} presentation="trend" />
        </details>
        <button class="crew-inline-button" onclick={() => ondetail(identity)}
          >All measurements &amp; source details <Icon name="arrow" size={16} /></button
        >
      </section>{/if}
  </div>
  <details class="mission-phase-settings">
    <summary
      ><span>Mission phase</span><strong
        >{person.phase === 'spacewalk'
          ? 'Spacewalk'
          : person.phase === 'recovery'
            ? 'Recovery'
            : 'Cabin'}</strong
      ><Icon name="chevron" size={17} /></summary
    >
    <section class="medbay-phase" aria-label="Mission phase control">
      <div>
        <h2>Select a mission phase</h2>
        <p>{primary.label} is the primary source.</p>
      </div>
      <MissionSources member={person} {online} {now} {send} presentation="phase" />
    </section>
  </details>
</div>
{#key `${identity}:${reportRequest}`}
  <details
    bind:this={reportForm}
    class="optional-checkin medbay-report"
    open={startCheckin ||
      reportRequest > 0 ||
      person.healthChecks.at(-1)?.guide.level === 'help' ||
      person.healthChecks.at(-1)?.followups.at(-1)?.outcome === 'worse'}
  >
    <summary><span>Health check-in</span><Icon name="chevron" size={18} /></summary>
    <HealthCheckIn
      member={person}
      {events}
      {online}
      {now}
      {send}
      startNew={reportRequest > 0 || startCheckin}
    />
  </details>
{/key}
