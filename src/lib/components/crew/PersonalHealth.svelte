<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Icon from '../Icon.svelte';
  import AstronautFigure from './AstronautFigure.svelte';
  import VitalReadings from './VitalReadings.svelte';
  import HealthCheckIn from './HealthCheckIn.svelte';
  import AutomaticHealth from './AutomaticHealth.svelte';
  import SpaceHealthRisks from './SpaceHealthRisks.svelte';
  import GuidedHealth from './GuidedHealth.svelte';
  import type { GuidedScenario } from '$lib/crew/health-learning';
  import { riskContext } from '$lib/crew/health-learning';
  import type { AutomaticAnswer } from '$lib/crew/automatic';
  import '$lib/crew/health.css';
  import '$lib/crew/my-health.css';
  import MissionSources from './MissionSources.svelte';
  import { activeSource } from '$lib/crew/suit';
  import type { MissionState, ClientMessage } from '$lib/crew/types';
  let {
    mission,
    online,
    now,
    ondetail,
    onhistory,
    send,
    identity,
    scenario = null,
    onscenario = () => {},
  }: {
    send: (m: ClientMessage & { id: string }) => Promise<boolean>;
    identity: string;
    scenario?: GuidedScenario | null;
    onscenario?: (scenario: GuidedScenario | null) => void;
    mission: MissionState;
    online: boolean;
    now: number;
    ondetail: (id: string) => void;
    onhistory: (id: string) => void;
  } = $props();
  let person = $derived(mission.crew.find((c) => c.id === identity)!);
  let response = $state<{ episode: string; answer: AutomaticAnswer } | null>(null);
  let unresolvedHelp = $derived(
    response?.answer === 'unwell' ||
      response?.answer === 'alert' ||
      riskContext(person, online, now).help,
  );
  let primary = $derived(activeSource(person));
  let simulator = $derived(primary.type === 'spacesuit' ? 'suit' : 'ring');
  // The trend starts open where there is room for it beside the readings.
  let trendOpen = $state(false);
  onMount(() => {
    const screen = matchMedia('(min-width: 651px)');
    const resize = () => (trendOpen = screen.matches);
    resize();
    screen.addEventListener('change', resize);
    return () => screen.removeEventListener('change', resize);
  });
  let reportForm = $state<HTMLDetailsElement>();
  // Each request reopens the check-in on a blank report, even after an earlier save.
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

<div class="medbay-overview" class:medbay-solo={!primary.latest}>
  <section class="medbay-heading">
    <div>
      <h1>My health</h1>
    </div>
  </section>
  {#if open.length}
    <div class="medbay-open-emergency" role="alert">
      <strong>Your emergency is still open.</strong>
      <button class="crew-button danger" onclick={() => onhistory(identity)}
        >Review emergency <Icon name="arrow" size={17} /></button
      >
    </div>
  {/if}
  {#if scenario}
    {#if unresolvedHelp}<div class="learning-help health-learning" role="alert">
        <strong>Your reported concern still needs attention.</strong>
        <p>
          Contact your crew directly and follow the mission medical or suit procedure. Guided
          practice does not resolve this concern or send a message.
        </p>
        <button class="crew-button danger" onclick={() => onscenario(null)}
          >Return to my readings</button
        >
      </div>{/if}
    {#key `${identity}:${scenario}`}<GuidedHealth {scenario} {onscenario} />{/key}
  {:else}
    <div class="learning-launch">
      <p>Understand a change, explore its context, and practice a next step.</p>
      <button class="crew-button" onclick={() => onscenario('archer')}
        >Explore a guided simulation</button
      >
    </div>
    {#key identity}<SpaceHealthRisks member={person} {online} {now} />{/key}
    <div class="medbay-console">
      <!-- Until the source has sent something there is nothing to show: no table of dashes. -->
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
      <AstronautFigure member={person} {online} {now} />
      <section class="medbay-phase" aria-label="Mission phase control">
        <div>
          <h2>Mission phases</h2>
          <p>{primary.label} is the primary source.</p>
        </div>
        <MissionSources member={person} {online} {now} {send} presentation="phase" />
      </section>
      <div class="medbay-assessment">
        {#key identity}<AutomaticHealth
            bind:response
            member={person}
            {online}
            {now}
            compact
            oncontext={addContext}
            connectHref={`/${simulator}?astronaut=${identity}`}
          />{/key}
      </div>
    </div>
  {/if}
</div>
{#if !scenario}
  {#key `${identity}:${reportRequest}`}
    <!-- Opened from "Record how I feel"; saved check-ins keep their row so they can be reviewed. -->
    <details
      bind:this={reportForm}
      class="optional-checkin medbay-report"
      class:has-checkins={person.healthChecks.length > 0}
      open={reportRequest > 0 ||
        person.healthChecks.at(-1)?.guide.level === 'help' ||
        person.healthChecks.at(-1)?.followups.at(-1)?.outcome === 'worse'}
    >
      <summary
        ><span>Health check-in</span>{#if person.healthChecks.length}<span
            class="medbay-summary-note">{person.healthChecks.length} saved</span
          >{/if}<Icon name="chevron" size={18} /></summary
      >
      <HealthCheckIn member={person} {events} {online} {now} {send} startNew={reportRequest > 0} />
    </details>
  {/key}
{/if}
