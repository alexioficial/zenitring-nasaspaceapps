<script lang="ts">
  import { bundledRadiation, radlabDocs, type RadiationSeries } from '$lib/nasa/radlab';
  let series = $state<RadiationSeries>(bundledRadiation());
  let index = $state(0);
  let busy = $state(false);
  let message = $state('');
  let point = $derived(series.points[index]);
  let maximum = $derived(Math.max(1, ...series.points.map((p) => p.absorbedDoseRate ?? 0)));
  const time = (stamp: string) => Date.parse(stamp + 'Z');
  let start = $derived(time(series.points[0].timestamp));
  let duration = $derived(Math.max(1, time(series.points.at(-1)!.timestamp) - start));
  const x = (stamp: string) => 10 + ((time(stamp) - start) / duration) * 580;
  const y = (v: number) => 110 - (v / maximum) * 90;
  let path = $derived(
    series.points
      .map((p, i) =>
        p.absorbedDoseRate === null
          ? ''
          : `${i === 0 || series.points[i - 1].absorbedDoseRate === null || time(p.timestamp) - time(series.points[i - 1].timestamp) > 300000 ? 'M' : 'L'}${x(p.timestamp)},${y(p.absorbedDoseRate)}`,
      )
      .join(' '),
  );
  async function refresh() {
    busy = true;
    message = '';
    try {
      const response = await fetch('/api/radlab', { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw Error();
      series = await response.json();
      index = Math.min(index, series.points.length - 1);
    } catch {
      message = 'Refresh unavailable. The saved historical series remains visible.';
    } finally {
      busy = false;
    }
  }
</script>

<section class="radiation-context" aria-labelledby="radiation-title">
  <div class="source-heading">
    <div>
      <span class="crew-eyebrow">NASA OSDR / RADLAB</span>
      <h2 id="radiation-title">The environment around the crew</h2>
    </div>
    <span class="source-tag historical">HISTORICAL DATA</span>
  </div>
  <p>Actual instrument observations, kept separate from this mission’s simulated health signals.</p>
  <div class="radiation-layout">
    <div>
      <div class="radiation-value">
        <strong>{point.absorbedDoseRate?.toFixed(2) ?? '—'}</strong><span
          >μGy/h<br />absorbed dose rate</span
        >
      </div>
      <p><strong>{point.instrument}</strong> · {point.spacecraft} / {point.module}</p>
      <time>{point.timestamp.replace('T', ' ')} · source time</time>
    </div>
    <div>
      <svg
        class="radiation-chart"
        viewBox="0 0 600 130"
        role="img"
        aria-label={`${series.points.length} historical DosTel1 absorbed dose rate readings in microgray per hour. Gaps longer than five minutes remain blank.`}
        ><line x1="10" x2="590" y1="110" y2="110" /><path d={path} /><line
          class="radiation-cursor"
          x1={x(point.timestamp)}
          x2={x(point.timestamp)}
          y1="10"
          y2="115"
        />{#if point.absorbedDoseRate !== null}<circle
            cx={x(point.timestamp)}
            cy={y(point.absorbedDoseRate)}
            r="4"
          />{/if}</svg
      ><label class="radiation-slider"
        >Explore the historical record<input
          aria-label="Historical radiation observation"
          type="range"
          min="0"
          max={series.points.length - 1}
          step="1"
          bind:value={index}
        /></label
      >
      <div class="source-meta">
        <span>01 Apr 2022 · 23:00</span><span>02 Apr 2022 · 01:05 (exclusive)</span>
      </div>
    </div>
  </div>
  <p class="source-explanation">
    This detector was inside Columbus. Its readings are not the astronaut’s personal dose or a
    measurement outside a suit. They cannot explain a symptom by themselves. Dose equivalent: {point.doseEquivalentRate ===
    null
      ? 'not available in this record'
      : `${point.doseEquivalentRate} μSv/h`}.
  </p>
  <div class="source-buttons">
    <button class="crew-button secondary" disabled={busy} onclick={refresh}
      >{busy ? 'Contacting NASA…' : 'Refresh NASA record'}</button
    ><a href={series.queryUrl} target="_blank" rel="noreferrer">Original API query ↗</a><a
      href={radlabDocs}
      target="_blank"
      rel="noreferrer">API documentation ↗</a
    >
  </div>
  <p class="source-meta" role="status">
    {message || series.message} · Retrieved {series.retrievedAt.slice(0, 10)} · {series.points
      .length} observations
  </p>
  <details class="crew-disclosure">
    <summary>How ZENIT uses NASA resources</summary>
    <div>
      <p>
        <strong>Suit measurements:</strong>
        <a
          href="https://www.nasa.gov/reference/11-0-spacesuits-vol-2/"
          target="_blank"
          rel="noreferrer">NASA-STD-3001 §11.3</a
        > informs the choice of pressure, ppO₂ and ppCO₂. Our suit readings are fictional; no certified
        limits are inferred.
      </p>
      <p>
        <strong>Radiation:</strong> this RadLab series supplies real historical environmental context.
        Missing values remain missing; μGy/h is not converted to μSv/h or a personal exposure score.
      </p>
      <p>
        <strong>Apollo 11:</strong> <a href="/archive">explore the separate mission archive</a> of approximate
        digitized heart-rate observations and activity context.
      </p>
      <p>
        <strong>Human health:</strong>
        <a href="https://www.nasa.gov/hrp/risks/" target="_blank" rel="noreferrer"
          >NASA’s human spaceflight risks</a
        > provide research context for the broader health concept.
      </p>
    </div>
  </details>
</section>
