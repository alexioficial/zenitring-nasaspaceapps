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
  import { clockLabel } from '$lib/crew/model';
  import type { CrewMember } from '$lib/crew/types';
  import '$lib/crew/automatic.css';
  let {
    member,
    now,
    online = true,
    aiEnabled = true,
    compact = false,
    oncontext,
  }: {
    member: CrewMember;
    now: number;
    online?: boolean;
    aiEnabled?: boolean;
    compact?: boolean;
    oncontext?: () => void;
  } = $props();
  let assessment = $derived(analyzeSignals(member, now, online));
  let response = $state<{ episode: string; answer: AutomaticAnswer } | null>(null);
  let answer = $derived(
    response &&
      (response.answer === 'unwell' ||
        response.answer === 'alert' ||
        response.episode === assessment.id)
      ? response.answer
      : null,
  );
  let context = $derived(contextualize(assessment, answer));
  let explanation = $state<{
    summary: string;
    uncertainty: string;
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
      title: 'Have you been exercising?',
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

<section
  class="automatic-health"
  class:automatic-review={assessment.state === 'review'}
  aria-label="Automatic health assessment"
>
  <div class="automatic-top">
    <h2>Assessment</h2>
    <span class="automatic-mode">{aiEnabled ? aiState : 'Local analysis · research replay'}</span>
  </div>
  <h3 class="assessment-title">
    {#if assessment.state === 'review'}<Icon name="rise" size={36} />{/if}<span
      >{assessment.title}</span
    >
  </h3>
  {#if !compact || assessment.state !== 'review'}<p class="automatic-lead">
      {assessment.explanation}
    </p>{:else}<p class="automatic-lead">A simulated pattern to review, not a diagnosis.</p>{/if}
  {#snippet provenance()}<div class="automatic-provenance">
      <span>{assessment.source === 'spacesuit' ? 'Suit ECG & atmosphere' : 'Ring telemetry'}</span
      ><span>{assessment.count} comparable readings</span><span
        >{assessment.measuredAt
          ? `Measured ${clockLabel(assessment.measuredAt)}`
          : 'No reading yet'}</span
      ><strong>Simulated data</strong>
    </div>{/snippet}
  {#if !compact}{@render provenance()}{/if}
  {#if assessment.question}
    <fieldset class="automatic-question">
      <legend>{questions[assessment.question].title}</legend>
      {#if !compact}<p>One answer adds context. Your readings are already attached.</p>{/if}
      {#each questions[assessment.question].options as option}<button
          aria-pressed={answer === option.id}
          onclick={() => (response = { episode: assessment.id, answer: option.id })}
          ><Icon name={answerIcons[option.id] ?? 'check'} size={26} /><span>{option.label}</span
          ></button
        >{/each}
    </fieldset>
  {/if}
  {#if !compact || !assessment.question || answer}
    <div
      class="automatic-next"
      class:automatic-help={context.help}
      role={context.help ? 'alert' : undefined}
    >
      <strong>Next step</strong>
      <p>{context.nextStep}</p>
      {#if context.help}<button class="crew-button secondary" onclick={() => (response = null)}
          >I contacted the crew</button
        >{/if}
    </div>
  {/if}
  {#if compact && oncontext}<button class="medbay-add-context" onclick={oncontext}
      ><Icon name="pen" size={26} />Add activity context<Icon name="arrow" size={24} /></button
    >{/if}
  {#if compact || assessment.observations.length || assessment.question}
    <details class="assessment-evidence" open={!compact}>
      <summary>Evidence &amp; assessment guide{visibleExplanation ? ' · Gemini' : ''}</summary>
      {#if compact}{@render provenance()}
        <p class="automatic-lead">{assessment.explanation}</p>{/if}
      {#if assessment.observations.length}<div class="automatic-signals">
          {#each assessment.observations as observation}<div
              class:automatic-changed={observation.triggered}
            >
              <span>{observation.label}</span><strong
                >{observation.recent.toFixed(observation.unit === 'kPa' ? 2 : 1)}
                <small>{observation.unit}</small></strong
              ><small
                >{observation.delta >= 0 ? '+' : ''}{observation.delta.toFixed(
                  observation.unit === 'kPa' ? 2 : 1,
                )} from earlier median {observation.earlier.toFixed(1)}</small
              ><span class="automatic-pattern"
                >{observation.triggered
                  ? 'Persistent demo change'
                  : 'No matching demo change'}</span
              >
            </div>{/each}
        </div>{/if}
      <div class="automatic-interpretation">
        <strong>What might be happening?</strong>
        <p>{context.explanation}</p>
        {#if visibleExplanation}<div class="automatic-ai">
            <strong>Gemini’s interpretation · {model}</strong><small
              >Based on readings through {clockLabel(aiMeasuredAt)}. The live readings above
              continue to update.</small
            >
            <p>{visibleExplanation.summary}</p>
            <p><strong>Still unknown:</strong> {visibleExplanation.uncertainty}</p>
            <div>
              {#each visibleExplanation.sourceIds as id}<a
                  href={automaticSources[id].url}
                  target="_blank"
                  rel="noreferrer">{automaticSources[id].title} ↗</a
                >{/each}
            </div>
            <small
              >Experimental AI explanation. Sources provide background; they do not validate this
              interpretation.</small
            >
          </div>{/if}
      </div>
      {#if compact}
        <div>
          <p>
            The detector runs locally as telemetry arrives. It compares three recent readings with
            six earlier readings from the same uninterrupted source and phase. Nine samples are
            required. Missing or old data stop interpretation.
          </p>
          <p>
            The comparison window is at most five minutes. Its reference is not your clinical
            baseline. Demo triggers: pulse +20 bpm, breathing +4/min, SpO₂ −2 percentage points,
            skin change +0.4 °C; suit CO₂ +0.15 kPa, O₂ ±1 kPa, pressure ±0.5 kPa or air temperature
            ±2 °C. These are presentation rules, not NASA limits.
          </p>
          <p>
            Gemini receives numeric summaries and your selected context, without your name or notes.
            It explains possibilities; it does not determine the detector, next steps or suit
            controls. Answers here apply to this detected episode and are not a saved check-in.
          </p>
          <a href={automaticSources[assessment.sourceId].url} target="_blank" rel="noreferrer"
            >{automaticSources[assessment.sourceId].title} ↗</a
          >
        </div>
      {/if}
    </details>
  {/if}
  {#if !compact}
    <details class="crew-disclosure">
      <summary>How this assessment works</summary>
      <div>
        <p>
          The detector runs locally as telemetry arrives. It compares three recent readings with six
          earlier readings from the same uninterrupted source and phase. Nine samples are required.
          Missing or old data stop interpretation.
        </p>
        <p>
          The comparison window is at most five minutes. Its reference is not your clinical
          baseline. Demo triggers: pulse +20 bpm, breathing +4/min, SpO₂ −2 percentage points, skin
          change +0.4 °C; suit CO₂ +0.15 kPa, O₂ ±1 kPa, pressure ±0.5 kPa or air temperature ±2 °C.
          These are presentation rules, not NASA limits.
        </p>
        <p>
          Gemini receives numeric summaries and your selected context, without your name or notes.
          It explains possibilities; it does not determine the detector, next steps or suit
          controls. Answers here apply to this detected episode and are not a saved check-in.
        </p>
        <a href={automaticSources[assessment.sourceId].url} target="_blank" rel="noreferrer"
          >{automaticSources[assessment.sourceId].title} ↗</a
        >
      </div>
    </details>
  {/if}
</section>
