<script lang="ts">
  import '$lib/crew/explanation.css';
  let {
    title,
    unit,
    points,
    note,
  }: {
    title: string;
    unit: string;
    points: { label: string; value: number; detail: string }[];
    note: string;
  } = $props();
  let selected = $state<number | null>(null);
  const key = $derived(JSON.stringify(points));
  $effect(() => {
    void key;
    selected = null;
  });
  const low = $derived(Math.min(0, ...points.map((p) => p.value)));
  const high = $derived(Math.max(0, ...points.map((p) => p.value)));
  const span = $derived(high - low || 1);
  const zero = $derived((-low / span) * 100);
  const format = (n: number) => Number(n.toFixed(2)).toLocaleString('en-US');
</script>

<figure class="evidence-chart" aria-label={title}>
  <figcaption>{title} <span>{unit}</span></figcaption>
  <div class="evidence-axis" aria-hidden="true">
    <span>{format(low)}</span><span>{format(high)}</span>
  </div>
  <div class="evidence-bars">
    {#each points as point, i}
      <button
        type="button"
        class="evidence-bar"
        aria-pressed={selected === i}
        aria-label={`${point.label}: ${format(point.value)} ${unit}. ${point.detail}`}
        onclick={() => (selected = selected === i ? null : i)}
      >
        <span class="evidence-bar-label"
          ><span>{point.label}</span><strong>{format(point.value)} {unit}</strong></span
        >
        <span class="evidence-track" aria-hidden="true">
          <span class="evidence-zero" style:left={`${zero}%`}></span>
          <span
            class="evidence-fill"
            style:left={`${Math.min(zero, ((point.value - low) / span) * 100)}%`}
            style:width={`${(Math.abs(point.value) / span) * 100}%`}
          ></span>
        </span>
      </button>
    {/each}
  </div>
  <p class="evidence-chart-note" aria-live="polite">
    {selected !== null && points[selected] ? points[selected].detail : note}
  </p>
</figure>
