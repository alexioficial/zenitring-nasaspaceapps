<script lang="ts">
  import type { Sample, MetricKey } from '$lib/crew/types';
  import { metricInfo, clockLabel } from '$lib/crew/model';
  let {
    samples,
    metric = 'pulse',
    compact = false,
    intervalMs = 3000,
  }: { samples: Sample[]; metric?: MetricKey; compact?: boolean; intervalMs?: number } = $props();
  let points = $derived(samples.slice(-80));
  let low = $derived(points.length ? Math.min(...points.map((p) => p.values[metric])) - 2 : 0);
  let high = $derived(points.length ? Math.max(...points.map((p) => p.values[metric])) + 2 : 100);
  let start = $derived(points[0]?.measuredAt ?? 0);
  let duration = $derived(Math.max(30000, (points.at(-1)?.measuredAt ?? start) - start));
  const x = (t: number) => 20 + ((t - start) / duration) * 560;
  const y = (v: number) => 112 - ((v - low) / (high - low)) * 84;
  let path = $derived(
    points
      .map(
        (p, i) =>
          `${i === 0 || p.measuredAt - points[i - 1].measuredAt > Math.max(intervalMs * 2, 6000) ? 'M' : 'L'}${x(p.measuredAt)},${y(p.values[metric])}`,
      )
      .join(' '),
  );
</script>

<div class="crew-trend" class:compact>
  {#if !compact}<div class="trend-heading">
      <strong>{metricInfo[metric].label} <span>{metricInfo[metric].unit}</span></strong><span
        >Recent {Math.max(1, Math.round(duration / 60000))} min · measured time</span
      >
    </div>{/if}
  {#if points.length > 1}
    <svg
      viewBox="0 0 600 140"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${metricInfo[metric].label} trend in ${metricInfo[metric].unit}. ${points.length} simulated samples. Gaps indicate missing or expired samples.`}
    >
      {#if !compact}{#each [low, (low + high) / 2, high] as value}<line
            x1="20"
            x2="580"
            y1={y(value)}
            y2={y(value)}
            class="trend-grid"
          /><text x="22" y={y(value) - 5}>{value.toFixed(metricInfo[metric].digits)}</text
          >{/each}{/if}
      <path d={path} /><circle
        cx={x(points.at(-1)!.measuredAt)}
        cy={y(points.at(-1)!.values[metric])}
        r="3"
      />
    </svg>
    {#if !compact}<div class="trend-times">
        <span>{clockLabel(start, false)}</span><span
          >{clockLabel(points.at(-1)!.measuredAt, false)}</span
        >
      </div>{/if}
  {:else}<div class="trend-empty">
      {compact
        ? 'Awaiting trend'
        : 'A trend appears after the second signal. Gaps remain visible when transmission stops.'}
    </div>{/if}
</div>
