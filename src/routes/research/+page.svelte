<script lang="ts">
  import ViewHeader from '$lib/components/crew/ViewHeader.svelte';
  import { onMount } from 'svelte';
  import AutomaticHealth from '$lib/components/crew/AutomaticHealth.svelte';
  import {
    researchScenarios,
    scenarioCrew,
    type ResearchScenario,
  } from '$lib/crew/research-scenarios';
  import { analyzeSignals, researchSource } from '$lib/crew/automatic';
  import '$lib/crew/crew.css';
  import '$lib/crew/automatic.css';
  let selected = $state<ResearchScenario>('recovery');
  let count = $state(9);
  let playing = $state(false);
  let ai = $state(false);
  let now = $state(Date.now());
  let member = $derived(scenarioCrew(selected, now, count));
  let actual = $derived(analyzeSignals(member, now));
  let scenario = $derived(researchScenarios.find((s) => s.id === selected)!);
  onMount(() => {
    const timer = setInterval(() => {
      if (playing) {
        now = Date.now();
        if (count < 9) count++;
        else playing = false;
      }
    }, 1000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head
  ><title>ZENIT · Research scenarios</title><meta
    name="description"
    content="Evaluate automatic health interpretations against known synthetic ring and spacesuit scenarios."
  /></svelte:head
>
<div class="crew-app astronaut-workspace research-app">
  <ViewHeader title="Not saved to health records" context="Demo tool" />
  <main class="research-shell">
    <header class="research-intro">
      <h1>Research scenarios</h1>
      <p>
        Known changes, explainable responses. A synthetic experiment inspired by NASA’s proposal for
        AI medical support: introduce a change, observe the response and compare it with a
        predefined expectation. These readings never enter the crew’s mission records.
      </p>
      <a href={researchSource} target="_blank" rel="noreferrer">Read the NASA research proposal ↗</a
      >
    </header>
    <nav class="research-scenarios" aria-label="Research scenario">
      {#each researchScenarios as item}<button
          aria-pressed={selected === item.id}
          onclick={() => {
            selected = item.id;
            count = 9;
            playing = false;
            now = Date.now();
          }}>{item.title}</button
        >{/each}
    </nav>
    <p class="research-verdict">
      <strong>Expected:</strong>
      {scenario.description}<br /><strong>Detector result:</strong>
      {count < 9
        ? 'Collecting the scenario'
        : actual.kind === scenario.expected
          ? 'Matches the predefined expectation'
          : 'Does not match the expectation'} · {actual.kind}
    </p>
    <div class="research-controls">
      <button
        class="crew-button"
        onclick={() => {
          count = 1;
          playing = true;
          now = Date.now();
        }}
        disabled={playing}>{playing ? `Replaying ${count}/9…` : 'Replay incoming readings'}</button
      ><button
        class="crew-button secondary"
        aria-pressed={ai}
        onclick={() => {
          ai = !ai;
          now = Date.now();
        }}>{ai ? 'Disable Gemini explanations' : 'Enable Gemini explanations'}</button
      >
    </div>
    {#key selected}<AutomaticHealth {member} {now} aiEnabled={ai} />{/key}
    <p class="research-disclaimer">
      Simulation replay · accelerated display · local detection rules. A matching detector result
      does not validate a medical diagnosis or the language model’s explanation. Review AI output
      separately against the scenario’s stated expectation.
    </p>
  </main>
</div>
