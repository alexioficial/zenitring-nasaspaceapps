<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import PersonalHealth from '$lib/components/crew/PersonalHealth.svelte';
  import Trend from '$lib/components/crew/Trend.svelte';
  import EventCard from '$lib/components/crew/EventCard.svelte';
  import SimulationSettings from '$lib/components/crew/SimulationSettings.svelte';
  import { MissionConnection, socketUrl } from '$lib/crew/connection';
  import { initialCrew, freshness, outsideDemo, metricKeys, metricInfo, newId, ageLabel, clockLabel } from '$lib/crew/model';
  import type { MissionState, ClientMessage, MetricKey, ServerMessage } from '$lib/crew/types';
  import '$lib/crew/crew.css';

  let {astronautId}:{astronautId?:string}=$props();
  type View='personal'|'overview'|'events'|'pair'|'lab';
  let mission=$state<MissionState>(untrack(()=>({crew:initialCrew().filter(c=>!astronautId || c.id===astronautId),events:[],serverTime:0})));
  let personalId=$derived(astronautId??'vega');let view=$state<View>(untrack(()=>astronautId?'personal':'overview'));let selected=$state<string|null>(untrack(()=>astronautId??null));let metric=$state<MetricKey>('pulse');
  const personalTabs:[View,string,'heart'|'pulse'|'book'|'link'|'monitor'][]=[['personal','My health','heart'],['overview','Signal details','monitor'],['events','Event log','book'],['pair','My ring','link'],['lab','Simulation lab','pulse']];
  let link=$state('connecting');let message=$state('');let now=$state(Date.now());let baseUrl=$state('');let historyFilter=$state('all');
  let copyFeedback=$state<Record<string,'copying'|'copied'|'error'>>({});
  const copyTimers=new Map<string,ReturnType<typeof setTimeout>>();
  let disposed=false;
  let serverEpoch=Date.now();let monotonicEpoch=0;
  let connection:MissionConnection;const requests=new Map<string,(ok:boolean)=>void>();
  let member=$derived(mission.crew.find(c=>c.id===selected));
  let emergencies=$derived(mission.events.filter(e=>e.kind==='emergency' && e.status!=='resolved'));
  let live=$derived(mission.crew.filter(c=>link==='online' && freshness(c.connected,c.latest?.receivedAt??null,c.config.intervalMs,now)==='live').length);
  let attention=$derived(mission.crew.filter(c=>link==='online' && freshness(c.connected,c.latest?.receivedAt??null,c.config.intervalMs,now)==='live' && outsideDemo(c.latest?.values??null,c.config).length>0).length);
  let visibleEvents=$derived(mission.events.filter(e=>(!selected || e.astronautId===selected) && (historyFilter==='all' || e.kind===historyFilter)));
  function receive(m:ServerMessage){
    if(m.type==='state'){mission=m.state;serverEpoch=m.state.serverTime;monotonicEpoch=performance.now();now=serverEpoch;}
    if(m.type==='heartbeat'){serverEpoch=m.serverTime;monotonicEpoch=performance.now();now=serverEpoch;}
    if(m.type==='ack'){requests.get(m.id)?.(true);requests.delete(m.id);}
    if(m.type==='error'){message=m.message;if(m.id){requests.get(m.id)?.(false);requests.delete(m.id);}}
  }
  function send(m:ClientMessage & {id:string}):Promise<boolean>{
    if(!connection || link!=='online'){message='The monitor is offline. Reconnect before saving an operational action.';return Promise.resolve(false);}
    return new Promise(resolve=>{requests.set(m.id,resolve);connection.command(m);});
  }
  onMount(()=>{
    baseUrl=location.origin;
    connection=new MissionConnection({url:socketUrl(),register:{type:'register',role:astronautId?'astronaut':'monitor',astronautId,deviceId:`monitor-${newId()}`},onMessage:receive,onChange:()=>{link=connection.status;if(connection.error)message=connection.error;}});
    monotonicEpoch=performance.now();connection.connect();const clock=setInterval(()=>now=serverEpoch+(performance.now()-monotonicEpoch),1000);
    return()=>{disposed=true;clearInterval(clock);for(const timer of copyTimers.values())clearTimeout(timer);connection.dispose();for(const resolve of requests.values())resolve(false);};
  });
  function focus(id:string){if(astronautId && id!==astronautId)return;selected=id;view='overview';historyFilter='all';message='';}
  function history(id:string){if(astronautId && id!==astronautId)return;selected=id;view='events';historyFilter='all';message='';}
  function navigate(next:View){view=next;if(next==='overview'||next==='events')selected=astronautId??null;message='';}
  const ringUrl=(id:string)=>`${baseUrl.replace(/\/$/,'')}/ring?astronaut=${id}`;
  const personalUrl=(id:string)=>`${baseUrl.replace(/\/$/,'')}/astronaut/${id}`;
  function confirmCopy(id:string){
    if(disposed)return;
    copyFeedback[id]='copied';
    copyTimers.set(id,setTimeout(()=>{delete copyFeedback[id];copyTimers.delete(id);},3500));
  }
  async function copyLink(id:string){
    if(copyFeedback[id]==='copying')return;
    clearTimeout(copyTimers.get(id));copyTimers.delete(id);copyFeedback[id]='copying';
    const url=personalUrl(id);
    try{
      if(navigator.clipboard?.writeText){
        try{await navigator.clipboard.writeText(url);confirmCopy(id);return;}catch{/* LAN HTTP may require the user-initiated copy fallback. */}
      }
      const previous=document.activeElement;
      const field=document.createElement('textarea');field.value=url;field.setAttribute('readonly','');field.setAttribute('aria-hidden','true');field.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(field);
      try{field.select();field.setSelectionRange(0,url.length);if(!document.execCommand('copy'))throw Error('Clipboard unavailable');}
      finally{field.remove();if(previous instanceof HTMLElement)previous.focus({preventScroll:true});}
      confirmCopy(id);
    }catch{if(!disposed)copyFeedback[id]='error';}
  }
  async function release(id:string){if(await send({type:'release',id:newId(),astronautId:id}))message='Ring unlinked. A different device can now connect for this astronaut. Event history has been kept.';}
  function download(){const data={exportedAt:new Date().toISOString(),simulated:true,source:'ZENIT shared server snapshot',...$state.snapshot(mission)};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='zenit-crew-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
</script>

<svelte:head><title>ZENIT · {astronautId?`${mission.crew[0]?.callsign??astronautId} personal monitor`:'Crew monitor'}</title><meta name="description" content="A shared crew monitor for simulated astronaut rings. Real device communication, explicitly simulated biometrics."/></svelte:head>

<div class="crew-app monitor-app" class:central-monitor={!astronautId}>
  <a class="crew-skip" href="#crew-content">Skip to crew monitor</a>
  <header class="crew-masthead">
    <a class="crew-brand" href={astronautId?`/astronaut/${astronautId}`:'/'}><Icon name="orbit" size={29}/><span>ZENIT<small>{astronautId?'PERSONAL MONITOR':'CREW SYSTEMS'}</small></span></a>
    <div class="mission-designation"><span class="crew-eyebrow">MISSION / DEMONSTRATION</span><strong>{astronautId?`${mission.crew[0]?.callsign??astronautId} · Personal health workspace`:'Human signals. Shared awareness.'}</strong></div>
    <div class="masthead-right"><span class="crew-link-status" class:unavailable={link!=='online'}><span class="status-dot"></span>{link==='online'?'Central link online':link==='connecting'?'Connecting to mission server':'Monitor offline'}</span><time>{clockLabel(now)}</time></div>
  </header>
  {#if astronautId}
  <nav class="crew-navigation" aria-label="Astronaut views">
    {#each personalTabs as [id,label,icon]}<button aria-current={view===id?'page':undefined} onclick={()=>navigate(id)}><Icon name={icon} size={18}/>{label}{#if id==='events'}<span class="nav-event-count">{mission.events.length}</span>{/if}</button>{/each}
    <span class="sim-stamp">SIMULATED BIOMETRICS · REAL CONNECTION</span>
  </nav>
  {/if}
  {#if emergencies.length}
    <aside class="crew-emergency-strip" aria-label="Open emergencies"><span class="emergency-label"><Icon name="pulse" size={23}/>{emergencies.length} open {emergencies.length===1?'emergency':'emergencies'}</span><div>{#each emergencies as emergency (emergency.id)}<button onclick={()=>history(emergency.astronautId)}>{mission.crew.find(c=>c.id===emergency.astronautId)?.callsign} <span>{emergency.status==='active'?'Active · respond now':'Acknowledged · still open'}</span><Icon name="arrow" size={16}/></button>{/each}</div></aside>
  {/if}
  {#if link!=='online'}<p class="monitor-offline" role="status">The monitor is not receiving updates. All displayed readings are last known values. {#if link==='offline'}<button class="crew-inline-button" onclick={()=>connection.connect()}>Reconnect</button>{/if}</p>{/if}
  <main id="crew-content" class="crew-content">
    {#if !astronautId}<div class="central-monitor-tools"><span class="crew-eyebrow">CENTRAL MONITOR · ALL CREW</span><div>{#if view!=='overview' || selected}<button class="crew-button secondary" onclick={()=>navigate('overview')}>Crew overview</button>{/if}<button class="crew-button secondary" onclick={()=>navigate(view==='pair'?'overview':'pair')}><Icon name="link" size={17}/>{view==='pair'?'Close astronaut links':'Astronaut links'}</button></div></div>{/if}
    {#if message}<div class="crew-notice" role="status"><span>{message}</span><button aria-label="Dismiss message" onclick={()=>message=''}>×</button></div>{/if}
    {#if view==='personal'}
      <PersonalHealth identity={personalId} {mission} online={link==='online'} {now} ondetail={focus} onhistory={history}/>
    {:else if view==='overview' && !member}
      <section class="crew-page-intro"><div><span class="crew-eyebrow">ONBOARD HEALTH / CREW MANIFEST</span><h1>Crew health monitor</h1><p>Signals and context from every ring. Select an astronaut to look closer.</p></div><div class="crew-summary"><div><strong>{live}<small> / {mission.crew.length}</small></strong><span>current signals</span></div><div class:summary-alert={attention>0}><strong>{attention}</strong><span>outside demo ranges</span></div></div></section>
      <div class="overview-layout">
        <section class="crew-manifest" aria-label="Crew telemetry overview">
          <div class="manifest-labels"><span>Crew / source</span><span>Signal status</span><span>Heart rate</span><span>SpO₂</span><span>Recent pulse</span><span>Last received</span></div>
          {#each mission.crew as person (person.id)}
            {@const status=link==='online'?freshness(person.connected,person.latest?.receivedAt??null,person.config.intervalMs,now):'offline'}
            {@const out=outsideDemo(person.latest?.values??null,person.config)}
            {@const emergency=emergencies.find(e=>e.astronautId===person.id)}
            <button class="crew-manifest-row" class:row-emergency={!!emergency} class:row-stale={status!=='live'} onclick={()=>focus(person.id)}>
              <span class="crew-person"><span class="crew-insignia" style={`--crew-color:${person.color}`}>{person.callsign.slice(0,1)}<small>{person.callsign}</small></span><span><strong>{person.name}</strong><small>{person.role}</small><span class="crew-device-name">{person.deviceName??'No ring linked'}</span></span></span>
              <span class="signal-status" class:signal-attention={status==='live' && out.length>0} class:signal-emergency={!!emergency}><span class="status-dot"></span>{emergency?'Emergency':status==='live'?(out.length?'Demo range exceeded':'Receiving'):status==='waiting'?'Awaiting signal':status==='stale'?'Signal stale':person.deviceId?'Disconnected':'Not linked'}<small>{person.deviceId?`Ring ${person.deviceId.slice(0,6)}`:'Open Link rings to connect'}</small></span>
              <span class="manifest-metric"><strong>{person.latest?Math.round(person.latest.values.pulse):'—'}</strong><small>bpm{status!=='live' && person.latest?' · last known':''}</small></span>
              <span class="manifest-metric oxygen"><strong>{person.latest?person.latest.values.spo2.toFixed(1):'—'}</strong><small>% saturation</small></span>
              <span class="manifest-trend"><Trend samples={person.samples} compact intervalMs={person.config.intervalMs}/></span>
              <span class="last-signal"><strong>{ageLabel(person.latest?.receivedAt??null,now)}</strong><small>{person.latest?clockLabel(person.latest.receivedAt):'No measurement received'}</small><Icon name="arrow" size={18}/></span>
            </button>
          {/each}
          <div class="manifest-foot"><span><span class="status-dot"></span>Sources: simulated ZENIT rings</span><span>Demo references, not diagnoses.</span></div>
        </section>
        <aside class="mission-event-rail"><div class="rail-heading"><span class="crew-eyebrow">MISSION ACTIVITY</span><h2>Recent activity</h2></div>{#if !mission.events.length}<div class="crew-empty"><Icon name="save" size={28}/><h3>Ready for the first gesture.</h3><p>Double tap a linked phone's ring surface. Its captured values will arrive here immediately.</p><button class="crew-inline-button" onclick={()=>navigate('pair')}>Link a ring <Icon name="arrow" size={16}/></button></div>{/if}{#each mission.events.slice(0,5) as event (event.id)}<button class="activity-preview" class:preview-emergency={event.kind==='emergency'} onclick={()=>focus(event.astronautId)}><span>{mission.crew.find(c=>c.id===event.astronautId)?.callsign} / {clockLabel(event.occurredAt)}</span><strong>{event.kind==='emergency'?`Emergency · ${event.status}`:'Moment captured'}</strong><small>{event.annotations.length?`${event.annotations.length} annotation${event.annotations.length===1?'':'s'}`:'Awaiting explicit context'} <Icon name="arrow" size={15}/></small></button>{/each}{#if mission.events.length}<button class="crew-inline-button" onclick={()=>navigate('events')}>Open event log <Icon name="arrow" size={16}/></button>{/if}<div class="rail-explainer"><Icon name="link" size={19}/><p>Measured on the phone.<br/>Confirmed by the shared server.<br/><strong>Original capture time preserved.</strong></p></div></aside>
      </div>
    {:else if view==='overview' && member}
      {@const status=link==='online'?freshness(member.connected,member.latest?.receivedAt??null,member.config.intervalMs,now):'offline'}
      {@const out=outsideDemo(member.latest?.values??null,member.config)}
      {#if !astronautId}<button class="crew-back" onclick={()=>selected=null}>← All crew</button>{/if}
      <section class="crew-page-intro detail-intro"><div><span class="crew-eyebrow">{member.callsign} / {member.role}</span><h1>{member.name}</h1><p>{member.deviceName??'Ring not linked'} · {status==='live'?'Receiving simulated telemetry':status==='stale'?'Stale signal — readings below are last known':status==='waiting'?'Waiting for first measurement':'Disconnected — readings below are last known'}</p></div><div class="detail-reception"><span class="signal-status"><span class="status-dot"></span>{status}</span><span>Received {ageLabel(member.latest?.receivedAt??null,now)}</span>{#if member.latest}<small>Measured {clockLabel(member.latest.measuredAt)}<br/>Received {clockLabel(member.latest.receivedAt)}</small>{/if}</div></section>
      <div class="detail-layout">
        <section class="astronaut-signals" aria-label="Astronaut biometrics">
          <div class="crew-metrics">{#each metricKeys as key}<div class="crew-metric" class:metric-outside={out.includes(key)}><span>{metricInfo[key].label}<button class="metric-help" title={metricInfo[key].description} aria-label={metricInfo[key].description}>?</button></span><strong>{member.latest?member.latest.values[key].toFixed(metricInfo[key].digits):'—'}<small>{metricInfo[key].unit}</small></strong><small>{out.includes(key)?'Outside demo range':`${member.config.ranges[key][0]}–${member.config.ranges[key][1]} demo reference`}</small></div>{/each}</div>
          {#if status!=='live'}<p class="stale-reading-note">No current signal. A retained measurement is historical, even if its value is inside a demo range.</p>{/if}
          <div class="detail-trend-panel"><div class="trend-selector"><label for="trend-metric">Signal trend</label><select id="trend-metric" bind:value={metric}>{#each metricKeys as key}<option value={key}>{metricInfo[key].label}</option>{/each}</select></div><Trend samples={member.samples} {metric} intervalMs={member.config.intervalMs}/><p class="snapshot-caption">Simulated measurements · up to 120 recent samples. Missing signals remain gaps.</p></div>
          <details class="crew-disclosure"><summary>Signal interpretation & sources</summary><div>{#each metricKeys as key}<p><strong>{metricInfo[key].label}:</strong> {metricInfo[key].description}</p>{/each}<p>Demo ranges are configurable presentation references. They do not indicate a diagnosis or fitness for a mission task. Emergency state is activated by an explicit gesture.</p></div></details>
          <details class="crew-disclosure"><summary>Simulation settings · {member.config.intervalMs/1000}s transmission</summary>{#key member.id}<SimulationSettings {member} {send} connected={link==='online'}/>{/key}</details>
        </section>
        <section class="detail-event-log"><div class="section-title"><div><span class="crew-eyebrow">{member.callsign} / CAPTURED EVIDENCE</span><h2>Events & observations</h2></div><span>{visibleEvents.length}</span></div>{#if !visibleEvents.length}<p class="crew-empty">No events for this astronaut. Double tap the phone's ring surface to capture a moment.</p>{/if}{#each visibleEvents as event (event.id)}<EventCard {event} {member} {send} connected={link==='online'}/>{/each}</section>
      </div>
    {:else if view==='events'}
      <section class="crew-page-intro"><div><span class="crew-eyebrow">MISSION / EVENT HISTORY</span><h1>{member?`${member.callsign} · Event log`:'Crew event log'}</h1><p>Original readings, later annotations and a permanent emergency audit.</p></div><label class="event-filter">Show<select bind:value={historyFilter}><option value="all">All events</option><option value="moment">Captured moments</option><option value="emergency">Emergencies</option></select></label></section>
      <div class="full-event-log">{#if !visibleEvents.length}<div class="crew-empty"><h2>No events yet.</h2><p>Use a linked ring to capture a moment or activate an emergency.</p></div>{/if}{#each visibleEvents as event (event.id)}<EventCard {event} member={mission.crew.find(c=>c.id===event.astronautId)!} {send} connected={link==='online'}/>{/each}<p class="snapshot-caption">Showing up to 200 recent events. The server retains older events; download the complete archive below.</p></div>
    {:else if view==='pair'}
      <section class="crew-page-intro"><div><span class="crew-eyebrow">{astronautId?'YOUR DEVICE / RING ASSOCIATION':'CENTRAL MONITOR / ASTRONAUT ACCESS'}</span><h1>{astronautId?'Your ring connection.':'One link for each astronaut.'}</h1><p>{astronautId?'Open your simulated ring on the device transmitting your signals.':'Share one link. It opens the astronaut’s health workspace, with their events and ring controls accessible from My ring.'}</p></div><span class="pair-count">{mission.crew.filter(c=>c.connected).length} rings connected</span></section>
      <section class="pair-address"><label for="mission-address">Mission server address</label><input id="mission-address" type="url" bind:value={baseUrl} placeholder="http://192.168.1.20:3000"/><p>Use the server computer's LAN address, accessible from every device on the same Wi-Fi. localhost points to each device itself. HTTPS automatically uses secure WebSocket.</p></section>
      <div class="pair-list">
        {#each mission.crew as person (person.id)}
          <article>
            <div class="crew-person"><span class="crew-insignia" style={`--crew-color:${person.color}`}>{person.callsign.slice(0,1)}<small>{person.callsign}</small></span><div><h2>{person.name}</h2><p>{person.role} · {person.deviceId?(person.connected?'Ring active':'Ring reserved · disconnected'):'Ready to link'}</p></div></div>
            <div class="pair-links">
              {#if !astronautId}
                <div><span class="crew-eyebrow">ASTRONAUT ACCESS</span><a class="ring-url" href={personalUrl(person.id)} target="_blank" rel="noreferrer">{personalUrl(person.id)}</a><p class="pair-access-note">Health · Events · My ring</p></div>
              {:else}
                <div><span class="crew-eyebrow">YOUR RING SIMULATOR</span><p>Keep it open while sending signals and recording gestures.</p></div>
              {/if}
            </div>
            <div class="pair-actions">
              {#if !astronautId}
                <button class="crew-button copy-link-feedback" class:is-copied={copyFeedback[person.id]==='copied'} class:copy-failed={copyFeedback[person.id]==='error'} disabled={copyFeedback[person.id]==='copying'} aria-busy={copyFeedback[person.id]==='copying'} aria-describedby={`copy-status-${person.id}`} onclick={()=>copyLink(person.id)}><Icon name={copyFeedback[person.id]==='copied'?'check':'link'} size={17}/>{copyFeedback[person.id]==='copied'?'Link copied':copyFeedback[person.id]==='copying'?'Copying…':copyFeedback[person.id]==='error'?'Try copying again':'Copy astronaut link'}</button>
                <span id={`copy-status-${person.id}`} class="copy-link-status" class:copy-status-error={copyFeedback[person.id]==='error'} role="status" aria-atomic="true">{copyFeedback[person.id]==='copied'?`Ready to share with ${person.callsign}.`:copyFeedback[person.id]==='error'?'Copy blocked. Select the URL in this row.':copyFeedback[person.id]==='copying'?'Copying to your clipboard…':''}</span>
                {#if person.deviceId}<details class="pair-device-options"><summary>Device options</summary><p>Deliver pending events and disconnect the current ring before replacing it. Its event history is kept.</p><button class="crew-button secondary" disabled={person.connected || link!=='online'} onclick={()=>release(person.id)}>Unlink current ring</button></details>{/if}
              {:else}
                <a class="crew-button" href={ringUrl(person.id)} target="_blank" rel="noreferrer">Open my ring <Icon name="arrow" size={17}/></a>
              {/if}
            </div>
          </article>
        {/each}
      </div>
      <p class="pair-policy">An astronaut's ring stays linked during a network outage. To replace it, deliver its pending events and disconnect it first, then use Device options → Unlink current ring on the central monitor.</p>
    {:else if view==='lab'}
      <section class="crew-page-intro"><div><span class="crew-eyebrow">DEMONSTRATION / SOURCE CONTROLS</span><h1>Make the signal tell a story.</h1><p>Changes apply to the selected transmitter. Operational emergency actions stay in the event log.</p></div></section>
      <div class="lab-layout" class:personal-lab={!!astronautId}>{#if !astronautId}<nav aria-label="Select simulator">{#each mission.crew as person}<button class:chosen={selected===person.id || (!selected && person.id==='vega')} onclick={()=>selected=person.id}><span>{person.callsign}</span><strong>{person.name}</strong><small>{person.connected?'Connected ring':'Ring offline'}</small></button>{/each}</nav>{/if}<section>{#each mission.crew.filter(c=>c.id===(selected??personalId)) as person (person.id)}<SimulationSettings member={person} {send} connected={link==='online'}/>{/each}<div class="lab-playbook"><h3>A short demonstration</h3><ol><li>Link a ring to your astronaut.</li><li>Double tap the ring; add your words in its event.</li><li>Swipe deliberately across the ring surface to activate an emergency.</li><li>Acknowledge, then resolve with a note.</li><li>Disconnect the phone, capture again, then reconnect to deliver the original evidence.</li></ol></div></section></div>
    {/if}
    <footer class="crew-footer"><span>ZENIT / {astronautId?'Personal monitor':'Central crew monitor'}<br/><strong>All biometrics simulated. No clinical assessment.</strong></span><div>{#if !astronautId}<a href="/archive">Apollo 11 archive</a><a href="/legacy">Personal demo archive</a>{/if}<button onclick={download}>Export visible session</button>{#if !astronautId}<a href="/api/mission-export" download="zenit-complete-log.json">Complete server archive</a>{/if}</div></footer>
  </main>
</div>
