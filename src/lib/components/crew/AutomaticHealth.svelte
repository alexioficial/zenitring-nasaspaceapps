<script lang="ts">
  import { untrack } from 'svelte';
  import Icon, { type IconName } from '../Icon.svelte';
  import {
    analyzeSignals,
    automaticSources,
    contextualize,
    type AutomaticAnswer,
  } from '$lib/crew/automatic';
  import { activeSource } from '$lib/crew/suit';
  import { healthInsight, observationValue } from '$lib/crew/health-insight';
  import { clockLabel, freshness } from '$lib/crew/model';
  import type { CrewMember } from '$lib/crew/types';
  import '$lib/crew/automatic.css';
  let {
    member,
    now,
    online = true,
    aiEnabled = true,
    compact = false,
    oncontext,
    connectHref,
    response = $bindable(null),
  }: {
    member: CrewMember;
    now: number;
    online?: boolean;
    aiEnabled?: boolean;
    compact?: boolean;
    oncontext?: () => void;
    connectHref?: string;
    response?: { episode: string; answer: AutomaticAnswer } | null;
  } = $props();
  let assessment = $derived(analyzeSignals(member, now, online));
  // A source that was linked before only needs reconnecting, not linking from scratch.
  let wasLinked = $derived(!!activeSource(member).deviceId);
  let answer = $derived(
    response &&
      (response.answer === 'unwell' ||
        response.answer === 'alert' ||
        response.episode === assessment.id)
      ? response.answer
      : null,
  );
  let context = $derived(contextualize(assessment, answer));
  let insight = $derived(healthInsight(assessment, answer));
  // Without a current reading the phone view offers the simulator before anything else.
  // Reception (server time) decides this, so emitter clock skew never asks a live ring to reconnect.
  let sourceState = $derived.by(() => {
    const source = activeSource(member);
    return freshness(source.connected, source.latest?.receivedAt ?? null, source.intervalMs, now);
  });
  let needsSource = $derived(
    !!connectHref &&
      online &&
      assessment.state === 'unavailable' &&
      sourceState !== 'live' &&
      !insight.help,
  );
  let sourceName = $derived(assessment.source === 'spacesuit' ? 'suit' : 'ring');
  let editingAnswer = $state(false);
  let answerLabel = $derived(
    (
      {
        finished: 'I just finished exercising',
        active: 'I am still active',
        resting: 'No recent exercise',
        unwell: 'I feel unwell',
        alert: 'The suit shows an alert',
        'no-alert': 'No suit alert shown',
        'check-fit': 'I will check sensor fit',
      } as Record<string, string>
    )[answer ?? ''],
  );
  let explanation = $state<{
    summary: string;
    uncertainty: string;
    actionReason?: string;
    sourceIds: (keyof typeof automaticSources)[];
  } | null>(null);
  let aiState = $state('Local analysis');
  let model = $state('');
  let aiMeasuredAt = $state(0);
  let explanationKey = $state('');
  let requestKey = $derived(
    aiEnabled && online && assessment.state === 'review' && !context.help
      ? `${assessment.id}:${answer ?? 'unknown'}`
      : '',
  );
  let visibleExplanation = $derived(explanationKey === requestKey ? explanation : null);
  const questions = {
    activity: {
      title: 'Were you exercising before this change?',
      options: [
        { id: 'finished', label: 'Yes, finished' },
        { id: 'active', label: 'Still active' },
        { id: 'resting', label: 'No recent exercise' },
        { id: 'unwell', label: 'I feel unwell' },
      ],
    },
    measurement: {
      title: 'What context can you add?',
      options: [
        { id: 'check-fit', label: 'Check sensor fit' },
        { id: 'active', label: 'Currently active' },
        { id: 'unwell', label: 'I feel unwell' },
      ],
    },
    suit: {
      title: 'Does the suit show an alert?',
      options: [
        { id: 'alert', label: 'Yes, suit alert' },
        { id: 'no-alert', label: 'No alert shown' },
        { id: 'unwell', label: 'I feel unwell' },
      ],
    },
  } as const;
  const answerIcons: Record<string, IconName> = {
    finished: 'activity',
    active: 'activity',
    resting: 'chair',
    unwell: 'medical',
    alert: 'pulse',
    'no-alert': 'check',
    'check-fit': 'ring',
  };
  $effect(() => {
    const key = requestKey;
    if (!key) {
      explanation = null;
      aiState = 'Local analysis';
      return;
    }
    const controller = new AbortController();
    const payload = untrack(() => {
      const source = activeSource(member),
        samples = source.type === 'ring' ? member.samples : member.suit.samples;
      return {
        source: source.type,
        intervalMs: source.intervalMs,
        phase: member.phase,
        phaseStart: member.phaseHistory.at(-1)?.changedAt ?? 0,
        answer,
        samples: samples
          .filter((s) => s.deviceId === source.deviceId && s.astronautId === member.id)
          .slice(-120)
          .map((s) => ({
            measuredAt: s.measuredAt,
            receivedAt: s.receivedAt,
            values: { ...s.values },
          })),
      };
    });
    explanation = null;
    explanationKey = key;
    aiState = 'Gemini is explaining this change…';
    void fetch('/api/health-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw Error();
        return res.json();
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.mode === 'ai') {
          explanation = result.explanation;
          model = result.model;
          aiMeasuredAt = result.measuredAt;
          aiState = 'Gemini explanation';
        } else
          aiState =
            result.reason === 'not-configured'
              ? 'Local analysis · Gemini not configured'
              : 'Local analysis · Gemini unavailable';
      })
      .catch(() => {
        if (!controller.signal.aborted) aiState = 'Local analysis · Gemini unavailable';
      });
    return () => controller.abort();
  });
