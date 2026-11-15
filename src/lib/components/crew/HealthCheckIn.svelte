<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import {
    healthTopics,
    medicalOperationsSource,
    buildHealthGuide,
    healthEvidence,
    validHealthInput,
    symptomOptions,
    activityOptions,
  } from '$lib/crew/health';
  import type {
    HealthTopic,
    Feeling,
    HealthInput,
    Followup,
    Symptom,
    Activity,
  } from '$lib/crew/health';
  import HealthInterpretation from './HealthInterpretation.svelte';
  import type { CrewMember, CrewEvent, ClientMessage } from '$lib/crew/types';
  import { clockLabel, newId } from '$lib/crew/model';
  let {
    member,
    events,
    online,
    now,
    send,
    startNew = false,
  }: {
    member: CrewMember;
    events: CrewEvent[];
    online: boolean;
    now: number;
    send: (m: ClientMessage & { id: string }) => Promise<boolean>;
    /** Open on a blank report even when a saved check-in exists. */
    startNew?: boolean;
  } = $props();
  let topic = $state<HealthTopic>('recovery');
  let feeling = $state<Feeling | null>(null);
  let note = $state('');
  let eventId = $state('');
  let symptoms = $state<Symptom[]>([]);
  let activity = $state<Activity>('unspecified');
  let reviewing = $state(false);
  let editing = $state(untrack(() => startNew));
  let busy = $state(false);
  let error = $state('');
  let storageReady = $state(false);
  let storageWarning = $state('');
  let selected = $state<string | null>(null);
  let input = $derived<HealthInput>({
    topic,
    feeling: feeling ?? 'usual',
    note,
    eventId: eventId || null,
    symptoms,
    activity,
  });
  let event = $derived(events.find((e) => e.id === eventId));
  let evidence = $derived(
    eventId ? (event ? healthEvidence(member, event) : null) : healthEvidence(member),
  );
  let preview = $derived(buildHealthGuide(input, member, evidence, now, online));
  let current = $derived(
    member.healthChecks.find((c) => c.id === selected) ?? member.healthChecks.at(-1),
  );
  let showingForm = $derived(editing || !current);
  let guide = $derived(showingForm ? preview : current!.guide);
  let shownTopic = $derived(healthTopics[showingForm ? topic : current!.input.topic]);
  let latestFollowup = $derived(current?.followups.at(-1));
  let needsHelp = $derived(
    (showingForm && feeling === 'help') ||
      (!showingForm &&
        (current?.guide.level === 'help' || current?.followups.some((f) => f.outcome === 'worse'))),
  );
  const outcomes: { id: Followup; label: string }[] = [
    { id: 'better', label: 'Feeling better' },
    { id: 'same', label: 'About the same' },
    { id: 'worse', label: 'Feeling worse' },
    { id: 'contacted', label: 'I contacted the crew' },
  ];
  onMount(() => {
    try {
      const raw = localStorage.getItem(`zenit-health-draft-${member.id}`);
      if (raw) {
        const draft = JSON.parse(raw);
        if (validHealthInput(draft)) {
          topic = draft.topic;
          feeling = draft.feeling;
          note = draft.note;
          eventId = draft.eventId ?? '';
          symptoms = draft.symptoms ?? [];
          activity = draft.activity ?? 'unspecified';
        }
      }
    } catch {
      storageWarning =
        'Draft storage is unavailable. Keep this page open until your check-in is saved.';
    }
    storageReady = true;
  });
  $effect(() => {
    const draft = feeling
      ? { topic, feeling, note, eventId: eventId || null, symptoms, activity }
      : null;
    if (storageReady)
      try {
        if (draft) localStorage.setItem(`zenit-health-draft-${member.id}`, JSON.stringify(draft));
        else localStorage.removeItem(`zenit-health-draft-${member.id}`);
      } catch {
        storageWarning = 'Draft is in this view only. Keep the page open until saved.';
      }
  });
  async function save() {
    if (!feeling) return;
    if (eventId && !event) {
      error = 'That captured moment is no longer available. Choose another evidence source.';
      return;
    }
    busy = true;
    error = '';
    const id = newId();
    const ok = await send({
      type: 'health-checkin',
      id,
      astronautId: member.id,
      input: $state.snapshot(input),
    });
    busy = false;
    if (ok) {
      selected = id;
      editing = false;
      reviewing = false;
      feeling = null;
      note = '';
      eventId = '';
      symptoms = [];
      activity = 'unspecified';
    } else error = 'Save not confirmed. Your draft is preserved. Reconnect and retry.';
  }
  async function step(index: number, completed: boolean) {
    busy = true;
    error = '';
    const ok = await send({
      type: 'health-step',
      id: newId(),
      astronautId: member.id,
      checkId: current!.id,
      step: index,
      completed,
    });
    busy = false;
    if (!ok) error = 'Step update not confirmed. Retry when connected.';
  }
  async function followup(outcome: Followup) {
    busy = true;
    error = '';
    const ok = await send({
      type: 'health-followup',
      id: newId(),
      astronautId: member.id,
      checkId: current!.id,
      outcome,
    });
    busy = false;
    if (!ok) error = 'Follow-up not confirmed. Retry when connected.';
  }
