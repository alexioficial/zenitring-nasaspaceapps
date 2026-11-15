<script lang="ts">
  import Icon from '../Icon.svelte';
  import { freshness } from '$lib/crew/model';
  import { activeSource } from '$lib/crew/suit';
  import type { CrewMember } from '$lib/crew/types';
  let {
    member,
    online = false,
    now = 0,
    decorative = false,
  }: {
    member?: CrewMember;
    online?: boolean;
    now?: number;
    decorative?: boolean;
  } = $props();
  let ringStatus = $derived(
    member && online
      ? freshness(
          member.connected,
          member.latest?.receivedAt ?? null,
          member.config.intervalMs,
          now,
        )
      : 'offline',
  );
  let suitStatus = $derived(
    member && online
      ? freshness(member.suit.connected, member.suit.latest?.receivedAt ?? null, 3000, now)
      : 'offline',
  );
  const statusText = (status: string) =>
    status === 'live'
      ? 'Receiving'
      : status === 'waiting'
        ? 'Awaiting readings'
        : status === 'stale'
          ? 'Stale readings'
          : 'No current signal';
</script>

<figure class="medbay-figure" class:medbay-decorative={decorative}>
  {#if member}<div class="medbay-mobile-mission">
      <h2>Your mission, at a glance</h2>
      <p>
        {member.phase === 'spacewalk'
          ? 'Spacewalk'
          : member.phase === 'recovery'
            ? 'Recovery'
            : 'Cabin'} · {activeSource(member).label} is primary
      </p>
      <span class:mission-offline={!online}
        ><span class="status-dot"></span>Crew link {online ? 'online' : 'offline'}</span
      >
    </div>{/if}
  <img
    src="/images/medbay-astronaut.webp"
    width="1024"
    height="1536"
    alt={decorative ? '' : 'Fictional astronaut in a white suit with a gold visor'}
    fetchpriority="high"
  />
  {#if member}
    <div class="medbay-source-tags" aria-label="Independent source connections">
      <div class:source-receiving={ringStatus === 'live'}>
        <Icon name="ring" size={20} /><span
          ><strong>Ring</strong><small>{statusText(ringStatus)}</small></span
        >
      </div>
      <div class:source-receiving={suitStatus === 'live'}>
        <Icon name="pulse" size={20} /><span
          ><strong>Suit</strong><small>{statusText(suitStatus)}</small></span
        >
      </div>
      <div class:source-receiving={online}>
        <Icon name="broadcast" size={20} /><span
          ><strong>Crew link</strong><small>{online ? 'Online' : 'Offline'}</small></span
        >
      </div>
    </div>
  {/if}
  <figcaption>{member ? `${member.callsign} · ` : ''}Concept illustration</figcaption>
</figure>
