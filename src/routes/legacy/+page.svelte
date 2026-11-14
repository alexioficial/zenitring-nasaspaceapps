<script lang="ts">
  import { onMount, tick as updateDOM } from 'svelte';
  import { createMission, tick, setMonitor, addEntry, captureMoment, annotateMoment, syncDemoInstruments, restoreMission, STORAGE_KEY, timestamp, type Entry } from '$lib/mission';
  import Icon, { type IconName } from '$lib/components/Icon.svelte';
  import MissionTimeline from '$lib/components/MissionTimeline.svelte';
  import Recovery from '$lib/components/Recovery.svelte';
  import RingControl from '$lib/components/RingControl.svelte';
  import VitalsBoard from '$lib/components/VitalsBoard.svelte';
  import MomentLog from '$lib/components/MomentLog.svelte';
  import MedicalMonitor from '$lib/components/MedicalMonitor.svelte';
  import ApolloExplorer from '$lib/components/ApolloExplorer.svelte';
  import HealthJournal from '$lib/components/HealthJournal.svelte';

  type Module = 'mission' | 'apollo' | 'sleep' | 'wellbeing' | 'nutrition';
  const modules: { id: Module; label: string; icon: IconName }[] = [
    { id: 'mission', label: 'Mission health', icon: 'pulse' },
    { id: 'sleep', label: 'Sleep & attention', icon: 'moon' },
    { id: 'wellbeing', label: 'Wellbeing', icon: 'heart' },
    { id: 'nutrition', label: 'Nutrition', icon: 'meal' },
    { id: 'apollo', label: 'Apollo 11 archive', icon: 'archive' }
  ];
  let mission = $state(createMission());
  let active = $state<Module>('mission');
  let phase = $state(2);
  let selectedMoment = $state<string | null>(null);
  let showMonitor = $state(false);
  let ready = $state(false);
  let storageError = $state('');
  let notice = $state('');
  let pending = $derived(mission.entries.filter(entry => entry.receivedAt === null).length);

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mission)); storageError = ''; }
    catch { storageError = 'Device storage is unavailable. Entries are kept in this tab only. Export your log before closing it.'; }
  }
  function selectModule(id: Module) { notice = ''; active = id; history.replaceState(null, '', `#${id}`); }
  function readHash() {
    const id = location.hash.slice(1);
    active = modules.find(module => module.id === id)?.id ?? 'mission';
  }
  onMount(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = restoreMission(raw);
      if (saved) mission = saved;
      else if (raw) { storageError = 'The saved session could not be restored. This demo is running in memory; export it to keep a copy.'; }
    } catch { storageError = 'Device storage is unavailable. This demo is running in memory.'; }
    ready = true;
    if (!storageError) persist();
    readHash();
    const timer = setInterval(() => { mission = tick(mission); if (!storageError) persist(); }, 2000);
    window.addEventListener('hashchange', readHash);
    return () => { clearInterval(timer); window.removeEventListener('hashchange', readHash); };
  });
  function save(input: Pick<Entry, 'kind' | 'summary' | 'notes' | 'manualPulse'>) {
    mission = addEntry(mission, input, crypto.randomUUID());
    if (!storageError) persist();
    notice = mission.monitorConnected ? 'Entry received by the simulated medical monitor.' : 'Entry recorded. Delivery pending until the medical link is restored.';
  }
  async function capture(gesture: 'ring-double-tap' | 'ring-hold' | 'screen') {
    if (gesture !== 'screen' && !mission.sensorConnected) return;
    const id = crypto.randomUUID();
    mission = captureMoment(mission, id, gesture);
    if (!storageError) persist();
    notice = 'Moment captured with its original readings. You can add context later.';
    if (gesture !== 'ring-double-tap') {
      selectedMoment = id;
      await updateDOM();
      document.getElementById(`moment-${id}`)?.scrollIntoView({ block: 'nearest' });
    }
  }
  function annotate(id: string, symptom: string) {
    mission = annotateMoment(mission, id, symptom, crypto.randomUUID());
    if (!storageError) persist();
    notice = `${symptom} saved against the captured moment. Original readings preserved.`;
  }
  function syncInstruments() {
    mission = syncDemoInstruments(mission);
    if (!storageError) persist();
    notice = 'Simulated instrument measurements imported. Future snapshots include them with their own sources.';
  }
  function toggleMonitor() {
    const wasConnected = mission.monitorConnected;
    const count = pending;
    mission = setMonitor(mission, !wasConnected);
    if (!storageError) persist();
    notice = wasConnected ? 'Medical link interrupted. Local monitoring continues.' : `Medical link restored. ${count} pending ${count === 1 ? 'entry received' : 'entries received'} with original timestamps.`;
  }
  function toggleSensor() {
    mission = { ...mission, sensorConnected: !mission.sensorConnected };
    if (!storageError) persist();
    notice = mission.sensorConnected ? 'Ring reconnected. Sampling resumes on the next tick.' : 'Ring signal lost. Manual reporting remains available.';
  }
  function exportLog() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), simulated: true, ...mission }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'zenit-mission-log.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice = 'Mission log exported as JSON.';
  }
