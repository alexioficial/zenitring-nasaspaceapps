<script lang="ts">
  import LearningExplanation from './LearningExplanation.svelte';
  import { riskContext, spaceRisks, nasaRisksUrl } from '$lib/crew/health-learning';
  import type { CrewMember } from '$lib/crew/types';
  import '$lib/crew/learning.css';
  let { member, online, now }: { member: CrewMember; online: boolean; now: number } = $props();
  const context = $derived(riskContext(member, online, now));
  const related = $derived(spaceRisks.find((r) => r.id === context.risk));
  let selected = $state('sleep');
  const explored = $derived(spaceRisks.find((r) => r.id === selected)!);
</script>

<section class="health-learning risk-context" aria-label="Space health education">
  <div class="learning-heading">
    <div>
      <span class="learning-eyebrow">NASA research · Educational context</span>
      <h2>Why this matters in space</h2>
    </div>
    <a href={nasaRisksUrl} target="_blank" rel="noreferrer">NASA health risks ↗</a>
  </div>
  {#if context.help}<p class="learning-help" role="status">
      Your saved concern still needs follow-up. Contact your crew directly; reading this information
      does not send a message or resolve a concern.
    </p>{/if}
  <p class="learning-note">{context.reason}</p>
  {#if related}
    <h3>{related.title}</h3>
    <p>{related.meaning}</p>
    <div class="learning-columns">
      <div>
        <h4>What we cannot tell</h4>
        <p>{related.missing}</p>
      </div>
      <div class="learning-next">
        <h4>Your next step</h4>
        <p>{related.action}</p>
      </div>
    </div>
    <a href={related.url} target="_blank" rel="noreferrer">Read the NASA context ↗</a>
    {#if !context.help}<LearningExplanation request={{ kind: 'risk', riskId: related.id }} />{/if}
  {/if}
  <details class="learning-catalog">
    <summary>Explore space health risks</summary>
    <p>
      Choose a topic to learn about it. These are not personal alerts or a calculated risk score.
    </p>
    <label for="space-risk-topic">Health topic</label>
    <select id="space-risk-topic" bind:value={selected}>
      {#each spaceRisks as risk}<option value={risk.id}>{risk.title}</option>{/each}
    </select>
    <article aria-live="polite">
      <h3>{explored.title}</h3>
      <p>{explored.meaning}</p>
      <div class="learning-columns">
        <div>
          <h4>What ZENIT does not measure or establish</h4>
          <p>{explored.missing}</p>
        </div>
        <div class="learning-next">
          <h4>A useful next step</h4>
          <p>{explored.action}</p>
        </div>
      </div>
      <a href={explored.url} target="_blank" rel="noreferrer">NASA source ↗</a>
      {#if !context.help}<LearningExplanation
          request={{ kind: 'risk', riskId: explored.id }}
        />{/if}
    </article>
  </details>
</section>