</script>

{#snippet evidence()}
  {#if insight.evidence.length}
    <div class="insight-evidence" aria-label="What changed">
      <svelte:element this={compact ? 'h3' : 'h4'}>What changed</svelte:element>
      <dl>
        {#each insight.evidence as observation}<div>
            <dt>{observation.label}</dt>
            <dd>
              <span>{observationValue(observation.metric, observation.earlier)}</span><Icon
                name="arrow"
                size={15}
              /><strong
                >{observationValue(observation.metric, observation.recent)}
                <small>{observation.unit}</small></strong
              >
            </dd>
          </div>{/each}
      </dl>
      <p>
        Earlier 6 → latest 3 readings · {assessment.source === 'ring'
          ? 'Ring'
          : 'Suit'}{#if insight.moreChanges}
          · {insight.moreChanges} more in details{/if}
      </p>
    </div>
  {/if}
{/snippet}

{#snippet contextQuestion()}
  {#if answer && !editingAnswer}
    <div class="insight-answer">
      <span><Icon name="check" size={18} />{answerLabel}</span><button
        onclick={() => (editingAnswer = true)}>Change answer</button
      >
    </div>
  {:else if assessment.question}
    {#if !compact}<h4 class="insight-action-label">What to do now</h4>{/if}
    <fieldset class="automatic-question">
      <legend>{questions[assessment.question].title}</legend>
      <div class="insight-options">
        {#each questions[assessment.question].options as option}<button
            aria-pressed={answer === option.id}
            onclick={() => {
              response = { episode: assessment.id, answer: option.id };
              editingAnswer = false;
            }}
            ><Icon name={answerIcons[option.id] ?? 'check'} size={24} /><span>{option.label}</span
            ></button
          >{/each}
      </div>
    </fieldset>
  {/if}
{/snippet}

{#snippet contactedButton()}
  <button
    class="crew-button secondary insight-contacted"
    onclick={() => {
      response = null;
      editingAnswer = false;
    }}>I contacted the crew</button
  >
{/snippet}

{#snippet explanationDetails()}
  <div class="automatic-provenance">
    <span>{assessment.source === 'spacesuit' ? 'Suit ECG & atmosphere' : 'Ring telemetry'}</span>
    <span>{assessment.count} comparable readings</span>
    <span
      >{assessment.measuredAt
        ? `Measured ${clockLabel(assessment.measuredAt)}`
        : 'No reading yet'}</span
    >
  </div>
  <p>{insight.nasa.relevance}</p>
  {#if assessment.observations.length}<div class="insight-all-readings">
      {#each assessment.observations as observation}<p>
          <strong>{observation.label}:</strong>
          {observationValue(observation.metric, observation.earlier)} → {observationValue(
            observation.metric,
            observation.recent,
          )}
          {observation.unit}. {observation.triggered
            ? 'Sustained change in this demo.'
            : 'No sustained change under demo rules.'}
        </p>{/each}
    </div>{/if}
  {#if visibleExplanation}<p>Explained by {model}. The live readings continue to update.</p>
    <div class="insight-source-links">
      {#each visibleExplanation.sourceIds as id}<a
          href={automaticSources[id].url}
          target="_blank"
          rel="noreferrer">{automaticSources[id].title}</a
        >{/each}
    </div>{/if}
  <p>
    The values above are medians: the middle value of six earlier readings compared with the middle
    value of three recent readings. They come from the same device and mission phase, over no more
    than five minutes. They are not your long-term clinical baseline.
  </p>
  <p>
    Demo triggers: pulse +20 bpm, breathing +4/min, SpO₂ −2 percentage points, skin change +0.4 °C;
    suit CO₂ +0.15 kPa, O₂ ±1 kPa, pressure ±0.5 kPa or air temperature ±2 °C. These are
    presentation rules, not NASA medical limits.
  </p>
  <p>
    {aiEnabled
      ? 'Gemini receives numeric observations and your selected answer, without your name or notes. It explains possibilities; it does not set the next action, send alerts or control the suit.'
      : 'This research replay uses the built-in explanation. It does not contact Gemini.'} Answers here
    update this explanation only.{#if oncontext}
      Use Record how I feel to save a check-in shared with the crew.{/if}
  </p>
  <p>
    NASA resources explain the monitoring context. They do not validate this algorithm or its
    interpretations. Historical RadLab measurements are not used to infer the cause of your
    symptoms.
  </p>
{/snippet}

{#if compact}
  <!-- Phone workspace: the headline speaks for itself, then one clear action. -->
  <section
    class="automatic-health health-insight compact-insight"
    class:automatic-review={assessment.state === 'review' && !insight.help}
    class:insight-help={insight.help}
    data-state={assessment.state}
    aria-label="Automatic health assessment"
  >
    <h2 class="assessment-title">
      <Icon
        name={insight.help ? 'medical' : assessment.state === 'review' ? 'rise' : 'pulse'}
        size={28}
      /><span
        >{needsSource
          ? `${wasLinked ? 'Reconnect' : 'Link'} your ${sourceName}`
          : insight.headline}</span
      >
    </h2>
    {#if insight.help}<p class="insight-urgent" role="alert">{insight.action}</p>{/if}

    <div class="insight-meaning" aria-label="What it could mean">
      <p class="insight-summary">
        {needsSource
          ? wasLinked
            ? 'Reconnect it to see current readings.'
            : 'Link it to see your readings.'
          : (visibleExplanation?.summary ?? insight.meaning)}
      </p>
      {#if aiState === 'Gemini is explaining this change…'}<p
          class="insight-ai-status"
          role="status"
        >
          Gemini is reviewing this change. The built-in explanation remains available.
        </p>
      {:else if visibleExplanation}<p class="insight-ai-status">
          Gemini explanation · readings through {clockLabel(aiMeasuredAt)}
        </p>{/if}
    </div>

    {@render evidence()}
    {@render contextQuestion()}

    {#if assessment.state === 'review' && !insight.help}<p class="insight-unknown">
        <strong>Still unknown:</strong>
        {visibleExplanation?.uncertainty ?? insight.unknown}
      </p>{/if}
    {#if !insight.help && (answer || !assessment.question) && !needsSource}
      <div class="automatic-next">
        <strong>What to do now</strong>
        <p>{insight.action}</p>
        {#if visibleExplanation?.actionReason}<p class="insight-ai-status">
            <strong>Why this step:</strong>
            {visibleExplanation.actionReason}
          </p>{/if}
      </div>
    {:else if insight.help}{@render contactedButton()}{/if}
    {#if needsSource}
      <a class="crew-button assessment-connect" href={connectHref} target="_blank" rel="noreferrer"
        >Open {sourceName} simulator <Icon name="arrow" size={18} /></a
      >
    {/if}
    {#if oncontext}<button
        class="medbay-add-context"
        class:assessment-secondary={assessment.state === 'unavailable' && !insight.help}
        onclick={oncontext}
        ><Icon name="pen" size={24} />Record how I feel<Icon name="arrow" size={22} /></button
      >{/if}
    {#if needsSource}
      <p class="insight-unavailable-note">
        If you feel unwell, tell the crew without waiting for new data.
      </p>
    {/if}

    <!-- With no readings there is nothing to explain yet. -->
    {#if assessment.state !== 'unavailable'}<details class="assessment-evidence">
        <summary>How this assessment works <Icon name="chevron" size={17} /></summary>
        <p>{insight.nasa.context}</p>
        <a href={insight.nasa.url} target="_blank" rel="noreferrer"
          >{insight.nasa.title}<Icon name="arrow" size={15} /></a
        >
        {#if aiState.includes('unavailable')}<p class="insight-ai-status" role="status">
            Gemini could not respond. You are reading ZENIT’s built-in explanation.
          </p>
        {:else if aiState.includes('not configured')}<p class="insight-ai-status">
            Gemini is not connected. ZENIT’s built-in explanation is shown.
          </p>
        {/if}
        {@render explanationDetails()}
      </details>{/if}
  </section>
{:else}
  <section
    class="automatic-health health-insight"
    class:automatic-review={assessment.state === 'review' && !insight.help}
    class:insight-help={insight.help}
    aria-label="Automatic health assessment"
  >
    <div class="automatic-top">
      <h2>What’s happening?</h2>
      <span class="insight-provider">{visibleExplanation ? 'Gemini' : 'Built-in explanation'}</span>
    </div>
    <h3 class="assessment-title">
      <Icon
        name={insight.help ? 'medical' : assessment.state === 'review' ? 'rise' : 'pulse'}
        size={28}
      /><span>{insight.headline}</span>
    </h3>
    {#if insight.help}<p class="insight-urgent" role="alert">{insight.action}</p>{/if}

    {@render evidence()}

    <div class="insight-meaning" aria-label="What it could mean">
      <h4>
        {assessment.state === 'review' && !insight.help ? 'What it could mean' : 'What this means'}
      </h4>
      <p class="insight-summary">{visibleExplanation?.summary ?? insight.meaning}</p>
      {#if assessment.state === 'review' && !insight.help}<p class="insight-unknown">
          <strong>Still unknown:</strong>
          {visibleExplanation?.uncertainty ?? insight.unknown}
        </p>{/if}
      {#if aiState === 'Gemini is explaining this change…'}<p
          class="insight-ai-status"
          role="status"
        >
          Gemini is reviewing this change. The built-in explanation remains available.
        </p>
      {:else if aiState.includes('unavailable')}<p class="insight-ai-status" role="status">
          Gemini could not respond. You are reading ZENIT’s built-in explanation.
        </p>
      {:else if aiState.includes('not configured')}<p class="insight-ai-status">
          Gemini is not connected. ZENIT’s built-in explanation is shown.
        </p>
      {:else if visibleExplanation}<p class="insight-ai-status">
          Gemini explanation · readings through {clockLabel(aiMeasuredAt)}
        </p>{/if}
    </div>

    {@render contextQuestion()}

    {#if !insight.help && (answer || !assessment.question)}
      <div class="automatic-next">
        <strong>What to do now</strong>
        <p>{insight.action}</p>
        {#if visibleExplanation?.actionReason}<p class="insight-ai-status">
            <strong>Why this step:</strong>
            {visibleExplanation.actionReason}
          </p>{/if}
      </div>
    {:else if insight.help}{@render contactedButton()}{/if}
    {#if oncontext}<button class="medbay-add-context" onclick={oncontext}
        ><Icon name="pen" size={24} />Record how I feel<Icon name="arrow" size={22} /></button
      >{/if}

    <div class="insight-nasa">
      <h4><Icon name="book" size={18} />Why NASA context matters</h4>
      <p>{insight.nasa.context}</p>
      <a href={insight.nasa.url} target="_blank" rel="noreferrer"
        >{insight.nasa.title}<Icon name="arrow" size={15} /></a
      >
    </div>
    <p class="insight-limit">Simulated health data · Possible explanations, not a diagnosis.</p>
    <details class="assessment-evidence">
      <summary>Readings, sources &amp; explanation details</summary>
      {@render explanationDetails()}
    </details>
  </section>
{/if}
