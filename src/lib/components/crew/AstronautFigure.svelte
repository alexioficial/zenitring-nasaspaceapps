<script lang="ts">
  import Icon from '../Icon.svelte';
  import { freshness } from '$lib/crew/model';
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
  <img
    src="/images/medbay-astronaut.webp"
    width="1024"
    height="1536"
    alt={decorative ? '' : 'Fictional astronaut in a white suit with a gold visor'}
    fetchpriority="high"
  />
  {#if member}
    <div class="medbay-source-tags" aria-label="Independent source connections">
      <!-- Simulators open in another tab so they keep transmitting while this view stays open. -->
      <a
        class="medbay-source-link"
        class:source-receiving={ringStatus === 'live'}
        href={`/ring?astronaut=${member.id}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Ring, ${statusText(ringStatus)}. Open my ring simulator in a new tab`}
      >
        <Icon name="ring" size={20} /><span
          ><strong
            >Ring<span class="source-open" aria-hidden="true"><Icon name="arrow" size={14} /></span
            ></strong
          ><small>{statusText(ringStatus)}</small></span
        >
      </a>
      <a
        class="medbay-source-link"
        class:source-receiving={suitStatus === 'live'}
        href={`/suit?astronaut=${member.id}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Suit, ${statusText(suitStatus)}. Open my suit simulator in a new tab`}
      >
        <Icon name="pulse" size={20} /><span
          ><strong
            >Suit<span class="source-open" aria-hidden="true"><Icon name="arrow" size={14} /></span
            ></strong
          ><small>{statusText(suitStatus)}</small></span
        >
      </a>
      <div class:source-receiving={online}>
        <Icon name="broadcast" size={20} /><span
          ><strong>Crew link</strong><small>{online ? 'Online' : 'Offline'}</small></span
        >
      </div>
    </div>
  {/if}
  <figcaption>{member ? `${member.name} · ` : ''}AI-generated concept illustration</figcaption>
</figure>
