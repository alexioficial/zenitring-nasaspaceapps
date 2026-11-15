<script lang="ts">
  import type { EvidenceNote } from '$lib/crew/explanation';
  import '$lib/crew/explanation.css';
  let {
    notes,
    labels,
    sources,
  }: {
    notes: EvidenceNote[];
    labels: Record<string, string>;
    sources: Record<string, { title: string; url: string }>;
  } = $props();
</script>

{#if notes.length}
  <div class="evidence-notes" aria-label="Evidence explained">
    <h4>Reading the evidence</h4>
    {#each notes as note}
      <div class="evidence-note">
        <strong>{labels[note.evidenceId] ?? 'Context'}</strong>
        <p>{note.text}</p>
        {#if sources[note.sourceId]}
          <a href={sources[note.sourceId].url} target="_blank" rel="noreferrer">
            {sources[note.sourceId].title}
          </a>
        {/if}
      </div>
    {/each}
  </div>
{/if}
