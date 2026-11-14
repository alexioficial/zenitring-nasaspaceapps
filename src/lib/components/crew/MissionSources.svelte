<script lang="ts">
  import { activeSource, phases, suitInfo, suitKeys } from '$lib/crew/suit';
  import { freshness, ageLabel, clockLabel, newId } from '$lib/crew/model';
  import type { CrewMember, ClientMessage, Phase } from '$lib/crew/types';
  let {
    member,
    online,
    now,
    send,
  }: {
    member: CrewMember;
    online: boolean;
    now: number;
    send: (m: ClientMessage & { id: string }) => Promise<boolean>;
  } = $props();
  let saving = $state(false);
  let error = $state('');
  let source = $derived(activeSource(member));
  let status = $derived(
    online
      ? freshness(source.connected, source.latest?.receivedAt ?? null, source.intervalMs, now)
      : 'offline',
  );
  let suitStatus = $derived(
    online
      ? freshness(member.suit.connected, member.suit.latest?.receivedAt ?? null, 3000, now)
      : 'offline',
  );
  const phaseAt = (t: number): Phase =>
    member.phaseHistory.findLast((p) => p.changedAt <= t)?.phase ?? 'cabin';
  let points = $derived(
    [
      ...member.samples
        .filter((s) => phaseAt(s.measuredAt) !== 'spacewalk')
        .map((s) => ({ ...s, source: 'ring', interval: member.config.intervalMs })),
      ...member.suit.samples
        .filter((s) => phaseAt(s.measuredAt) === 'spacewalk')
        .map((s) => ({ ...s, source: 'spacesuit', interval: 3000 })),
    ]
      .sort((a, b) => a.measuredAt - b.measuredAt)
      .slice(-160),
  );
  let start = $derived(Math.min(points[0]?.measuredAt ?? now, now - 60000));
  let duration = $derived(Math.max(60000, now - start));
  let low = $derived(Math.min(60, ...points.map((p) => p.values.pulse)) - 5);
  let high = $derived(Math.max(110, ...points.map((p) => p.values.pulse)) + 5);
  const x = (t: number) => 20 + ((t - start) / duration) * 560;
  const y = (v: number) => 130 - ((v - low) / (high - low)) * 95;
  const pathFor = (sourceType: string) =>
    points
      .map((p, i) => {
        if (p.source !== sourceType) return '';
        const prev = points[i - 1];
        const split =
          !prev ||
          prev.source !== p.source ||
          prev.deviceId !== p.deviceId ||
          p.measuredAt - prev.measuredAt > Math.max(6000, p.interval * 2) ||
          member.phaseHistory.some(
            (h) => h.changedAt > prev.measuredAt && h.changedAt <= p.measuredAt,
          );
        return `${split ? 'M' : 'L'}${x(p.measuredAt)},${y(p.values.pulse)}`;
      })
      .join(' ');
  async function change(phase: Phase) {
    saving = true;
    error = '';
    const ok = await send({ type: 'phase', id: newId(), astronautId: member.id, phase });
    saving = false;
    if (!ok) error = 'Phase change not confirmed. Reconnect and retry.';
  }
</script>

