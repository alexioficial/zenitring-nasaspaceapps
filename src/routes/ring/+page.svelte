<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import RingScene from '$lib/components/RingScene.svelte';
  import { RingClient } from '$lib/crew/ring-client';
  import { GestureRecognizer, type Gesture } from '$lib/crew/gestures';
  import { socketUrl } from '$lib/crew/connection';
  import { crewDefaults, metricKeys, metricInfo, newId, clockLabel, validMetrics } from '$lib/crew/model';
  import type { EventInput, Scenario } from '$lib/crew/types';
  import '$lib/crew/crew.css';

  let selected=$state('vega');let deviceName=$state('Cabin ring');let deviceId=$state('');let ready=$state(false);
  let ring:RingClient|null=null;let revision=$state(0);let active=$state(false);let feedback=$state('Ready for a gesture.');
  let confirmEmergency=$state(false);
  let visualPulse=$state(0);
  let lastEvent=$state<EventInput|null>(null);let history=$state<EventInput[]>([]);let storageWarning=$state('');let pressed=$state(false);
  let surface=$state<HTMLButtonElement>();let pointer:number|null=null;const recognizer=new GestureRecognizer();
  let ui=$derived.by(()=>{void revision;return ring?{status:ring.status,error:ring.error,config:ring.config,values:ring.values,sampledAt:ring.sampledAt,transmittedAt:ring.transmittedAt,transmissions:ring.transmissions,pending:ring.pending,deliveries:ring.deliveries,paused:ring.paused,storageError:ring.storageError}:null;});
  let astronaut=$derived(crewDefaults.find(c=>c.id===selected)!);
  let delivery=$derived(lastEvent?ui?.deliveries[lastEvent.id]:undefined);
  let pendingEmergencies=$derived(ui?.pending.filter(e=>e.kind==='emergency')??[]);
  function remember(){try{sessionStorage.setItem('zenit-ring-identity',JSON.stringify({deviceId,selected,deviceName}));}catch{storageWarning='Device identity is in this tab only. Keep this page open through the demonstration.';}}
  function start(){
    if(!ready)return;ring?.dispose();remember();
    const key=`zenit-ring-outbox-${deviceId}`;
    ring=new RingClient({url:socketUrl(),deviceId,astronautId:selected,deviceName,onChange:()=>revision++,load:()=>{
      const raw=localStorage.getItem(key);if(!raw)return null;const saved=JSON.parse(raw);
      if(!Array.isArray(saved.pending) || !saved.deliveries || saved.pending.some((e:EventInput)=>e.deviceId!==deviceId || e.astronautId!==selected || typeof e.id!=='string' || typeof e.occurredAt!=='number' || (e.snapshot!==null && !validMetrics(e.snapshot))))throw Error('Invalid saved outbox');
      history=saved.pending;lastEvent=saved.pending.at(-1)??null;return saved;
    },save:saved=>localStorage.setItem(key,JSON.stringify(saved))});
    active=true;ring.connect();revision++;
  }
  onMount(()=>{
    deviceId=newId();const query=new URLSearchParams(location.search).get('astronaut');
    let resume=false;
    try{const saved=JSON.parse(sessionStorage.getItem('zenit-ring-identity')??'null');if(saved?.deviceId){deviceId=saved.deviceId;selected=saved.selected;deviceName=saved.deviceName;resume=true;}}catch{storageWarning='Browser storage is unavailable. Keep this tab open until pending events are confirmed.';}
    // Preserve a tab's original association and outbox when opening another crew link.
    // Changing identity must be explicit and is blocked while events are pending.
    if(query && crewDefaults.some(c=>c.id===query)){
      let savedIdentity=false;try{savedIdentity=!!sessionStorage.getItem('zenit-ring-identity');}catch{/* No durable identity. */}
      if(!savedIdentity)selected=query;
      else if(query!==selected)storageWarning='This tab belongs to a different astronaut. Reconnect it to deliver pending events first, then use Change astronaut / device or open this link in a fresh tab.';
    }
    if(!crewDefaults.some(c=>c.id===selected))selected='vega';ready=true;
    // Resume the original association before exposing any rebinding control.
    if(resume)start();
    return()=>ring?.dispose();
  });
  function capture(gesture:Gesture|'button',emergency=false){
    if(!ring)return;const event=ring.capture(gesture,emergency);visualPulse++;lastEvent=event;history=[event,...history].slice(0,20);confirmEmergency=false;feedback=event.kind==='emergency'?'Emergency recorded. Check delivery below.':gesture==='button'?'Moment captured.':'Double tap detected. Moment captured.';
    try{navigator.vibrate?.(event.kind==='emergency'?[60,40,60]:35);}catch{/* Haptics are optional. */}revision++;
  }
  function down(event:PointerEvent){
    if(!event.isPrimary || pointer!==null){recognizer.cancel();pointer=null;pressed=false;return;}
    if(event.pointerType==='mouse' && event.button!==0)return;
    pointer=event.pointerId;pressed=true;recognizer.down(event.clientX,event.clientY,performance.now());surface?.setPointerCapture(pointer);
  }
  function move(event:PointerEvent){if(event.pointerId===pointer)recognizer.move(event.clientX,event.clientY);}
  function up(event:PointerEvent){if(event.pointerId!==pointer)return;pointer=null;pressed=false;const gesture=recognizer.up(event.clientX,event.clientY,performance.now());if(gesture)capture(gesture);}
  function cancel(){pointer=null;pressed=false;recognizer.cancel();}
  // Capture is normally released after pointerup; keep the first tap candidate.
  function lostCapture(){if(pointer!==null)cancel();}
  function scenario(value:Scenario){ring?.connection.command({type:'simulation',id:newId(),scenario:value});}
  function changeBinding(){if(ui?.pending.length){feedback='Deliver every pending event before changing the astronaut or device.';return;}ring?.dispose();ring=null;active=false;deviceId=newId();history=[];lastEvent=null;revision++;}
