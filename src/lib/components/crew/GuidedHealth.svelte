<script lang="ts">
  import LearningExplanation from './LearningExplanation.svelte';
  import EvidenceChart from './EvidenceChart.svelte';
  import { tick } from 'svelte';
  import {
    guidedScenarios,
    learningResponse,
    spaceRisks,
    type GuidedScenario,
    type LearningAnswer,
  } from '$lib/crew/health-learning';
  import '$lib/crew/learning.css';
  let {
    scenario,
    onscenario,
  }: { scenario: GuidedScenario; onscenario: (value: GuidedScenario | null) => void } = $props();
  const content = $derived(guidedScenarios[scenario]);
  const risk = $derived(spaceRisks.find((r) => r.id === content.risk)!);
  let step = $state(0);
  let answer = $state<LearningAnswer>(null);
  let practiced = $state(false);
  let outcome = $state<'' | 'better' | 'same' | 'worse'>('');
  let heading = $state<HTMLHeadingElement>();
  const current = $derived(content.steps[step]);
  const urgent = $derived(answer === 'unwell' || outcome === 'worse');
  async function move(next: number) {
    step = Math.max(0, Math.min(content.steps.length - 1, next));
    if (step < 2 && outcome !== 'worse') outcome = '';
    if (step === 0 && answer !== 'unwell') answer = null;
    if (step === 0) practiced = false;
    await tick();
    heading?.focus({ preventScroll: true });
  }
  function restart() {
    answer = null;
    practiced = false;
    outcome = '';
    void move(0);
  }
</script>

