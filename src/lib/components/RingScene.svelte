<script lang="ts">
  import { onMount } from 'svelte';
  import type { createRingScene } from '$lib/three/ring-scene';
  let {
    connected = true,
    pressed = false,
    pulse = 0,
    emergency = false,
    compact = false,
  }: {
    connected?: boolean;
    pressed?: boolean;
    pulse?: number;
    emergency?: boolean;
    compact?: boolean;
  } = $props();
  let host: HTMLSpanElement;
  let loaded = $state(false);
  let failed = $state(false);
  let scene: ReturnType<typeof createRingScene> | undefined;
  $effect(() => {
    scene?.update({ connected, pressed, pulse, emergency });
  });
  onMount(() => {
    let cancelled = false;
    import('$lib/three/ring-scene')
      .then(({ createRingScene }) => {
        if (cancelled) return;
        scene = createRingScene(host, () => {
          loaded = false;
          failed = true;
        });
        scene.update({ connected, pressed, pulse, emergency });
        loaded = true;
      })
      .catch(() => {
        if (!cancelled) failed = true;
      });
    return () => {
      cancelled = true;
      scene?.dispose();
      scene = undefined;
    };
  });
</script>

<span
  class="ring-visual"
  class:compact
  data-renderer={loaded ? 'threejs' : 'fallback'}
  aria-hidden="true"
>
  <span class="ring-shadow"></span>
  <span class="canvas-host" bind:this={host}></span>
  {#if !loaded}<span class="fallback-band"></span>{/if}
  <span class="visual-label">{failed ? 'RING CONCEPT · 2D VIEW' : 'RING CONCEPT · 3D VIEW'}</span>
</span>

<style>
  .ring-visual {
    position: relative;
    display: block;
    width: 100%;
    max-width: 390px;
    height: 260px;
    pointer-events: none;
    overflow: hidden;
  }
  .canvas-host {
    display: block;
    position: absolute;
    inset: 0;
  }
  .canvas-host :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }
  .ring-shadow {
    position: absolute;
    width: 41%;
    height: 14px;
    bottom: 27px;
    left: 29.5%;
    border-radius: 50%;
    background: #030c16;
    filter: blur(12px);
    opacity: 0.6;
  }
  .visual-label {
    position: absolute;
    bottom: 7px;
    left: 0;
    width: 100%;
    text-align: center;
    font:
      8px ui-monospace,
      monospace;
    letter-spacing: 0.13em;
    color: #a3babf;
  }
  .fallback-band {
    position: absolute;
    width: 130px;
    height: 130px;
    left: calc(50% - 65px);
    top: calc(50% - 70px);
    border: 19px solid #a8b8c2;
    border-radius: 50%;
    transform: rotate(-25deg) scaleY(0.8);
    box-shadow:
      inset 4px 7px 0 #243d47,
      0 7px 0 #58717c;
  }
  .compact {
    height: 180px;
    max-width: 220px;
  }
  .compact .visual-label {
    display: none;
  }
  @media (max-width: 760px) {
    .compact {
      height: 140px;
    }
  }
</style>
