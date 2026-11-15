<script lang="ts">
  import { phases, timestamp, type Mission } from '$lib/mission';
  import Icon from './Icon.svelte';
  let { mission, phase = $bindable(2) }: { mission: Mission; phase?: number } = $props();
  const width = 900;
  let end = $derived(Math.max(1980, mission.clock + 60));
  const y = (pulse: number) => 215 - ((pulse - 60) / 60) * 170;
  const x = (time: number) => (time / end) * width;
  let reading = $derived(
    phase === 2
      ? mission.latest
      : {
          time: phases[phase].points.at(-1)![0],
          pulse: phases[phase].points.at(-1)![1],
          source: phases[phase].source,
        },
  );
  let hasReading = $derived(phase !== 2 || mission.sensorConnected);
  function line(points: readonly (readonly number[])[], gaps = false) {
    return points
      .map(
        ([time, pulse], i) =>
          `${i === 0 || (gaps && time > 1800 && time - points[i - 1][0] > 2) ? 'M' : 'L'}${x(time).toFixed(2)},${y(pulse).toFixed(2)}`,
      )
      .join(' ');
  }
  let returnPoints = $derived([
    ...phases[2].points,
    ...mission.samples.map((p) => [p.time, p.pulse]),
  ]);
</script>

<section class="timeline panel" aria-labelledby="timeline-title">
  <div class="panel-heading">
    <div>
      <h2 id="timeline-title">Your health, in context</h2>
      <p>Heart rate across your mission</p>
    </div>
  </div>
  <div class="reading-strip">
    <div class="current-reading" class:violet={phase === 1}>
      <Icon name="pulse" size={25} /><strong data-testid="local-pulse"
        >{hasReading ? reading.pulse : '—'}</strong
      ><span>bpm</span>
    </div>
    <div class="reading-meta">
      <strong>{hasReading ? reading.source : `Last: ${reading.pulse} bpm`}</strong><span
        data-testid="local-time"
        >{timestamp(reading.time)} UTC{!hasReading ? ' · last sample' : ''}</span
      >
    </div>
    <span class="phase-state">{phase === 2 ? 'Recovery monitoring' : 'Mission record'}</span>
  </div>
  <div class="plot-layout">
    <div class="phase-track" style:grid-template-columns={`600fr 780fr ${end - 1380}fr`}>
      {#each phases as item, i}
        <button
          class="phase"
          class:selected={phase === i}
          aria-pressed={phase === i}
          onclick={() => (phase = i)}
        >
          <span class="phase-top"
            ><span class="time">{timestamp(item.start, true)}</span>{#if i === 2}<span class="now"
                >Now</span
              >{/if}</span
          >
          <strong>{item.name}</strong><small class:violet={i === 1}
            ><span class="source-line"></span>{item.source}</small
          >
        </button>
      {/each}
    </div>
    <div class="plot">
      <div class="y-labels" aria-hidden="true">
        <span>120</span><span>100</span><span>80</span><span>60</span>
      </div>
      <svg
        class="mission-chart"
        viewBox="0 0 900 250"
        preserveAspectRatio="none"
        role="img"
        aria-label="Pulse through preparation, spacewalk and return. Gaps show missing samples. Ring and suit ECG use separate colors."
      >
        <rect
          x={x(phases[phase].start)}
          y="15"
          width={x(phase === 2 ? end - 1380 : phases[phase].end - phases[phase].start)}
          height="200"
          fill="var(--selected)"
        />
        {#each [60, 80, 100, 120] as pulse}<line
            x1="0"
            y1={y(pulse)}
            x2="900"
            y2={y(pulse)}
            class="grid-line"
          />{/each}
        {#each [600, 1380] as time}<line
            x1={x(time)}
            y1="0"
            x2={x(time)}
            y2="215"
            class="boundary"
          />{/each}
        <path d={line(phases[0].points)} class="trace cabin" />
        <path d={line(phases[1].points)} class="trace suit" />
        <path d={line(returnPoints, true)} class="trace cabin" />
        <line x1={x(reading.time)} y1="15" x2={x(reading.time)} y2="215" class="cursor" />
        {#each mission.entries.filter((e) => e.kind === 'moment') as moment (moment.id)}<circle
            cx={x(moment.time)}
            cy={y(moment.reading.pulse)}
            r="5"
            fill="var(--amber)"
            ><title>Captured moment at {timestamp(moment.time)} UTC</title></circle
          >{/each}
        <circle
          cx={x(reading.time)}
          cy={y(reading.pulse)}
          r="5"
          fill={phase === 1 ? 'var(--violet)' : 'var(--mint)'}
        />
      </svg>
      <div class="x-labels" aria-hidden="true">
        <span>09:00</span><span>{timestamp(end / 2, true)} UTC</span><span
          >{timestamp(end, true)}</span
        >
      </div>
    </div>
  </div>
  <p class="chart-context">
    <Icon name="pulse" size={16} />{hasReading
      ? phases[phase].note
      : 'The ring stopped transmitting. You can log symptoms and add a manual measurement.'}
  </p>
  <div class="chart-foot">
    <span>Gaps: missing readings · Amber: captured moment</span><span
      >Simulation · 1 sample / 2 s</span
    >
  </div>
</section>
