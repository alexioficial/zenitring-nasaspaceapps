<script lang="ts">
  import { tick } from 'svelte';
  import type { LearningRequest, LearningExplanation } from '$lib/server/learning-ai';
  let { request }: { request: LearningRequest } = $props();
  const key = $derived(JSON.stringify(request));
  let requested = $state('');
  let explanation = $state<LearningExplanation | null>(null);
  let status = $state('');
  let model = $state('');
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
    const timeout = setTimeout(() => controller.abort(), 15000);
    let disposed = false;
    status = 'Explaining with Gemini…';
    explanation = null;
    void fetch('/api/health-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: current,
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
  async function ask() {
    requested = '';
    await tick();
    requested = key;
  }
</script>

<div class="learning-ai">
  <button
    class="crew-button secondary"
    onclick={ask}
    disabled={requested === key && status === 'Explaining with Gemini…'}
    >Explain this with AI</button
  >
  <p class="learning-note">
    {request.kind === 'risk'
      ? 'General education: only the selected topic is sent. No personal readings or reports are used.'
      : 'Only this synthetic step and your practice choices are sent. Your mission records are not included.'}
  </p>
  {#if requested === key && status}<p role="status" class="learning-note">{status}</p>{/if}
  {#if visible}
    <p>{visible.summary}</p>
    <p><strong>Still unknown:</strong> {visible.uncertainty}</p>
    <p><strong>Why this next step:</strong> {visible.actionReason}</p>
    <p class="learning-note">
      Explained by {model}. Uses the {visible.sourceIds.includes('study')
        ? 'NASA risk and study sources'
        : 'NASA risk source'} linked above. Experimental explanation; the next step stays visible independently.
    </p>
  {/if}
</div>
