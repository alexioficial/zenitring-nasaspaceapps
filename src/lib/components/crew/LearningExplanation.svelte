<script lang="ts">
  import { tick } from 'svelte';
  import type { LearningRequest, LearningExplanation } from '$lib/server/learning-ai';
  import type { ExplanationDepth } from '$lib/crew/explanation';
  import { guidedScenarios, spaceRisks } from '$lib/crew/health-learning';
  import EvidenceNotes from './EvidenceNotes.svelte';
  let { request }: { request: LearningRequest } = $props();
  const key = $derived(JSON.stringify(request));
  let requested = $state('');
  let explanation = $state<LearningExplanation | null>(null);
  let status = $state('');
  let model = $state('');
  let depth = $state<ExplanationDepth>('quick');
  const scenario = $derived(request.kind === 'guided' ? guidedScenarios[request.scenario] : null);
  const risk = $derived(
    spaceRisks.find((r) => r.id === (request.kind === 'risk' ? request.riskId : scenario!.risk))!,
  );
  const sources = $derived({
    risk: { title: `NASA · ${risk.title}`, url: risk.url },
    ...(scenario ? { study: scenario.source } : {}),
  });
  const labels = $derived(
    request.kind === 'guided'
      ? Object.fromEntries(
          scenario!.steps[request.step].readings.map((r, i) => [`reading-${i}`, r.label]),
        )
      : { 'risk-context': risk.title },
  );
  const visible = $derived(requested === key ? explanation : null);
  $effect(() => {
    const current = key;
    if (requested !== current) {
      requested = '';
      explanation = null;
      status = '';
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), depth === 'detailed' ? 60_000 : 30_000);
    let disposed = false;
    status = 'Explaining with Gemini…';
    explanation = null;
    void fetch('/api/health-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...JSON.parse(current), depth }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw Error();
        return res.json();
      })
      .then((result) => {
        if (disposed) return;
        if (result.mode === 'ai') {
          explanation = result.explanation;
          model = result.model;
          status = 'Gemini explanation';
        } else
          status =
            result.reason === 'not-configured'
              ? 'Gemini is not configured. The built-in explanation and next step remain available.'
              : 'Using the built-in explanation and next step.';
      })
      .catch(() => {
        if (!disposed)
          status =
            'Gemini could not respond. The built-in explanation and next step remain available.';
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  });
  async function ask(next: ExplanationDepth) {
    requested = '';
    await tick();
    depth = next;
    requested = key;
  }
</script>

<div class="learning-ai">
  <div class="explanation-controls">
    <button
      class="crew-button secondary"
      onclick={() => ask('quick')}
      disabled={requested === key && status === 'Explaining with Gemini…'}
      >Explain this with AI</button
    >
    <button
      class="crew-button secondary"
      onclick={() => ask('detailed')}
      disabled={requested === key && status === 'Explaining with Gemini…'}
      >Explore the evidence</button
    >
  </div>
  <p class="learning-note">
    {request.kind === 'risk'
      ? 'General education: only the selected topic is sent. No personal readings or reports are used.'
      : 'Only this synthetic step and your practice choices are sent. Your mission records are not included.'}
  </p>
  {#if requested === key && status}<p role="status" class="learning-note">{status}</p>{/if}
  {#if visible}
    <p>{visible.summary}</p>
    {#if visible.evidenceNotes}<EvidenceNotes
        notes={visible.evidenceNotes}
        {labels}
        {sources}
      />{/if}
    <p><strong>Still unknown:</strong> {visible.uncertainty}</p>
    <p><strong>Why this next step:</strong> {visible.actionReason}</p>
    <p class="learning-note">
      Explained by {model}. Experimental explanation; the next step stays visible independently.
    </p>
    <div class="insight-source-links">
      {#each visible.sourceIds as id}{#if sources[id as keyof typeof sources]}
          <a href={sources[id as keyof typeof sources]!.url} target="_blank" rel="noreferrer"
            >{sources[id as keyof typeof sources]!.title}</a
          >
        {/if}{/each}
    </div>
  {/if}
</div>
