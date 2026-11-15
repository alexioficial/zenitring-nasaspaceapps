<script lang="ts">
  import Icon from '../Icon.svelte';
  import { freshness } from '$lib/crew/model';
  import { activeSource } from '$lib/crew/suit';
  import type { CrewMember } from '$lib/crew/types';
  let {
    member,
    online,
    now,
    ondevices,
  }: { member: CrewMember; online: boolean; now: number; ondevices?: () => void } = $props();
  let source = $derived(activeSource(member));
  const label = (state: string, linked: boolean) =>
    state === 'live'
      ? 'Receiving'
      : state === 'waiting'
        ? 'Waiting'
        : state === 'stale'
          ? 'Stale'
          : !online
            ? 'No signal'
            : linked
              ? 'Offline'
              : 'Not linked';
  let ring = $derived(
    online
      ? freshness(
          member.connected,
          member.latest?.receivedAt ?? null,
          member.config.intervalMs,
          now,
        )
      : 'offline',
  );
  let suit = $derived(
    online
      ? freshness(member.suit.connected, member.suit.latest?.receivedAt ?? null, 3000, now)
      : 'offline',
  );
  // Only the source that matters for this phase is a shortcut, and only until it receives.
  let chips = $derived([
    {
      name: 'Ring',
      live: ring === 'live',
      text: label(ring, !!member.deviceId),
      shortcut: source.type === 'ring' && ring !== 'live',
    },
    {
      name: 'Suit',
      live: suit === 'live',
      text: label(suit, !!member.suit.deviceId),
      shortcut: source.type === 'spacesuit' && suit !== 'live',
    },
    { name: 'Crew link', live: online, text: online ? 'Online' : 'Offline', shortcut: false },
  ]);
</script>

<section class="mission-context" aria-label="Mission context and independent source reception">
  <div class="mission-context-phase">
    <Icon
      name={member.phase === 'spacewalk'
        ? 'activity'
        : member.phase === 'recovery'
          ? 'bed'
          : 'cabin'}
      size={24}
    />
    <div>
      <strong
        >{member.phase === 'spacewalk'
          ? 'Spacewalk'
          : member.phase === 'recovery'
            ? 'Recovery'
            : 'Cabin'}</strong
      ><span>{source.label} is primary</span>
    </div>
  </div>
  <div class="source-status-bar">
    {#each chips as chip (chip.name)}
      {#if chip.shortcut && ondevices}
        <button
          type="button"
          class="source-shortcut"
          aria-label={`${chip.name}: ${chip.text}. Go to Devices`}
          onclick={ondevices}
        >
          <strong>{chip.name}</strong><span><i aria-hidden="true"></i>{chip.text}</span>
        </button>
      {:else}
        <div class:is-receiving={chip.live} aria-label={`${chip.name}: ${chip.text}`}>
          <strong>{chip.name}</strong><span><i aria-hidden="true"></i>{chip.text}</span>
        </div>
      {/if}
    {/each}
  </div>
</section>