</script>

<svelte:head><title>ZENIT · Mission health</title><meta name="description" content="Astronaut health in mission context. Explore NASA Apollo 11 observations and a local-first simulated crew health workflow."/></svelte:head>

<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="#mission" onclick={() => selectModule('mission')} aria-label="ZENIT home"><Icon name="orbit" size={31}/><span>ZENIT</span></a>
    <div class="crew-identity"><div class="crew-avatar">01</div><div><strong>Crew member 01</strong><span>Cabin · Mission simulation</span></div></div>
    <nav aria-label="Health modules">{#each modules as module}<a href={`#${module.id}`} aria-label={module.label} title={module.label} onclick={() => selectModule(module.id)} aria-current={active === module.id ? 'page' : undefined}><Icon name={module.icon}/><span>{module.label}</span>{#if module.id === 'apollo'}<span class="nav-mark">NASA</span>{/if}</a>{/each}</nav>
    <div class="sidebar-bottom"><Icon name="orbit" size={27}/><p>Care that stays<br/>with the crew.</p><span>Space Apps concept · v0.1</span></div>
  </aside>

  <div class="main-shell">
    <header class="topbar"><div class="breadcrumb">Crew workspace <Icon name="chevron" size={13}/><span>{modules.find(m => m.id === active)?.label}</span></div><div class="topbar-actions"><span class="demo-label">{active === 'apollo' ? 'Historical archive' : 'Simulation'}</span>{#if active !== 'apollo'}<button class="button secondary" aria-expanded={showMonitor} aria-controls="medical-section" onclick={() => showMonitor = !showMonitor}><Icon name="monitor" size={17}/>{showMonitor ? 'Hide monitor' : 'Medical monitor'}</button>{/if}</div></header>
    <main id="main-content">
      <div class="page-heading"><div><h1>{active === 'apollo' ? 'The human side of Apollo.' : 'Every signal has a story.'}</h1><p>{active === 'apollo' ? 'Historical observations. Real mission context.' : 'Capture a moment. Add context when you’re ready.'}</p></div>{#if active !== 'apollo'}<div class="mission-clock"><span>MISSION CLOCK · UTC</span><strong>{timestamp(mission.clock)}</strong></div>{/if}</div>
      {#if active !== 'apollo'}<div class="connection-bar"><span class="connection" class:offline={!mission.sensorConnected}><Icon name={mission.sensorConnected ? 'pulse' : 'unlink'} size={17}/>{mission.sensorConnected ? 'Ring connected' : 'Ring signal lost'}</span><span class="connection" class:offline={!mission.monitorConnected}><Icon name={mission.monitorConnected ? 'link' : 'unlink'} size={17}/>{mission.monitorConnected ? 'Medical link active' : 'Medical link offline'}</span><span class="device-storage"><Icon name="save" size={15}/>{!ready ? 'Loading device storage…' : storageError ? 'In-memory session' : 'Saved on this device'}</span></div>{/if}
      {#if storageError}<p class="storage-error" role="alert">{storageError}</p>{/if}

      {#if active === 'mission'}
        <div class="mission-workspace"><MissionTimeline {mission} bind:phase/><RingControl connected={ready && mission.sensorConnected} onCapture={capture}/></div>
        <VitalsBoard {mission} onSync={syncInstruments}/><MomentLog {mission} persistent={!storageError} bind:selected={selectedMoment} onAnnotate={annotate} onCapture={() => capture('screen')}/>{#if !mission.sensorConnected}<details class="manual-entry"><summary>Manual pulse or detailed symptom report</summary><Recovery {mission} onSave={save}/></details>{/if}
        <section class="transport" aria-label="Simulation controls"><div><h3>Connection lab</h3><p>Interrupt each connection independently.</p></div><div class="transport-buttons"><button class="button secondary" disabled={!ready} onclick={toggleSensor}><Icon name="pulse" size={16}/>{mission.sensorConnected ? 'Disconnect ring' : 'Reconnect ring'}</button><button class="button secondary" disabled={!ready} onclick={toggleMonitor}><Icon name={mission.monitorConnected ? 'unlink' : 'link'} size={16}/>{mission.monitorConnected ? 'Interrupt medical link' : 'Restore medical link'}</button></div><span class="pending" class:mint={!pending}>{pending} {pending === 1 ? 'entry' : 'entries'} pending</span></section>
        <button class="archive-banner" onclick={() => selectModule('apollo')}><div class="archive-orbit"><Icon name="orbit" size={35}/></div><div><strong>Before this simulation, there was Apollo 11.</strong><span>Explore Armstrong’s heart rate, task by task, using NASA’s mission report.</span></div><span class="archive-cta">Open the archive <Icon name="arrow" size={19}/></span></button>
        <details class="source-details"><summary><Icon name="book" size={17}/>NASA sources & data provenance</summary><div class="source-content"><p><strong>Apollo 11 Mission Report.</strong> Approximate digitized observations are available in the archive. They are kept separate from the simulated mission readings.</p><a href="https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf#page=268" target="_blank" rel="noreferrer">Figure 12-3(a) · heart rate during EVA</a><p><strong>Exercise on the ISS.</strong> NASA’s exercise overview reports medians of 135 bpm for mean heart rate and 26 minutes for CEVIS sessions. These group statistics provide context; they do not set personal health thresholds.</p><a href="https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/" target="_blank" rel="noreferrer">NASA exercise overview</a><p><strong>Suit telemetry.</strong> The EVA segment models a separate suit ECG source. Ring use and gesture recognition inside a pressurized EVA glove remain unvalidated. This demo models ring interaction in cabin.</p><a href="https://www.nasa.gov/wp-content/uploads/2023/07/suit_water_intrusion_mishap_investigation_report.pdf#page=39" target="_blank" rel="noreferrer">NASA EMU investigation report</a></div></details>
      {:else if active === 'apollo'}<ApolloExplorer onSimulate={() => selectModule('mission')}/>
      {:else}{#key active}<HealthJournal module={active} {mission} onSave={save}/>{/key}{/if}

      {#if showMonitor && active !== 'apollo'}<div id="medical-section"><MedicalMonitor {mission}/></div>{/if}
      <div class="notice" role="status">{active !== 'apollo' ? notice : ''}</div>
      <footer><span>{active === 'apollo' ? 'Approximate historical observations · NASA Apollo 11' : 'Demo data · Local simulation · Not a clinical assessment'}</span><button class="text-button" disabled={!ready} onclick={exportLog}>Export mission log <Icon name="arrow" size={14}/></button></footer>
    </main>
  </div>
</div>