</script>

<section class="health-checkin" aria-labelledby="checkin-title">
  <div class="checkin-heading">
    <div>
      <h2 id="checkin-title">{showingForm ? 'How do you feel?' : 'Your saved check-in'}</h2>
      <p>
        {showingForm
          ? 'Your words add context. A check-in is shared only when you save it.'
          : 'Review your report and record what happened next.'}
      </p>
    </div>
    {#if current && !showingForm}<button
        class="crew-button secondary"
        onclick={() => {
          editing = true;
          reviewing = false;
          selected = null;
        }}>New check-in</button
      >{/if}
  </div>
  {#if needsHelp}<div class="checkin-help" role="alert">
      <strong>Contact a crewmate or the medical officer now.</strong>
      <p>
        Use your mission’s medical response procedure. This app does not call the crew or send a
        medical alert. Ask directly, even if the monitor link is unavailable.
      </p>
    </div>{/if}
  {#if showingForm}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        if (feeling) reviewing = true;
      }}
    >
      <fieldset class="checkin-topics">
        <legend>1 · What would you like to check?</legend
        >{#each Object.entries(healthTopics) as [key, value]}<button
            type="button"
            aria-pressed={topic === key}
            onclick={() => {
              topic = key as HealthTopic;
              reviewing = false;
            }}>{value.title}</button
          >{/each}
      </fieldset>
      <fieldset class="checkin-feelings">
        <legend>2 · {healthTopics[topic].prompt}</legend
        >{#each [{ id: 'usual', label: 'Feeling as usual' }, { id: 'changed', label: 'Something changed' }, { id: 'help', label: 'I need help now' }] as option}<label
            class:chosen={feeling === option.id}
            ><input
              type="radio"
              name="feeling"
              value={option.id}
              checked={feeling === option.id}
              onchange={() => {
                feeling = option.id as Feeling;
                reviewing = false;
              }}
              required
            />{option.label}</label
          >{/each}
      </fieldset>
      <fieldset class="checkin-symptoms">
        <legend>What do you notice? <span>Optional · tap all that apply</span></legend
        >{#each Object.entries(symptomOptions) as [key, label]}<button
            type="button"
            aria-label={label}
            aria-pressed={symptoms.includes(key as Symptom)}
            onclick={() => {
              symptoms = symptoms.includes(key as Symptom)
                ? symptoms.filter((s) => s !== key)
                : [...symptoms, key as Symptom];
              if (symptoms.length && feeling !== 'help') feeling = 'changed';
              reviewing = false;
            }}>{label}</button
          >{/each}
      </fieldset>
      <label class="checkin-activity"
        >When did you notice it?<select bind:value={activity}
          >{#each Object.entries(activityOptions) as [key, label]}<option value={key}
              >{label}</option
            >{/each}</select
        ></label
      >
      <div class="checkin-inputs">
        <label
          >What changed? <small>Optional · shared with the crew monitor when saved</small><textarea
            maxlength="500"
            rows="2"
            bind:value={note}
            placeholder="For example: I felt dizzy after the last activity."></textarea></label
        ><label
          >Attach readings without typing them<select bind:value={eventId}
            ><option value="">Latest primary-source reading at save time</option
            >{#each events.slice(0, 20) as captured}<option value={captured.id}
                >{captured.sourceType === 'spacesuit' ? 'Suit' : 'Ring'} · {clockLabel(
                  captured.occurredAt,
                )} · captured moment</option
              >{/each}</select
          ></label
        >
      </div>
      <p class="checkin-evidence">
        {evidence
          ? `${evidence.eventId ? 'Saved moment' : 'Available reading'}: ${evidence.source === 'spacesuit' ? 'suit' : 'ring'}, measured ${clockLabel(evidence.measuredAt)}.`
          : 'No primary-source reading available. You can still record how you feel.'} Telemetry is simulated.
      </p>
      <button class="crew-button" disabled={!feeling}>Understand my signals</button>
    </form>
  {/if}
  {#if (!showingForm && current) || (reviewing && feeling)}
    <div
      class="checkin-plan"
      class:plan-review={guide.level === 'review' || guide.level === 'help'}
      aria-live="polite"
    >
      <span class="crew-eyebrow"
        >{showingForm ? 'YOUR PREVIEW · NOT SHARED' : 'YOUR SAVED CHECK-IN'} / {shownTopic.title.toUpperCase()}</span
      >
      {#if guide.assessment}<HealthInterpretation
          assessment={guide.assessment}
          evidence={showingForm ? evidence : current!.evidence}
          saved={!showingForm}
        />{/if}
      <h3>What should I do next?</h3>
      <p class="checkin-action-title"><strong>{guide.title}</strong></p>
      <p>{guide.explanation}</p>
      <details class="crew-disclosure">
        <summary>Why this matters in space</summary>
        <div>
          <p>{guide.reason}</p>
          <a href={shownTopic.source} target="_blank" rel="noreferrer">{shownTopic.sourceTitle} ↗</a
          >
          <p>
            NASA resources explain the risk and countermeasure context. ZENIT’s routing and wording
            are educational demo rules, not a validated clinical protocol.
          </p>
        </div>
      </details>
      <h4>Next steps</h4>
      {#if showingForm}<ol>
          {#each guide.steps as instruction}<li>{instruction}</li>{/each}
        </ol>
      {:else}{#each guide.steps as instruction, i}<label class="checkin-step"
            ><input
              type="checkbox"
              checked={current!.completedSteps.includes(i)}
              disabled={!online || busy}
              onchange={(e) => step(i, e.currentTarget.checked)}
            /><span>{instruction}</span></label
          >{/each}{/if}
      <p class="checkin-treatment">
        For treatment decisions, use the mission-approved procedure with the crew medical officer.
        Ground consultation depends on communications. <a
          href={medicalOperationsSource}
          target="_blank"
          rel="noreferrer">NASA medical operations ↗</a
        >
      </p>
      {#if showingForm}<button class="crew-button" disabled={!online || busy} onclick={save}
          >{busy ? 'Waiting for confirmation…' : 'Save check-in & next steps'}</button
        >{#if !online}<p class="checkin-evidence">
            Guidance is available locally. Your draft has not reached the crew monitor. Reconnect to
            save.
          </p>{/if}
      {:else}
        <p class="checkin-evidence">
          Saved {clockLabel(current!.createdAt)} · {current!.evidence
            ? `Evidence measured ${clockLabel(current!.evidence.measuredAt)} from ${current!.evidence.source}.`
            : 'No sensor evidence attached.'} Saved does not mean medically reviewed.
        </p>
        {#if current!.input.note}<blockquote>{current!.input.note}</blockquote>{/if}
        <fieldset class="checkin-followup">
          <legend>3 · How did things change?</legend>{#each outcomes as outcome}<button
              class="crew-button secondary"
              disabled={!online || busy}
              onclick={() => followup(outcome.id)}>{outcome.label}</button
            >{/each}
        </fieldset>
        {#if latestFollowup}<p class="checkin-followup-note" role="status">
            {outcomes.find((o) => o.id === latestFollowup.outcome)?.label} · {clockLabel(
              latestFollowup.createdAt,
            )}. This is your report, not medical clearance.
          </p>{/if}
        {#if current!.followups.length > 1}<details class="crew-disclosure">
            <summary>Previous follow-ups</summary>
            <div>
              {#each current!.followups as follow}<p>
                  {clockLabel(follow.createdAt)} · {outcomes.find((o) => o.id === follow.outcome)
                    ?.label}
                </p>{/each}
            </div>
          </details>{/if}
      {/if}
    </div>
  {/if}
  {#if member.healthChecks.length > 1}<label class="checkin-history"
      >Previous check-ins<select
        value={current?.id ?? ''}
        onchange={(e) => {
          selected = e.currentTarget.value;
          editing = false;
          reviewing = false;
        }}
        >{#each [...member.healthChecks].reverse() as check}<option value={check.id}
            >{new Date(check.createdAt).toISOString().slice(0, 10)} · {clockLabel(check.createdAt)} ·
            {healthTopics[check.input.topic].title}</option
          >{/each}</select
      ></label
    >{/if}
  {#if error}<p class="crew-error" role="alert">{error}</p>{/if}{#if storageWarning}<p
      class="checkin-evidence"
    >
      {storageWarning}
    </p>{/if}
  <p class="checkin-scope">
    Self-assessment & educational guidance · no diagnosis, medication selection or task clearance.
  </p>
</section>
