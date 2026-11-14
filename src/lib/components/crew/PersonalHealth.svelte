<script lang="ts">
  import Icon from '../Icon.svelte';
  import HealthCheckIn from './HealthCheckIn.svelte';
  import { healthTopics } from '$lib/crew/health';
  import '$lib/crew/health.css';
  import MissionSources from './MissionSources.svelte';
  import RadiationContext from './RadiationContext.svelte';
  import { activeSource } from '$lib/crew/suit';
  import Trend from './Trend.svelte';
  import { freshness, ageLabel, clockLabel, metricKeys, metricInfo, outsideDemo } from '$lib/crew/model';
  import type { MissionState, MetricKey, ClientMessage } from '$lib/crew/types';
  let { mission, online, now, ondetail, onhistory, send, identity }: {send:(m:ClientMessage & {id:string})=>Promise<boolean>;identity:string;mission:MissionState;online:boolean;now:number;ondetail:(id:string)=>void;onhistory:(id:string)=>void}=$props();
  let metric=$state<MetricKey>('pulse');
  let person=$derived(mission.crew.find(c=>c.id===identity)!);
  let primary=$derived(activeSource(person));
  let status=$derived(online?freshness(primary.connected,primary.latest?.receivedAt??null,primary.intervalMs,now):'offline');
  let events=$derived(mission.events.filter(e=>e.astronautId===identity));
  let open=$derived(events.filter(e=>e.kind==='emergency' && e.status!=='resolved'));
  let outside=$derived(status==='live' && person.phase!=='spacewalk'?outsideDemo(person.latest?.values??null,person.config):[]);
</script>
<section class="personal-heading">
  <div><h1>My health</h1><p>What might be happening? What should I do next?</p></div>
  <div class="personal-monitor-context"><span class="crew-eyebrow">PERSONAL MONITOR</span><strong>{person.callsign} · {person.name}</strong></div>
