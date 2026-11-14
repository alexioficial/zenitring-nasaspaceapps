<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from './Icon.svelte';
  import RingScene from './RingScene.svelte';
  let { connected, onCapture }: { connected: boolean; onCapture: (gesture: 'ring-double-tap' | 'ring-hold') => void } = $props();
  let holding = $state(false);
  let visualPulse = $state(0);
  let feedback = $state('Double tap to capture');
  let pressed = false;
  let held = false;
  let firstTap: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  function capture(gesture: 'ring-double-tap' | 'ring-hold') {
    if (!connected) return;
    firstTap = null;
    onCapture(gesture);
    visualPulse++;
    feedback = gesture === 'ring-hold' ? 'Captured · choose a symptom' : 'Moment captured';
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => feedback = 'Double tap to capture', 2400);
  }
  function down(event: PointerEvent) {
    if (!connected || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pressed = true; held = false; holding = true;
    clearTimeout(timer);
    timer = setTimeout(() => { if (!pressed || !connected) return; held = true; holding = false; capture('ring-hold'); }, 700);
  }
  function up() {
    clearTimeout(timer); holding = false;
    if (!pressed) return;
    pressed = false;
    if (held || !connected) return;
    const now = performance.now();
    if (firstTap !== null && now - firstTap < 400) capture('ring-double-tap');
    else firstTap = now;
  }
  function cancel() { clearTimeout(timer); pressed = false; holding = false; firstTap = null; }
  onDestroy(() => { clearTimeout(timer); clearTimeout(feedbackTimer); });
</script>
<aside class="panel ring-control" aria-labelledby="ring-title">
  <div class="ring-heading"><h2 id="ring-title">Capture now.<br/>Explain later.</h2><span class="tag">Ring concept</span></div>
  <button class="ring-touch" class:holding class:disconnected={!connected} disabled={!connected}
    aria-label="Ring gesture pad. Double tap to capture, hold to capture and log a symptom. Enter captures a moment."
    onpointerdown={down} onpointerup={up} onpointercancel={cancel}
    oncontextmenu={event => event.preventDefault()} onclick={event => { if (event.detail === 0) capture('ring-double-tap'); }}>
    <RingScene {connected} pressed={holding} pulse={visualPulse} compact/>
    <span>{connected ? feedback : 'Ring disconnected'}</span>
  </button>
  <div class="gesture-actions"><button class="button primary" disabled={!connected} onclick={() => capture('ring-double-tap')}><Icon name="save" size={16}/>Capture moment</button><button class="button secondary" disabled={!connected} onclick={() => capture('ring-hold')}><Icon name="heart" size={16}/>Capture & log symptom</button></div>
  <p class="gesture-hint">Double tap saves a snapshot.<br/>Hold for 0.7 s to add a symptom.</p>
  <p class="ring-scope">Simulated gestures · cabin use concept</p>
</aside>