<section class="mission-sources" aria-label="Mission phases and sources">
  <div class="source-heading">
    <div>
      <span class="crew-eyebrow">{member.callsign} / ONE CONTINUOUS HISTORY</span>
      <h2>Follow the astronaut.</h2>
    </div>
    <span class="source-tag">SIMULATED SIGNALS</span>
  </div>
  <nav class="phase-track" aria-label="Mission phase">
    {#each phases as phase, i}<button
        class:phase-active={member.phase === phase.id}
        aria-pressed={member.phase === phase.id}
        disabled={!online || saving}
        onclick={() => change(phase.id)}
        ><span>0{i + 1} {member.phase === phase.id ? '· NOW' : ''}</span><strong
          >{phase.label}</strong
        ><small>{phase.source}</small></button
      >{/each}
  </nav>
  <div class="source-primary">
    <div>
      <span class="crew-eyebrow">PRIMARY SOURCE / {source.label.toUpperCase()}</span><strong
        >{source.latest ? Math.round(source.latest.values.pulse) : '—'} <small>bpm</small></strong
      >
    </div>
    <div>
      <span class="source-link" class:source-unavailable={status !== 'live'}
        ><span class="status-dot"></span>{status === 'live'
          ? 'Receiving current signals'
          : status === 'waiting'
            ? 'Waiting for a measurement'
            : 'No current primary signal'}</span
      >
      <p>
        {source.latest
          ? `Last received ${ageLabel(source.latest.receivedAt, now)}`
          : 'No sample received from this source.'}
      </p>
      <a
        href={`/${source.type === 'spacesuit' ? 'suit' : 'ring'}?astronaut=${member.id}`}
        target="_blank"
        rel="noreferrer"
        >Open {source.type === 'spacesuit' ? 'suit simulator' : 'ring simulator'} ↗</a
      >
    </div>
  </div>
  {#if status !== 'live'}<p class="source-explanation">
      {source.latest
        ? `Last known ${source.label} reading, measured ${clockLabel(source.latest.measuredAt)}.`
        : 'Missing values remain empty.'} A different device does not fill this gap.
    </p>{/if}
  <div class="source-chart-heading">
    <strong>Heart rate across mission phases <small>bpm</small></strong><span
      ><i class="ring-key"></i>Ring <i class="suit-key"></i>Suit ECG</span
    >
  </div>
  <svg
    class="source-timeline-chart"
    viewBox="0 0 600 160"
    role="img"
    aria-label="Heart rate over measured time, colored by source. Phase changes and missing samples break the line."
  >
    {#each [low, (low + high) / 2, high] as value}<line
        class="chart-grid"
        x1="20"
        x2="580"
        y1={y(value)}
        y2={y(value)}
      /><text x="23" y={y(value) - 4}>{Math.round(value)}</text>{/each}
    {#each member.phaseHistory
      .filter((h) => h.changedAt >= start && h.changedAt <= now)
      .slice(-3) as change}<line
        class="phase-marker"
        x1={x(change.changedAt)}
        x2={x(change.changedAt)}
        y1="25"
        y2="140"
      /><text
        text-anchor={x(change.changedAt) > 450 ? 'end' : 'start'}
        x={x(change.changedAt)}
        y="16">{phases.find((p) => p.id === change.phase)?.label}</text
      >{/each}
    <path class="ring-line" d={pathFor('ring')} /><path
      class="suit-line"
      d={pathFor('spacesuit')}
    />
    {#each points as p}<circle
        class:point-suit={p.source === 'spacesuit'}
        cx={x(p.measuredAt)}
        cy={y(p.values.pulse)}
        r="2"
      />{/each}
  </svg>
  <div class="source-meta">
    <span>{clockLabel(start)}</span><span>Measured time · {clockLabel(now)}</span>
  </div>
  {#if !points.length}<p class="source-explanation">
      Link a simulator to start the history. Changing phases does not generate measurements.
    </p>{/if}
  <div class="source-connections">
    {#each [{ type: 'ring', label: 'Cabin ring', state: member, interval: member.config.intervalMs }, { type: 'spacesuit', label: 'EVA suit', state: member.suit, interval: 3000 }] as device}{@const deviceStatus =
        online
          ? freshness(
              device.state.connected,
              device.state.latest?.receivedAt ?? null,
              device.interval,
              now,
            )
          : 'offline'}
      <div>
        <strong>{device.label}</strong><span
          >{deviceStatus} · {device.state.deviceId?.slice(0, 8) ?? 'not linked'}</span
        ><small>Last reception: {ageLabel(device.state.latest?.receivedAt ?? null, now)}</small>
      </div>{/each}
  </div>
  {#if member.phase === 'spacewalk' || member.suit.deviceId || member.suit.latest}
    <section class="suit-environment" aria-label="Suit environment">
      <h3>Suit telemetry</h3>
      <p>
        {suitStatus === 'live'
          ? 'Receiving current suit signals'
          : suitStatus === 'waiting'
            ? 'Suit connected · waiting for a measurement'
            : suitStatus === 'stale'
              ? 'Suit signal stale · last known values'
              : 'Suit offline · last known / unavailable values'} · {ageLabel(
          member.suit.latest?.receivedAt ?? null,
          now,
        )}
      </p>
      <p>Suit ECG, atmosphere and equipment. These readings stay separate from the ring.</p>
      <div class="source-metrics">
        {#each suitKeys as key}<div title={suitInfo[key].description}>
            <span>{suitInfo[key].label}</span><strong
              >{member.suit.latest?.values[key].toFixed(suitInfo[key].digits) ?? '—'}
              <small>{suitInfo[key].unit}</small></strong
            >
          </div>{/each}
      </div>
      <p class="snapshot-caption">
        {suitStatus === 'live'
          ? 'Simulated measurements'
          : 'Last known / unavailable measurements'}. O₂ partial pressure is not SpO₂. No suit HRV
        or blood-oxygen measurement is supplied.
      </p>
    </section>
  {/if}
  <details class="crew-disclosure">
    <summary>Source provenance & phase history</summary>
    <div>
      <p>
        NASA-STD-3001 §11.3 informs pressure, ppO₂ and ppCO₂ selection. These numbers are fictional,
        not certified operating limits. <a
          href="https://www.nasa.gov/reference/11-0-spacesuits-vol-2/"
          target="_blank"
          rel="noreferrer">NASA reference ↗</a
        >
      </p>
      <p>
        Ring use is a cabin concept; compatibility with a pressurized glove is not assumed. Suit
        life support remains outside ZENIT.
      </p>
      {#each member.phaseHistory.slice(-12) as change}<p>
          {phases.find((p) => p.id === change.phase)?.label} · {new Date(
            change.changedAt,
          ).toISOString()}
        </p>{/each}
    </div>
  </details>
  {#if error}<p class="crew-error" role="alert">{error}</p>{/if}
</section>