</section>
<div class="personal-layout">
  <div class="personal-main">
    <section class="personal-identity">
      <span class="crew-insignia" style={`--crew-color:${person.color}`}>{person.callsign[0]}<small>{person.callsign}</small></span>
      <div><h2>{person.name}</h2><p>{person.role} · {person.phase==='spacewalk'?'Spacewalk':person.phase==='recovery'?'Recovery':'Cabin'} demonstration</p></div>
      <span class="personal-source">Simulated {primary.type==='spacesuit'?'suit':'ring'} data</span>
    </section>
    {#key identity}<HealthCheckIn member={person} {events} {online} {now} {send}/>{/key}
    <MissionSources member={person} {online} {now} {send}/>
    <section class="health-next" class:health-emergency={open.length>0} aria-label="Current status and next step">
      <Icon name={open.length?'pulse':status==='live'?'check':'unlink'} size={25}/>
      <div><h2>{open.length?'Your emergency is still open':!online?'Monitor connection interrupted':status==='live'?(outside.length?'A change to review':'Your signals are arriving'):status==='waiting'?'Waiting for your first signal':status==='stale'?'Your signal needs reconnecting':primary.deviceId?`Your ${primary.label.toLowerCase()} is disconnected`:`Connect your ${primary.type==='spacesuit'?'suit':'ring'} to begin`}</h2>
        <p>{open.length?'Open the record to see its acknowledgement and response history.':!online?'Values below are the last received. New measurements cannot be confirmed here until the link returns.':status==='live'?(outside.length?'Some readings are outside the simulated reference. Review their context in signal details.':'Capture a moment on the active source when you want to keep a reading and add context.'):primary.latest?'Your last readings remain available. Open the active simulator to resume transmission.':'No measurement has arrived from this source. Open its simulator to begin.'}</p>
        {#if open.length}<button class="crew-button danger" onclick={()=>onhistory(identity)}>Review emergency <Icon name="arrow" size={17}/></button>
        {:else if status!=='live'}<a class="crew-button" href={`/${primary.type==='spacesuit'?'suit':'ring'}?astronaut=${identity}`} target="_blank" rel="noreferrer">Open my {primary.type==='spacesuit'?'suit':'ring'} <Icon name="arrow" size={17}/></a>
        {:else}<button class="crew-button secondary" onclick={()=>ondetail(identity)}>Review signal details <Icon name="arrow" size={17}/></button>{/if}
      </div>
    </section>
    {#if person.phase!=='spacewalk'}
    <section class="personal-signals" aria-label="Personal vital signs">
      <div class="health-section-title"><h2>{status==='live'?'Current signals':'Last known signals'}</h2><span>{ageLabel(person.latest?.receivedAt??null,now)}</span></div>
      <div class="health-readings">{#each metricKeys as key}<div class:reading-outside={outside.includes(key)}><span>{metricInfo[key].label}</span><strong>{person.latest?person.latest.values[key].toFixed(metricInfo[key].digits):'—'} <small>{metricInfo[key].unit}</small></strong><small>{key==='skin'?'From fictional baseline':key==='hrv'?'Heartbeat variation':status==='live'?'Simulated measurement':person.latest?'Last known measurement':'No measurement'}</small></div>{/each}</div>
      {#if person.latest}<p class="health-source-note">Measured {clockLabel(person.latest.measuredAt)} · Received {clockLabel(person.latest.receivedAt)}. {status!=='live'?'These are historical readings.':''}</p>{:else}<p class="health-source-note">Missing signals stay empty. A connection status is not a health assessment.</p>{/if}
      <div class="personal-trend"><div class="trend-selector"><label for="personal-trend">Recent trend</label><select id="personal-trend" bind:value={metric}>{#each metricKeys as key}<option value={key}>{metricInfo[key].label}</option>{/each}</select></div><Trend samples={person.samples} {metric} intervalMs={person.config.intervalMs}/></div>
      <button class="crew-inline-button" onclick={()=>ondetail(identity)}>All measurements & reference explanations <Icon name="arrow" size={17}/></button>
    </section>
    {/if}
  </div>
  <aside class="personal-aside">
    <section class="health-journal-preview"><h2>Your recorded moments</h2><p>Keep the reading. Add what you experienced.</p>
      {#if events.length}{#each events.slice(0,3) as event (event.id)}<button class="activity-preview" onclick={()=>onhistory(identity)}><span>{clockLabel(event.occurredAt)}</span><strong>{event.kind==='emergency'?`Emergency · ${event.status}`:'Moment captured'}</strong><small>{event.annotations.length?`${event.annotations.length} notes attached`:'Ready for your context'}<Icon name="arrow" size={16}/></small></button>{/each}<button class="crew-inline-button" onclick={()=>onhistory(identity)}>Open my event log <Icon name="arrow" size={17}/></button>
      {:else}<div class="personal-empty"><Icon name="book" size={28}/><h3>No moments recorded yet</h3><p>Capture on your active source, then add your words to the received event.</p><a class="crew-inline-button" href={`/${primary.type==='spacesuit'?'suit':'ring'}?astronaut=${identity}`} target="_blank" rel="noreferrer">Open {primary.type==='spacesuit'?'suit':'ring'} controls <Icon name="arrow" size={17}/></a></div>{/if}
      <p class="health-source-note">Received means saved by the server. It does not mean reviewed by a medical officer. This demo shares event notes with the crew monitor.</p>
    </section>
    <section class="health-learning"><h2>Understand your health</h2><p>What the indicators can tell you, and why your own report matters.</p>
      {#each Object.values(healthTopics) as topic}<article><h3>{topic.title}</h3><p>{topic.why}</p><a href={topic.source} target="_blank" rel="noreferrer">{topic.sourceTitle} ↗</a></article>{/each}
      <article><h3>When to involve the crew</h3><p>Ask directly when you need help. Bring new, worsening or unexplained changes to the crew medical officer. A received record is not a medical consultation.</p></article>
    </section>
  </aside>
</div>

<details class="crew-disclosure"><summary>Explore NASA environmental context · historical radiation</summary><RadiationContext/></details>
