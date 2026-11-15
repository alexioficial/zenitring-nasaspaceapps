<script lang="ts">
  import { freshness, ageLabel } from '$lib/crew/model';
  import type { CrewMember } from '$lib/crew/types';
  let { member, online, now }: { member: CrewMember; online: boolean; now: number } = $props();
  let suit = $derived(member.suit);
  let status = $derived(
    online ? freshness(suit.connected, suit.latest?.receivedAt ?? null, 3000, now) : 'offline',
  );
</script>

{#if suit.deviceId || suit.latest}
  <span
    class="manifest-suit"
    class:suit-live={status === 'live'}
    aria-label={`${member.name} EVA suit signal`}
  >
    <span class="manifest-suit-state"
      ><strong>EVA suit</strong><span
        ><span class="status-dot"></span>{status === 'live'
          ? 'Receiving'
          : status === 'waiting'
            ? 'Connected · awaiting sample'
            : status === 'stale'
              ? 'Signal stale'
              : 'Offline'}</span
      ></span
    >
    <span class="manifest-suit-reading"
      ><strong>{suit.latest ? Math.round(suit.latest.values.pulse) : '—'} <small>bpm</small></strong
      ><span>Suit ECG{status !== 'live' && suit.latest ? ' · last known' : ''}</span></span
    >
    <span class="manifest-suit-reading"
      ><strong
        >{suit.latest ? suit.latest.values.pressure.toFixed(2) : '—'} <small>kPa</small></strong
      ><span>Suit pressure{status !== 'live' && suit.latest ? ' · last known' : ''}</span></span
    >
    <span class="manifest-suit-time"
      >{suit.latest
        ? `Received ${ageLabel(suit.latest.receivedAt, now)}`
        : 'No suit measurement yet'}<small>Separate source · open details</small></span
    >
  </span>
{/if}

<style>
  .manifest-suit {
    grid-column: 1/-1;
    grid-row: auto;
    display: grid;
    grid-template-columns: minmax(160px, 1.2fr) 1fr 1fr minmax(130px, 1fr);
    align-items: center;
    gap: 12px 20px;
    border-top: 1px solid #dce4e2;
    padding-top: 16px;
    color: #526772;
  }
  .manifest-suit-state {
    display: grid;
    gap: 7px;
    font-size: 11px;
  }
  .manifest-suit-state > strong {
    font-size: 12px;
    color: #102332;
  }
  .manifest-suit-state .status-dot {
    margin-right: 5px;
  }
  .suit-live .manifest-suit-state > span {
    color: #28654f;
  }
  .manifest-suit-reading {
    display: grid;
    gap: 5px;
    font-size: 10px;
  }
  .manifest-suit-reading > strong {
    font:
      20px ui-monospace,
      Consolas,
      monospace;
  }
  .suit-live .manifest-suit-reading > strong {
    color: #102332;
  }
  .manifest-suit-reading small {
    font:
      10px 'Segoe UI',
      sans-serif;
  }
  .manifest-suit-time {
    display: grid;
    gap: 5px;
    font-size: 11px;
  }
  .manifest-suit-time small {
    font-size: 10px;
  }
  @media (max-width: 1100px) {
    .manifest-suit {
      grid-template-columns: 1fr 1fr;
    }
    .manifest-suit-time {
      grid-column: 2;
      grid-row: 2;
    }
  }
  @media (max-width: 720px) {
    .manifest-suit {
      grid-column: 1/-1;
      grid-row: 3;
      gap: 15px;
    }
    .manifest-suit-reading > strong {
      font-size: 19px;
    }
  }
</style>