<section class="health-learning guided-health" aria-label="Guided health simulation">
  <div class="learning-heading">
    <span class="learning-eyebrow">Guided simulation · Synthetic data</span>
    <button class="crew-button secondary" onclick={() => onscenario(null)}
      >Return to my readings</button
    >
  </div>
  <nav class="learning-choices" aria-label="Guided scenario">
    <button
      class="crew-button secondary"
      aria-pressed={scenario === 'archer'}
      onclick={() => onscenario('archer')}>Sleep, activity &amp; wellbeing</button
    >
    <button
      class="crew-button secondary"
      aria-pressed={scenario === 'radin2'}
      onclick={() => onscenario('radin2')}>Radiation monitoring</button
    >
  </nav>
  <h2>{content.title}</h2>
  <p>{content.intro}</p>
  <p class="learning-disclosure">{content.disclosure}</p>
  <div class="learning-progress">
    <span>Step {step + 1} of {content.steps.length}</span><span>{current.period}</span>
  </div>
  <h3 tabindex="-1" bind:this={heading}>{current.title}</h3>
  <dl class="learning-readings">
    {#each current.readings as reading}<div>
        <dt>{reading.label}</dt>
        <dd>{reading.value}</dd>
        <span>{reading.source}</span>
      </div>{/each}
  </dl>
  <div class="guided-charts" class:single-chart={scenario === 'radin2'}>
    {#if scenario === 'archer'}
      {#each [0, 1] as metric}
        <EvidenceChart
          title={metric === 0
            ? 'Sleep across the practice days'
            : 'Activity across the practice days'}
          unit={current.readings[metric].unit!}
          points={content.steps.slice(0, step + 1).map((s, i) => ({
            label: `Day ${i + 1}`,
            value: s.readings[metric].amount!,
            detail: `${s.readings[metric].source}. ${metric === 0 ? 'Reported sleep duration, not a measurement from the ring.' : 'Duration alone does not show intensity or readiness.'}`,
          }))}
          note="Synthetic records through this step. Select a bar for its source. Scale starts at zero."
        />
      {/each}
    {:else}
      <EvidenceChart
        title={step === 0 ? 'Initial detector counts' : 'Detector counts after seven days'}
        unit="bubbles"
        points={current.readings
          .filter((r) => r.amount !== undefined)
          .map((r) => ({
            label: r.label,
            value: r.amount!,
            detail: `${r.source}. Counts require calibration before any dose interpretation.`,
          }))}
        note={step === 0
          ? 'Zero initial counts do not establish environmental safety.'
          : 'Synthetic counts over the same seven days. Differences do not establish a safe location.'}
      />
    {/if}
  </div>
  <div class="learning-columns">
    <div>
      <h4>What we observe</h4>
      <p>{current.observation}</p>
      <h4>What it could mean</h4>
      <p>{current.meaning}</p>
      <h4>What we still need to know</h4>
      <p>{current.missing}</p>
    </div>
    <aside class="learning-next">
      <span class="learning-eyebrow">Why it matters in space</span>
      <h4>{risk.title}</h4>
      <p>{risk.meaning}</p>
      <h4>Your next step</h4>
      <p>
        {urgent
          ? 'If you feel unwell or worse, contact your crew directly. This practice sends no message.'
          : current.action}
      </p>
      <a href={risk.url} target="_blank" rel="noreferrer">NASA risk context ↗</a>
    </aside>
  </div>
  {#if scenario === 'archer' && step > 0}
    <fieldset class="learning-question">
      <legend>Practice adding context: what would you report?</legend>
      <div class="learning-choices">
        {#each [{ id: 'schedule', label: 'My schedule changed' }, { id: 'unsure', label: 'I am not sure why' }, { id: 'unwell', label: 'I feel unwell' }] as choice}
          <button
            class="crew-button secondary"
            aria-pressed={answer === choice.id}
            onclick={() => {
              answer = choice.id as LearningAnswer;
              outcome = '';
            }}>{choice.label}</button
          >
        {/each}
      </div>
    </fieldset>
  {/if}
  {#if (scenario === 'archer' && answer) || (scenario === 'radin2' && step > 0)}
    <p class:learning-help={answer === 'unwell'} class="learning-response" aria-live="polite">
      {learningResponse(scenario, answer, practiced)}
    </p>
  {/if}
  {#if step > 0 && !urgent}
    <label class="learning-practice"
      ><input type="checkbox" bind:checked={practiced} />{scenario === 'archer'
        ? 'Practice: I reviewed the assigned rest schedule'
        : 'Practice: I checked detector locations and collection times'}</label
    >
  {/if}
  {#if outcome === 'worse'}<p class="learning-help" role="status">
      You reported feeling worse in this practice. Contact your crew directly if this reflects how
      you feel. Going back does not dismiss the concern; restarting clears practice responses.
    </p>{/if}
  {#if step === 2 && scenario === 'archer'}
    <label for="practice-followup">Practice follow-up: how do you feel?</label>
    <select id="practice-followup" bind:value={outcome}>
      <option value="">Choose a practice response</option><option value="better">Better</option
      ><option value="same">The same</option><option value="worse">Worse</option>
    </select>
    {#if outcome}<p aria-live="polite" class:learning-help={outcome === 'worse'}>
        {outcome === 'worse'
          ? 'If you feel worse, contact your crew directly and follow the mission medical procedure. This exercise sends no alert.'
          : 'Keep this report alongside the readings. It does not establish recovery or clearance for a task.'}
      </p>{/if}
  {/if}
  {#if answer !== 'unwell' && outcome !== 'worse'}
    <LearningExplanation request={{ kind: 'guided', scenario, step, answer, practiced, outcome }} />
  {/if}
  <div class="learning-controls">
    <button class="crew-button secondary" onclick={() => move(step - 1)} disabled={step === 0}
      >Back</button
    >
    {#if step < 2}<button class="crew-button" onclick={() => move(step + 1)}>Next</button
      >{:else}<button class="crew-button" onclick={() => onscenario(null)}>Finish practice</button
      >{/if}
    <button class="crew-button secondary" onclick={restart}>Restart</button>
  </div>
  <footer class="learning-source">
    <a href={content.source.url} target="_blank" rel="noreferrer">{content.source.title} ↗</a>
    <p>{content.source.relevance}</p>
    {#if scenario === 'radin2'}<a
        href="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp"
        target="_blank"
        rel="noreferrer">David Saint-Jacques and the development of radiation monitoring ↗</a
      >
      <p>
        The article discusses CANS as a newer technology; this exercise illustrates Radi-N2 bubble
        detectors.
      </p>{/if}
    <p>
      Practice only. Answers reset when you leave or restart. Nothing is saved to your health
      records or sent to the crew.
    </p>
  </footer>
</section>
