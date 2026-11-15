import type { CrewMember, SourceType, Sample, SuitSample } from './types';
import { activeSource, validSuitMetrics } from './suit';
import { freshness, validMetrics } from './model';

export const researchSource = 'https://ntrs.nasa.gov/citations/20240000754';
export const automaticSources = {
  exercise: {
    title: 'NASA · Exercise and human health',
    context: 'NASA describes exercise as a countermeasure for the effects of altered gravity.',
    relevance:
      'This is why ZENIT asks about activity when pulse changes. It does not prove that exercise caused this change.',
    url: 'https://www.nasa.gov/reference/fundamentals-of-human-health/',
  },
  suit: {
    title: 'NASA · Suited atmosphere, §11.3',
    context: 'NASA calls for recording and displaying suit pressure, oxygen and carbon dioxide.',
    relevance:
      'This supports showing the suit environment alongside your health readings. ZENIT does not apply certified suit limits.',
    url: 'https://www.nasa.gov/reference/11-0-spacesuits-vol-2/',
  },
  medical: {
    title: 'NASA · Medical operations',
    context:
      'NASA medical operations includes health monitoring, clinical support and crew medical communication.',
    relevance:
      'This supports reviewing symptoms and unexplained changes with the crew. It does not validate this demo’s interpretation.',
    url: 'https://www.nasa.gov/reference/6-0-medical-operations/',
  },
} as const;
export type AutomaticAnswer =
  'resting' | 'finished' | 'active' | 'unwell' | 'check-fit' | 'alert' | 'no-alert';
export type AutomaticObservation = {
  metric: string;
  label: string;
  unit: string;
  earlier: number;
  recent: number;
  delta: number;
  triggered: boolean;
};
export type AutomaticAssessment = {
  id: string;
  state: 'unavailable' | 'collecting' | 'observing' | 'review';
  kind: 'no-data' | 'no-pattern' | 'pulse-rise' | 'multi-signal' | 'suit-change';
  source: SourceType;
  measuredAt: number | null;
  count: number;
  from: number | null;
  title: string;
  explanation: string;
  nextStep: string;
  observations: AutomaticObservation[];
  question: 'activity' | 'measurement' | 'suit' | null;
  sourceId: keyof typeof automaticSources;
};
// Presentation triggers for synthetic scenarios, not clinical thresholds.
const ringRules = [
  { metric: 'pulse', label: 'Heart rate', unit: 'bpm', change: 20, direction: 1 },
  { metric: 'respiration', label: 'Breathing rate', unit: '/min', change: 4, direction: 1 },
  { metric: 'spo2', label: 'SpO₂', unit: '%', change: 2, direction: -1 },
  { metric: 'skin', label: 'Skin temperature change', unit: '°C', change: 0.4, direction: 1 },
];
const suitRules = [
  ringRules[0],
  { metric: 'ppCO2', label: 'Suit CO₂ partial pressure', unit: 'kPa', change: 0.15, direction: 1 },
  { metric: 'ppO2', label: 'Suit O₂ partial pressure', unit: 'kPa', change: 1, direction: 0 },
  { metric: 'pressure', label: 'Suit pressure', unit: 'kPa', change: 0.5, direction: 0 },
  { metric: 'temperature', label: 'Suit air temperature', unit: '°C', change: 2, direction: 0 },
];
const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b),
    mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
