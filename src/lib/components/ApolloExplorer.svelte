<script lang="ts">
  import { onMount } from 'svelte';
  import { apolloPoints, apolloActivities, apolloSource, missionTime } from '$lib/apollo';
  import Icon from './Icon.svelte';
  let { onSimulate }: { onSimulate: () => void } = $props();
  let cursor = $state(40);
  let playing = $state(false);
  let point = $derived(apolloPoints[cursor]);
  let activity = $derived(
    [...apolloActivities].reverse().find(([minute]) => minute <= point[0])![1],
  );
  const x = (minute: number) => 40 + (minute / 160) * 820;
  const y = (pulse: number) => 260 - ((pulse - 80) / 80) * 225;
  const path = apolloPoints.map(([m, p], i) => `${i ? 'L' : 'M'}${x(m)},${y(p)}`).join(' ');
  onMount(() => {
    const timer = setInterval(() => {
      if (!playing) return;
      if (cursor === apolloPoints.length - 1) playing = false;
      else cursor += 1;
    }, 500);
    return () => clearInterval(timer);
  });
  function toggle() {
    if (!playing && cursor === apolloPoints.length - 1) cursor = 0;
    playing = !playing;
  }
</script>

<section class="archive-intro">
  <div>
    <h2>A pulse. A task. A story.</h2>
    <p>Explore the first moonwalk through Neil Armstrong’s heart rate.</p>
  </div>
  <a class="button secondary" href={apolloSource} target="_blank" rel="noreferrer"
    >Open NASA report <Icon name="arrow" size={16} /></a
  >
</section>
<div class="archive-workspace">
  <section class="panel archive-plot" aria-label="Apollo 11 data explorer">
    <div class="panel-heading">
      <h3>Apollo 11 · 20 July 1969</h3>
      <span class="tag violet">NASA historical archive</span>
    </div>
    <svg
      viewBox="0 0 900 300"
      role="img"
      aria-label="42 approximate digitized points of Armstrong’s pulse. Use the time control to read each point and its activity."
    >
      {#each [80, 100, 120, 140, 160] as tick}
        <line x1="40" x2="860" y1={y(tick)} y2={y(tick)} class="grid-line" />
        <text x="29" y={y(tick) + 4} text-anchor="end">{tick}</text>
      {/each}
      {#each [0, 40, 80, 120, 160] as tick}<text x={x(tick)} y="288" text-anchor="middle"
          >{missionTime(tick)}</text
        >{/each}
      <path d={path} class="trace suit" />
      <line x1={x(point[0])} x2={x(point[0])} y1="22" y2="260" class="cursor" />
      <circle cx={x(point[0])} cy={y(point[1])} r="6" fill="var(--violet)" />
    </svg>
    <div class="archive-controls">
      <button class="button secondary" onclick={toggle}
        ><Icon name={playing ? 'pause' : 'play'} size={16} />{playing ? 'Pause' : 'Play'}</button
      >
      <div>
        <label for="archive-time">Mission elapsed time · {missionTime(point[0])}</label><input
          id="archive-time"
          type="range"
          min="0"
          max={apolloPoints.length - 1}
          bind:value={cursor}
          oninput={() => (playing = false)}
          aria-valuetext={`${missionTime(point[0])}, approximately ${point[1]} beats per minute`}
        />
      </div>
    </div>
  </section>
  <aside class="archive-context">
    <span class="time violet">{missionTime(point[0])} · MISSION ELAPSED TIME</span>
    <h3>{activity}</h3>
    <div class="archive-reading">≈ {point[1]} <span>bpm</span></div>
    <p>
      {point[0] >= 150
        ? 'This rise coincides with transferring sample containers to the lunar module.'
        : 'Activity gives the reading context. Explore the curve to see how it changes through the mission.'}
    </p>
    <p class="muted">
      A historical observation does not determine another astronaut’s health status.
    </p>
    <button class="button primary" onclick={onSimulate}
      >Explore the simulated mission <Icon name="arrow" size={16} /></button
    >
  </aside>
</div>
<div class="provenance">
  <Icon name="book" />
  <p>
    <strong>Visible provenance.</strong> 42 approximate points digitized from figure 12-3(a) in the Apollo
    11 Mission Report, PDF page 268. Activities from table 12-II, page 265. Transcription carried over
    from the earlier prototype; these are not raw telemetry or clinical thresholds.
  </p>
</div>
