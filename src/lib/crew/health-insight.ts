import { automaticSources, type AutomaticAnswer, type AutomaticAssessment } from './automatic';

/** Plain-language presentation only. Detection and clinical decisions are unchanged. */
export function healthInsight(assessment: AutomaticAssessment, answer: AutomaticAnswer | null) {
  const help = answer === 'unwell' || answer === 'alert';
  const changed = assessment.observations.filter((o) => o.triggered);
  const sourceId =
    answer === 'alert' || assessment.kind === 'suit-change'
      ? 'suit'
      : help
        ? 'medical'
        : assessment.sourceId;
  const base = {
    headline: assessment.title,
    meaning: '',
    unknown: '',
    action: '',
    sourceId,
    nasa: automaticSources[sourceId],
    evidence: changed.slice(0, 2),
    moreChanges: Math.max(0, changed.length - 2),
    help,
  };
  if (help)
    return {
      ...base,
      headline:
        answer === 'unwell'
          ? 'How you feel needs attention'
          : 'Check the suit alert with your crew',
      meaning:
        answer === 'unwell'
          ? 'You said you feel unwell. Your symptoms matter even if the readings look unchanged.'
          : 'You reported a suit alert. This app cannot assess whether the suit is safe.',
      unknown: 'The cause cannot be determined from this app.',
      action:
        'Contact your crew now and follow the mission medical or suit procedure. No emergency message has been sent by this answer.',
    };
  if (assessment.state === 'unavailable')
    return {
      ...base,
      headline: 'Current readings are unavailable',
      meaning:
        'The active sensor has no fresh readings to compare. Last known numbers cannot tell us what is happening now.',
      unknown: 'Your current condition cannot be assessed from old or missing readings.',
      action:
        'Reconnect the active sensor. If you feel unwell, contact the crew without waiting for new data.',
    };
  if (assessment.state === 'collecting')
    return {
      ...base,
      headline: 'Getting enough readings to compare',
      meaning: `${assessment.count} of 9 readings received for this comparison. A single reading cannot show a sustained change.`,
      unknown: 'There is not enough continuous data to explain a trend yet.',
      action: 'Keep the active sensor connected. You can report symptoms at any time.',
    };
  if (assessment.state === 'observing')
    return {
      ...base,
      headline: 'No sustained change detected',
      meaning:
        'The recent readings do not match this demo’s change rules. That does not rule out a health problem.',
      unknown: 'The sensors cannot tell us how you feel.',
      action:
        'Continue your scheduled health checks. Report symptoms even if the numbers look unchanged.',
    };
  if (assessment.kind === 'suit-change')
    return {
      ...base,
      headline: 'Your suit environment has changed',
      meaning:
        answer === 'no-alert'
          ? 'You reported no suit alert, but the environmental change still needs review. These values describe the suit, not your blood oxygen or body temperature.'
          : 'The air conditions inside your suit have changed. Check the suit’s own display and tell us whether it shows an alert.',
      unknown: 'These simulated changes do not establish a fault or a safe operating condition.',
      action: 'Review the suit display and the relevant mission procedure with your crew.',
    };
  if (answer === 'finished')
    return {
      ...base,
      headline: 'Recent exercise may explain the rise',
      meaning:
        'You said you just finished exercising. That may explain the higher pulse, but recovery still needs follow-up.',
      unknown: 'We do not know when you finished or how you feel.',
      action:
        'Record when you finished and how you feel. Check the trend during your planned rest period; share persistent changes with the crew.',
    };
  if (answer === 'active')
    return {
      ...base,
      headline: 'Activity may be contributing',
      meaning:
        'You said you are still active. Activity may contribute to the change; the readings do not tell us whether the workload is safe.',
      unknown: 'Your effort level and symptoms are not measured by this comparison.',
      action:
        'Follow your assigned activity procedure. Check the trend after activity and report symptoms.',
    };
  if (answer === 'resting')
    return {
      ...base,
      headline: 'The pulse rise is still unexplained',
      meaning: 'You reported no recent exercise, so we cannot use it to explain the higher pulse.',
      unknown: 'The sensor readings alone cannot identify the cause.',
      action:
        'Tell the crew medical officer about a persistent change. Include when it began and any symptoms.',
    };
  if (answer === 'check-fit')
    return {
      ...base,
      headline: 'Check the reading before interpreting it',
      meaning:
        'Sensor contact may affect a reading. A fit problem has not been confirmed as the cause.',
      unknown: 'We do not know whether this is a measurement issue or a change in your body.',
      action:
        'Follow the sensor’s fitting instructions and repeat the measurement. Report symptoms while checking.',
    };
  return {
    ...base,
    headline:
      assessment.kind === 'pulse-rise'
        ? 'Your pulse is staying higher'
        : changed.length > 1
          ? 'More than one reading changed'
          : 'A reading needs another look',
    meaning:
      assessment.kind === 'pulse-rise'
        ? 'Your pulse is higher than earlier in this session. Activity could contribute, but you have not confirmed any exercise yet.'
        : 'These changes need context before they can be interpreted. Activity and measurement quality are possible contributors, not confirmed causes.',
    unknown: 'These readings do not identify a diagnosis or tell us how you feel.',
    action: 'Choose the context that fits. If you feel unwell, tell the crew.',
  };
}
export function observationValue(metric: string, value: number) {
  return value.toFixed(
    ['ppO2', 'ppCO2', 'pressure'].includes(metric)
      ? 2
      : ['skin', 'spo2', 'temperature'].includes(metric)
        ? 1
        : 0,
  );
}