export function analyzeSignals(
  member: CrewMember,
  now: number,
  online = true,
): AutomaticAssessment {
  const source = activeSource(member),
    latest = source.latest,
    phaseStart = member.phaseHistory.at(-1)?.changedAt ?? 0;
  const result: AutomaticAssessment = {
    id: `${member.id}:${source.deviceId}:${member.phase}:${phaseStart}`,
    state: 'unavailable',
    kind: 'no-data',
    source: source.type,
    measuredAt: latest?.measuredAt ?? null,
    count: 0,
    from: null,
    title: 'Waiting for reliable readings',
    explanation:
      'The active source is missing, disconnected or stale. No current interpretation is available.',
    nextStep:
      'Check the source connection. Report symptoms or ask the crew for help regardless of the readings.',
    observations: [],
    question: null,
    sourceId: 'medical',
  };
  if (
    !online ||
    !latest ||
    latest.deviceId !== source.deviceId ||
    latest.measuredAt < phaseStart ||
    latest.measuredAt > now ||
    latest.receivedAt > now ||
    freshness(source.connected, latest.measuredAt, source.intervalMs, now) !== 'live' ||
    freshness(source.connected, latest.receivedAt, source.intervalMs, now) !== 'live'
  )
    return result;
  const history: (Sample | SuitSample)[] =
    source.type === 'ring' ? member.samples : member.suit.samples;
  const all = history
    .filter(
      (s) =>
        s.deviceId === source.deviceId &&
        s.astronautId === member.id &&
        s.measuredAt >= Math.max(phaseStart, now - 300000) &&
        s.measuredAt <= latest.measuredAt &&
        s.receivedAt <= now &&
        (source.type === 'ring' ? validMetrics(s.values) : validSuitMetrics(s.values)),
    )
    .sort((a, b) => a.measuredAt - b.measuredAt);
  // Only the last uninterrupted segment, with unique measurement times, is comparable.
  const samples: (Sample | SuitSample)[] = [];
  for (const s of all) {
    const prior = samples.at(-1);
    if (prior && s.measuredAt === prior.measuredAt) continue;
    if (prior && s.measuredAt - prior.measuredAt > Math.max(9000, source.intervalMs * 2.5))
      samples.length = 0;
    samples.push(s);
  }
  result.count = samples.length;
  result.from = samples[0]?.measuredAt ?? null;
  if (samples.length < 9 || samples.at(-1)?.measuredAt !== latest.measuredAt)
    return {
      ...result,
      state: 'collecting',
      title: 'Learning this stretch of signals',
      explanation: `${samples.length} comparable readings received. Nine are needed to separate a persistent change from a single spike.`,
      nextStep:
        'Keep the active simulator connected. You can still report how you feel at any time.',
    };
  const before = samples.slice(0, 6),
    recent = samples.slice(-3),
    rules = source.type === 'ring' ? ringRules : suitRules;
  result.observations = rules.map((rule) => {
    const get = (s: Sample | SuitSample) =>
      (s.values as unknown as Record<string, number>)[rule.metric];
    const earlier = median(before.map(get)),
      value = median(recent.map(get)),
      delta = value - earlier;
    const direction = rule.direction || Math.sign(delta);
    return {
      metric: rule.metric,
      label: rule.label,
      unit: rule.unit,
      earlier,
      recent: value,
      delta,
      triggered: recent.every((s) => (get(s) - earlier) * direction >= rule.change),
    };
  });
  const changed = result.observations.filter((o) => o.triggered),
    environment = source.type === 'spacesuit' && changed.some((o) => o.metric !== 'pulse');
  const kind = environment
    ? 'suit-change'
    : changed.length > 1
      ? 'multi-signal'
      : changed.some((o) => o.metric === 'pulse')
        ? 'pulse-rise'
        : changed.length
          ? 'multi-signal'
          : 'no-pattern';
  return {
    ...result,
    id: `${result.id}:${result.from}:${kind}`,
    state: changed.length ? 'review' : 'observing',
    kind,
    title:
      kind === 'suit-change'
        ? 'Suit conditions have changed'
        : kind === 'pulse-rise'
          ? 'Your heart rate has stayed higher'
          : kind === 'multi-signal'
            ? 'Several readings deserve a closer look'
            : 'Watching your signals',
    explanation: changed.length
      ? 'The change persisted across three readings compared with six earlier readings from this device and phase. These are demo triggers, not a diagnosis.'
      : 'No persistent change matches the current demo rules. This does not establish good health or readiness for a task.',
    nextStep: changed.length
      ? 'Add the missing context below. If you feel unwell, contact the crew medical officer.'
      : 'Continue your mission health routine. Report any symptoms even when there is no detected pattern.',
    question:
      kind === 'suit-change'
        ? 'suit'
        : kind === 'pulse-rise'
          ? 'activity'
          : kind === 'multi-signal'
            ? 'measurement'
            : null,
    sourceId: environment ? 'suit' : kind === 'pulse-rise' ? 'exercise' : 'medical',
  };
}
export function contextualize(assessment: AutomaticAssessment, answer: AutomaticAnswer | null) {
  if (answer === 'unwell' || answer === 'alert')
    return {
      explanation:
        answer === 'unwell'
          ? 'You reported feeling unwell. The observed signals cannot establish the cause.'
          : 'You reported a suit alert. This app cannot determine whether the suit is safe.',
      nextStep:
        'Contact the crew directly and follow the applicable mission medical or suit procedure. This app does not send an emergency alert.',
      help: true,
    };
  if (answer === 'resting')
    return {
      explanation:
        'No recent exercise was reported. The pulse change remains unexplained by the available context.',
      nextStep:
        'Share a persistent or unexplained change with the crew medical officer, including its timing and any symptoms. Use the measurement procedure to verify the reading when appropriate.',
      help: false,
    };
  if (answer === 'finished')
    return {
      explanation:
        'Recent exercise may contribute to the heart-rate change. Recovery timing and symptoms still need confirmation.',
      nextStep:
        'Keep the activity time with this record and observe the recovery trend during the planned rest period. Raise persistent or unexplained changes with the crew.',
      help: false,
    };
  if (answer === 'active')
    return {
      explanation:
        'Current activity may contribute to the higher heart rate. These readings do not measure exertion safety.',
      nextStep:
        'Follow your assigned workload and monitoring procedure. Check the trend again after activity and report any symptoms.',
      help: false,
    };
  if (answer === 'check-fit')
    return {
      explanation:
        'Measurement quality may contribute to an unexpected pattern. It has not been established as the cause.',
      nextStep:
        'Check the sensor using its instructions and repeat the measurement if appropriate. Do not dismiss symptoms while checking the sensor.',
      help: false,
    };
  if (answer === 'no-alert')
    return {
      explanation:
        'You reported no suit alert. The atmospheric change still needs context; absence of an alert does not establish safety.',
      nextStep:
        'Review the suit’s own readings and applicable mission procedure with the crew. These are environmental measurements, not blood oxygen or body temperature.',
      help: false,
    };
  return { explanation: assessment.explanation, nextStep: assessment.nextStep, help: false };
}