</script>

<svelte:head><title>ZENIT · Ring simulator</title><meta name="description" content="A mobile simulated astronaut ring. Double tap to capture a moment; deliberately swipe to send an emergency to the crew monitor."/></svelte:head>

<div class="crew-app ring-app">
  <header class="ring-masthead"><a class="crew-brand" href="/"><Icon name="orbit" size={27}/><span>ZENIT<small>RING SIMULATOR</small></span></a><span class="ring-sim-tag">SIMULATED</span></header>
  <main class="ring-content">
    {#if !active}
      <section class="ring-pairing"><span class="crew-eyebrow">YOUR PHONE / A CREW SIGNAL</span><h1>A ring.<br/>A connection.</h1><p>Represent one astronaut. Send simulated signals and real gesture events to the shared crew monitor.</p><form onsubmit={e=>{e.preventDefault();start();}}><label for="ring-astronaut">Choose your astronaut</label><select id="ring-astronaut" bind:value={selected}>{#each crewDefaults as c}<option value={c.id}>{c.callsign} · {c.name}</option>{/each}</select><label for="ring-device-name">Device name</label><input id="ring-device-name" bind:value={deviceName} maxlength="60" required/><p class="ring-device-id">DEVICE / {deviceId.slice(0,12)||'Preparing…'}</p><button class="crew-button" disabled={!ready}>Link this ring <Icon name="link" size={18}/></button></form><p class="ring-pairing-foot">One active ring per astronaut. If a ring is already reserved, the monitor must release its binding first.</p></section>
    {:else if ui}
      <section class="ring-identity"><span class="crew-insignia" style={`--crew-color:${astronaut.color}`}>{astronaut.callsign.slice(0,1)}<small>{astronaut.callsign}</small></span><div><span class="crew-eyebrow">{astronaut.role}</span><h1>{astronaut.name}</h1><p>{deviceName} / {deviceId.slice(0,8)}</p></div></section>
      <div class="ring-connection" class:ring-disconnected={ui.status!=='online'}><span><span class="status-dot"></span>{ui.status==='online'?'Connected to crew monitor':ui.status==='connecting'?'Connecting to mission server':ui.status==='conflict'?'Ring association blocked':'Offline · events will queue'}</span><strong>{ui.config.intervalMs/1000}s<span> transmission</span></strong></div>
      {#if ui.error}<p class="crew-error" role="alert">{ui.error}</p>{/if}
      {#if pendingEmergencies.length}<div class="ring-undelivered" role="alert"><strong>Emergency NOT DELIVERED</strong><p>{pendingEmergencies.length} emergency {pendingEmergencies.length===1?'event is':'events are'} still pending. The central monitor has not confirmed receipt. Reconnect this phone; keep the page open.</p></div>{/if}
      <section class="ring-telemetry" aria-label="Simulated signal being transmitted"><div class="ring-telemetry-heading"><span class="crew-eyebrow">{ui.paused?'RETAINED MEASUREMENTS':'SIMULATED TELEMETRY'}</span><span>{ui.transmittedAt?`Sent ${clockLabel(ui.transmittedAt)}`:'Not yet transmitted'}</span></div><div class="ring-values">{#each metricKeys as key}<div><span>{metricInfo[key].label}</span><strong>{ui.values[key].toFixed(metricInfo[key].digits)}<small>{metricInfo[key].unit}</small></strong></div>{/each}</div><p>Skin Δ is a change from a fictional baseline, not body temperature. HRV is variation between heartbeats.</p></section>
      <section class="ring-primary-actions" aria-label="Quick actions">
        <button class="crew-button" onclick={()=>capture('button')}><Icon name="save" size={20}/> Capture moment</button>
        <button class="crew-button secondary" aria-expanded={confirmEmergency} onclick={()=>confirmEmergency=!confirmEmergency}>Send emergency</button>
        {#if confirmEmergency}<div class="ring-emergency-confirm"><h2>Send an emergency to the crew?</h2><p>This records an emergency and its current readings. Delivery is confirmed separately below.</p><div><button class="crew-button danger" onclick={()=>capture('button',true)}>Confirm emergency</button><button class="crew-button secondary" onclick={()=>confirmEmergency=false}>Cancel</button></div></div>{/if}
      </section>
      <section class="ring-feedback" class:feedback-emergency={lastEvent?.kind==='emergency'} aria-live="polite"><span class="crew-eyebrow">{lastEvent?'CAPTURE & DELIVERY':'READY'}</span><strong>{feedback}</strong>{#if lastEvent}<p>{clockLabel(lastEvent.occurredAt)} · {delivery?.status==='confirmed'?`Confirmed by server at ${clockLabel(delivery.receivedAt!)}`:delivery?.status==='rejected'?`Not delivered: ${delivery.message}`:'Pending delivery · waiting for server confirmation'}</p>{#if delivery?.status==='rejected'}<button class="crew-inline-button" onclick={()=>ring?.retryRejected(lastEvent!.id)}>Retry this event</button>{/if}{:else}<p>A gesture captures available readings. It never guesses a symptom.</p>{/if}</section>
      <section class="ring-gesture-section" aria-label="Ring gesture controls">
        <div class="ring-touch-heading"><h2>Record a moment</h2><span>GESTURE SURFACE</span></div>
        <button bind:this={surface} class="ring-gesture-surface" class:surface-pressed={pressed} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={cancel} onlostpointercapture={lostCapture} oncontextmenu={e=>e.preventDefault()} onclick={e=>{if(e.detail===0)capture('button');}} aria-label="Ring touch surface. Double tap to capture a moment. Swipe horizontally at least 110 pixels over a quarter second to activate an emergency. Enter captures a moment.">
          <RingScene connected={ui.status==='online'} {pressed} pulse={visualPulse} emergency={lastEvent?.kind==='emergency'}/>
          <span class="surface-direction"><span>←</span> swipe deliberately <span>→</span></span><span class="surface-footer">Double tap anywhere on this surface</span>
        </button>
        <div class="gesture-legend"><div><strong>•• Double tap</strong><span>Capture this moment</span></div><div><strong>↔ Deliberate swipe</strong><span>Activate an emergency</span></div></div>
      </section>

      <details class="ring-controls"><summary>Simulation controls <span>{ui.transmissions} transmissions</span></summary><div><h3>Signal scenario</h3><div class="ring-scenarios">{#each [{id:'normal',label:'Normal'},{id:'drift',label:'Progressive change'},{id:'excursion',label:'Demo excursion'}] as s}<button class="crew-button secondary" class:scenario-chosen={ui.config.scenario===s.id} disabled={ui.status!=='online'} onclick={()=>scenario(s.id as Scenario)}>{s.label}</button>{/each}</div><p>Values move gradually. These scenarios and ranges are presentation fixtures, not medical conditions.</p><div class="ring-control-actions"><button class="crew-button secondary" onclick={()=>{if(ui?.status==='online')ring?.disconnect();else ring?.connect();revision++;}}>{ui.status==='online'?'Disconnect ring':'Connect / retry'}</button><button class="crew-button secondary" onclick={()=>{ring?.pause(!ui?.paused);revision++;}}>{ui.paused?'Resume telemetry':'Pause telemetry'}</button></div><p>Pausing telemetry keeps the connection open so the monitor can demonstrate a stale signal.</p><button class="crew-inline-button" disabled={ui.pending.length>0} onclick={changeBinding}>Change astronaut / device</button><p>Release the old binding on the monitor before linking a different ring. Pending events must be confirmed first.</p></div></details>
      {#if history.length}<details class="ring-controls"><summary>Recent gestures <span>{ui.pending.length} pending</span></summary><ul class="ring-recent-events">{#each history as event (event.id)}<li><strong>{event.kind==='emergency'?'Emergency':'Moment'}</strong><span>{clockLabel(event.occurredAt)}</span><span>{ui.deliveries[event.id]?.status??'pending'}</span></li>{/each}</ul></details>{/if}
    {/if}
    {#if storageWarning || ui?.storageError}<p class="crew-error" role="alert">{storageWarning || ui?.storageError}</p>{/if}
    <footer class="ring-footer">Keep this page visible and the screen awake for regular transmission.<br/><strong>Simulated ZENIT hardware · no commercial wearable connected.</strong><a href="/" target="_blank" rel="noreferrer">Open crew monitor <Icon name="arrow" size={15}/></a></footer>
  </main>
</div>
