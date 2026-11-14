<script lang="ts">
  import type { HealthAssessment, HealthEvidence } from '$lib/crew/health';
  import { clockLabel } from '$lib/crew/model';
  let { assessment, evidence, saved=false }: {assessment:HealthAssessment;evidence:HealthEvidence|null;saved?:boolean}=$props();
</script>

<section class="health-interpretation" aria-label="Health interpretation">
  <div class="interpretation-heading"><span class="crew-eyebrow">{saved?'INTERPRETATION AT SAVE TIME':'YOUR ASSESSMENT PREVIEW'}</span><span class="interpretation-status">{assessment.status==='current'?(saved?'Current at save time':'Current source reading'):assessment.status==='historical'?'Historical / unverified reading':'Self-report only'}</span></div>
  <h3>What might be happening?</h3>
  <p class="interpretation-headline">{assessment.headline}</p>
  <p class="interpretation-intro">Possible contributors to discuss, not a diagnosis or a ranked list of diseases.</p>
  <div class="interpretation-evidence">
    <h4>What we know</h4>
    <ul>{#each assessment.facts as fact}<li>{fact}</li>{/each}</ul>
    {#if evidence}<p class="interpretation-time">Simulated {evidence.source==='spacesuit'?'suit':'ring'} · {new Date(evidence.measuredAt).toISOString().slice(0,10)} · measured {clockLabel(evidence.measuredAt)}{evidence.eventId?' · captured moment':''}</p>{/if}
    {#if assessment.comparison}
      <div class="interpretation-comparison"><strong>{assessment.comparison.delta>=0?'+':''}{assessment.comparison.delta.toFixed(0)} <small>bpm</small></strong><p>Compared with your recent median of {assessment.comparison.reference.toFixed(0)} bpm.<span>{assessment.comparison.count} earlier readings · {clockLabel(assessment.comparison.from)}–{clockLabel(assessment.comparison.to)} · same device and mission phase. This is not a clinical baseline or risk score.</span></p></div>
    {/if}
  </div>
  <div class="interpretation-possibilities">{#each assessment.possibilities as possibility}<article><h4>{possibility.title}</h4><p><strong>Why it is relevant</strong>{possibility.support}</p><p><strong>Still unknown</strong>{possibility.unknown}</p><a href={possibility.source} target="_blank" rel="noreferrer">{possibility.sourceTitle} ↗</a></article>{/each}</div>
  <details class="crew-disclosure"><summary>What these data cannot tell us</summary><div><ul>{#each assessment.missing as item}<li>{item}</li>{/each}</ul><p>Historical NASA radiation data are environmental context, not your personal dose or an explanation for these symptoms. NASA references support the background; ZENIT’s interpretation rules are authored for this demonstration.</p></div></details>
</section>
