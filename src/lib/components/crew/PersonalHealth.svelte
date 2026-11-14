<script lang="ts">
  import Icon from '../Icon.svelte';
  import Trend from './Trend.svelte';
  import { freshness, ageLabel, clockLabel, metricKeys, metricInfo, outsideDemo } from '$lib/crew/model';
  import type { MissionState, MetricKey } from '$lib/crew/types';
  let { mission, online, now, ondetail, onhistory, identity }: {identity:string;mission:MissionState;online:boolean;now:number;ondetail:(id:string)=>void;onhistory:(id:string)=>void}=$props();
  let metric=$state<MetricKey>('pulse');
  let person=$derived(mission.crew.find(c=>c.id===identity)!);
  let status=$derived(online?freshness(person.connected,person.latest?.receivedAt??null,person.config.intervalMs,now):'offline');
  let events=$derived(mission.events.filter(e=>e.astronautId===identity));
  let open=$derived(events.filter(e=>e.kind==='emergency' && e.status!=='resolved'));
  let outside=$derived(status==='live'?outsideDemo(person.latest?.values??null,person.config):[]);
</script>
<section class="personal-heading">
  <div><h1>My health</h1><p>Your signals, your context, your next step.</p></div>
  <div class="personal-monitor-context"><span class="crew-eyebrow">PERSONAL MONITOR</span><strong>{person.callsign} · {person.name}</strong></div>
</section>
<div class="personal-layout">
  <div class="personal-main">
    <section class="personal-identity">
      <span class="crew-insignia" style={`--crew-color:${person.color}`}>{person.callsign[0]}<small>{person.callsign}</small></span>
      <div><h2>{person.name}</h2><p>{person.role} · Cabin demonstration</p></div>
      <span class="personal-source">Simulated ring data</span>
    </section>
    <section class="health-next" class:health-emergency={open.length>0} aria-label="Current status and next step">
      <Icon name={open.length?'pulse':status==='live'?'check':'unlink'} size={25}/>
      <div><h2>{open.length?'Your emergency is still open':!online?'Monitor connection interrupted':status==='live'?(outside.length?'A change to review':'Your signals are arriving'):status==='waiting'?'Waiting for your first signal':status==='stale'?'Your signal needs reconnecting':person.deviceId?'Your ring is disconnected':'Connect your ring to begin'}</h2>
        <p>{open.length?'Open the record to see its acknowledgement and response history.':!online?'Values below are the last received. New measurements cannot be confirmed here until the link returns.':status==='live'?(outside.length?'Some readings are outside the simulated reference. Review their context in signal details.':'Capture a moment on your ring when you want to keep a reading and add context.'):person.latest?'Your last readings remain available below. Open your ring and keep its page visible to resume transmission.':'No measurements have been received for this astronaut. Open the simulator to link a ring.'}</p>
        {#if open.length}<button class="crew-button danger" onclick={()=>onhistory(identity)}>Review emergency <Icon name="arrow" size={17}/></button>
        {:else if status!=='live'}<a class="crew-button" href={`/ring?astronaut=${identity}`} target="_blank" rel="noreferrer">Open my ring <Icon name="arrow" size={17}/></a>
        {:else}<button class="crew-button secondary" onclick={()=>ondetail(identity)}>Review signal details <Icon name="arrow" size={17}/></button>{/if}
      </div>
    </section>
    <section class="personal-signals" aria-label="Personal vital signs">
      <div class="health-section-title"><h2>{status==='live'?'Current signals':'Last known signals'}</h2><span>{ageLabel(person.latest?.receivedAt??null,now)}</span></div>
      <div class="health-readings">{#each metricKeys as key}<div class:reading-outside={outside.includes(key)}><span>{metricInfo[key].label}</span><strong>{person.latest?person.latest.values[key].toFixed(metricInfo[key].digits):'—'} <small>{metricInfo[key].unit}</small></strong><small>{key==='skin'?'From fictional baseline':key==='hrv'?'Heartbeat variation':status==='live'?'Simulated measurement':person.latest?'Last known measurement':'No measurement'}</small></div>{/each}</div>
      {#if person.latest}<p class="health-source-note">Measured {clockLabel(person.latest.measuredAt)} · Received {clockLabel(person.latest.receivedAt)}. {status!=='live'?'These are historical readings.':''}</p>{:else}<p class="health-source-note">Missing signals stay empty. A connection status is not a health assessment.</p>{/if}
      <div class="personal-trend"><div class="trend-selector"><label for="personal-trend">Recent trend</label><select id="personal-trend" bind:value={metric}>{#each metricKeys as key}<option value={key}>{metricInfo[key].label}</option>{/each}</select></div><Trend samples={person.samples} {metric} intervalMs={person.config.intervalMs}/></div>
      <button class="crew-inline-button" onclick={()=>ondetail(identity)}>All measurements & reference explanations <Icon name="arrow" size={17}/></button>
    </section>
  </div>
  <aside class="personal-aside">
    <section class="health-journal-preview"><h2>Your recorded moments</h2><p>Keep the reading. Add what you experienced.</p>
      {#if events.length}{#each events.slice(0,3) as event (event.id)}<button class="activity-preview" onclick={()=>onhistory(identity)}><span>{clockLabel(event.occurredAt)}</span><strong>{event.kind==='emergency'?`Emergency · ${event.status}`:'Moment captured'}</strong><small>{event.annotations.length?`${event.annotations.length} notes attached`:'Ready for your context'}<Icon name="arrow" size={16}/></small></button>{/each}<button class="crew-inline-button" onclick={()=>onhistory(identity)}>Open my event log <Icon name="arrow" size={17}/></button>
      {:else}<div class="personal-empty"><Icon name="book" size={28}/><h3>No moments recorded yet</h3><p>Use Capture moment on your ring, then add your words to the received event.</p><a class="crew-inline-button" href={`/ring?astronaut=${identity}`} target="_blank" rel="noreferrer">Open ring controls <Icon name="arrow" size={17}/></a></div>{/if}
      <p class="health-source-note">Received means saved by the server. It does not mean reviewed by a medical officer. This demo shares event notes with the crew monitor.</p>
    </section>
    <section class="health-roadmap"><h2>Beyond vital signs</h2><p>The next parts of your health picture.</p>
      {#each [{icon:'moon',title:'Sleep & attention',text:'Nightly history and your own fatigue check-in.'},{icon:'heart',title:'Activity & recovery',text:'Exercise context alongside signal changes.'},{icon:'book',title:'Wellbeing & follow-up',text:'Private check-ins and an agreed next review.'},{icon:'meal',title:'Nutrition & hydration',text:'Quick records of meals and drinks.'}] as module}
        <div class="health-module"><Icon name={module.icon as 'moon'} size={21}/><div><h3>{module.title}</h3><p>{module.text}</p><span>Planned · not connected</span></div></div>
      {/each}
    </section>
  </aside>
</div>
