import { analyzeSignals } from './automatic';
import type { CrewMember } from './types';

export const nasaRisksUrl = 'https://www.nasa.gov/hrp/risks/';
export type SpaceRisk = {
  id: string;
  title: string;
  meaning: string;
  missing: string;
  action: string;
  url: string;
};
const nasa = (slug: string) => `https://www.nasa.gov/reference/${slug}/`;
export const spaceRisks: SpaceRisk[] = [
  {
    id: 'sleep',
    title: 'Sleep & irregular schedules',
    meaning:
      'Spaceflight can disrupt sleep and daily schedules. NASA studies how sleep loss and workload affect crew performance.',
    missing: 'Pulse and HRV do not measure sleep duration or tell us how alert you feel.',
    action:
      'Record your sleep and alertness, and review changes to your assigned rest schedule with the crew.',
    url: nasa('risk-from-inadequate-sleep-and-irregular-schedules'),
  },
  {
    id: 'cardiovascular',
    title: 'Heart & circulation',
    meaning:
      'The heart and circulation adapt to weightlessness. Following activity and recovery gives measurements useful context.',
    missing:
      'A pulse change alone cannot establish a cardiovascular condition or fitness for a task.',
    action:
      'Record your activity and how you feel alongside the trend. Share persistent unexplained changes with the crew.',
    url: nasa('risk-of-cardiovascular-adaptations'),
  },
  {
    id: 'nutrition',
    title: 'Food & nutrition',
    meaning: 'Adequate nutrition supports crew health and performance during long missions.',
    missing: 'Ring and suit readings cannot establish your nutritional status or hydration.',
    action:
      'Record changes in meals, appetite or drinking, and discuss difficulties following the mission food plan.',
    url: nasa('risk-of-inadequate-food-and-nutrition'),
  },
  {
    id: 'wellbeing',
    title: 'Mental wellbeing',
    meaning:
      'Isolation and mission demands can affect wellbeing. NASA studies behavioral health during spaceflight.',
    missing: 'A sensor cannot tell us your mood or diagnose a mental-health condition.',
    action: 'Describe how you feel and arrange a check-in using your mission’s support options.',
    url: nasa('risk-of-behavioral-changes-and-psychiatric-disorders'),
  },
  {
    id: 'eva',
    title: 'Working in a spacesuit',
    meaning:
      'Spacewalks involve workload, injury and atmosphere-related risks. The suit environment is part of the context.',
    missing:
      'Suit oxygen and CO₂ are environmental measurements, not blood measurements or a safety clearance.',
    action:
      'Review the suit display and any alerts with your crew using the assigned mission procedures.',
    url: nasa('risk-of-injury-and-compromised-performance-from-extravehicular-activity-eva'),
  },
  {
    id: 'radiation',
    title: 'Space radiation',
    meaning:
      'Radiation exposure is a long-term health concern. Monitoring helps researchers understand exposure and protective measures.',
    missing:
      'ZENIT’s ring does not measure radiation. Environmental readings are not automatically your personal dose.',
    action:
      'Keep the instrument, location and observation period with every radiation record for crew review.',
    url: nasaRisksUrl,
  },
  {
    id: 'fitness',
    title: 'Physical conditioning',
    meaning: 'NASA studies exercise to maintain heart, muscle and bone function in space.',
    missing: 'ZENIT does not measure muscle strength or certify exercise readiness.',
    action:
      'Record your activity and changes in how it feels when reviewing your assigned exercise plan.',
    url: nasaRisksUrl,
  },
  {
    id: 'bones',
    title: 'Bone changes',
    meaning: 'Reduced gravitational loading can affect bone strength during spaceflight.',
    missing: 'Bone density is not measured by this app.',
    action:
      'Use the mission’s scheduled assessments and exercise plan; report concerns to the crew.',
    url: nasaRisksUrl,
  },
  {
    id: 'vision',
    title: 'Eyes & vision',
    meaning: 'NASA studies changes to the eyes and brain associated with spaceflight.',
    missing:
      'ZENIT cannot examine your eyes or detect spaceflight-associated neuro-ocular syndrome.',
    action: 'Record any vision changes and discuss them with the crew medical officer.',
    url: nasaRisksUrl,
  },
  {
    id: 'immune',
    title: 'Immune responses',
    meaning:
      'Spaceflight can alter immune responses. NASA studies these changes to improve crew health protection.',
    missing: 'Pulse and skin-temperature deviation do not measure immune function.',
    action: 'Report new symptoms and follow your mission’s health monitoring schedule.',
    url: nasaRisksUrl,
  },
  {
    id: 'balance',
    title: 'Balance & coordination',
    meaning: 'Changes in gravity can affect balance and coordination.',
    missing: 'This app does not test vestibular function or coordination.',
    action: 'Report dizziness or coordination changes before activities that depend on balance.',
    url: nasaRisksUrl,
  },
  {
    id: 'decompression',
    title: 'Pressure transitions',
    meaning: 'Moving between spacecraft and spacesuit pressures involves decompression risks.',
    missing: 'A suit pressure value alone cannot establish that a transition is safe.',
    action: 'Use the mission’s pressure-transition procedures with your crew.',
    url: nasaRisksUrl,
  },
  {
    id: 'microbes',
    title: 'Microbes & the body',
    meaning:
      'NASA investigates how spaceflight changes interactions between people and microorganisms.',
    missing: 'ZENIT does not test microbes or diagnose infection.',
    action: 'Keep symptom records and follow the mission’s hygiene and health procedures.',
    url: nasaRisksUrl,
  },
  {
    id: 'hypoxia',
    title: 'Oxygen availability',
    meaning: 'NASA studies the risk of inadequate tissue oxygen in spaceflight operations.',
    missing: 'Suit oxygen pressure is not tissue oxygen; this app cannot diagnose hypoxia.',
    action:
      'Report symptoms or suit alerts and follow crew procedures without relying on this display for clearance.',
    url: nasaRisksUrl,
  },
  {
    id: 'teamwork',
    title: 'Teamwork',
    meaning: 'Communication and teamwork matter during prolonged isolation.',
    missing: 'Wearable measurements do not assess team relationships.',
    action: 'Raise communication difficulties during crew check-ins.',
    url: nasaRisksUrl,
  },
  {
    id: 'operations',
    title: 'Operational support',
    meaning:
      'Distant crews need information and training to handle unexpected operational problems.',
    missing: 'ZENIT is not an operational procedure library.',
    action: 'Use approved mission instructions and ask the crew when a procedure is unclear.',
    url: nasaRisksUrl,
  },
  {
    id: 'loads',
    title: 'Landing & dynamic loads',
    meaning: 'NASA studies injuries associated with forces during landing.',
    missing: 'ZENIT does not measure these forces or assess injuries.',
    action: 'Report concerns through the mission’s medical assessment process.',
    url: nasaRisksUrl,
  },
];

/** Educational relevance only. No personal risk score or mutation of stored guidance. */
export function riskContext(
  member: CrewMember,
  online: boolean,
  now: number,
): { risk: string | null; reason: string; help: boolean } {
  const checks = member.healthChecks
    .filter((c) => c.createdAt <= now)
    .toSorted((a, b) => b.createdAt - a.createdAt);
  const unresolved = checks.find(
    (c) =>
      !c.followups.some((f) => f.outcome === 'contacted') &&
      (c.guide.level === 'help' || c.followups.at(-1)?.outcome === 'worse'),
  );
  const recent = checks.find((c) => now - c.createdAt <= 86400000);
  const check = unresolved ?? recent;
  if (check) {
    const topic = {
      recovery: 'cardiovascular',
      fatigue: 'sleep',
      wellbeing: 'wellbeing',
      nutrition: 'nutrition',
    }[check.input.topic];
    const symptoms = check.input.symptoms ?? [];
    return {
      risk: symptoms.includes('tired') || symptoms.includes('focus') ? 'sleep' : topic,
      reason: `Related to your saved check-in from ${new Date(check.createdAt).toISOString().slice(0, 16).replace('T', ' ')} UTC. This is background information, not an assessment of your current condition.`,
      help: !!unresolved,
    };
  }
  const assessment = analyzeSignals(member, now, online);
  if (member.phase === 'spacewalk')
    return {
      risk: 'eva',
      reason:
        'Related to your selected Spacewalk phase. This does not establish your suit’s condition.',
      help: false,
    };
  if (assessment.state === 'review' && assessment.kind === 'pulse-rise')
    return {
      risk: 'cardiovascular',
      reason:
        'Background for the current pulse comparison. A change does not establish a cardiovascular problem.',
      help: false,
    };
  return {
    risk: null,
    reason:
      'Explore why health is monitored in space. Choose a topic; these are educational risks, not detected conditions.',
    help: false,
  };
}

export type GuidedScenario = 'archer' | 'radin2';
export type LearningAnswer = 'schedule' | 'unsure' | 'unwell' | null;
export type LearningStep = {
  title: string;
  period: string;
  readings: { label: string; value: string; source: string; amount?: number; unit?: string }[];
  observation: string;
  meaning: string;
  missing: string;
  action: string;
};
export type GuidedContent = {
  title: string;
  intro: string;
  disclosure: string;
  risk: string;
  source: { title: string; url: string; relevance: string };
  steps: LearningStep[];
};
export const guidedScenarios: Record<GuidedScenario, GuidedContent> = {
  archer: {
    title: 'Sleep, activity & wellbeing',
    intro:
      'Follow a fictional astronaut across three demo days. ARCHeR studies activity, sleep and wellbeing using actigraphy and surveys.',
    disclosure:
      'Synthetic records inspired by ARCHeR. These are not Artemis crew measurements. ZENIT’s ring does not measure sleep.',
    risk: 'sleep',
    source: {
      title: 'NASA · ARCHeR',
      url: 'https://www.nasa.gov/reference/archer/',
      relevance:
        'Supports the choice of sleep, activity and wellbeing as topics. The numbers and story below were created for this demo.',
    },
    steps: [
      {
        title: 'Start with context',
        period: 'Demo day 1',
        readings: [
          {
            label: 'Sleep',
            value: '7.5 h',
            amount: 7.5,
            unit: 'h',
            source: 'Synthetic sleep diary',
          },
          {
            label: 'Activity',
            value: '30 min',
            amount: 30,
            unit: 'min',
            source: 'Synthetic activity sensor',
          },
          { label: 'Attention', value: 'As usual', source: 'Synthetic self-report' },
        ],
        observation:
          'The diary, activity record and self-report describe different parts of the same day.',
        meaning:
          'Together they give a clearer picture than a pulse reading alone. One day is not an established personal baseline.',
        missing: 'We do not know sleep quality, workload or the astronaut’s longer-term pattern.',
        action: 'Compare the next day and keep reported feelings alongside measurements.',
      },
      {
        title: 'A shorter night',
        period: 'Demo day 2',
        readings: [
          {
            label: 'Sleep',
            value: '5.5 h',
            amount: 5.5,
            unit: 'h',
            source: 'Synthetic sleep diary',
          },
          {
            label: 'Activity',
            value: '30 min',
            amount: 30,
            unit: 'min',
            source: 'Synthetic activity sensor',
          },
          { label: 'Attention', value: 'Harder to concentrate', source: 'Synthetic self-report' },
        ],
        observation:
          'Reported sleep is 2 hours shorter than day 1. Activity duration is unchanged; concentration feels different.',
        meaning:
          'This is a reason to ask about sleep and workload. It does not prove what caused the reported concentration change.',
        missing: 'We have not established why sleep changed or whether other symptoms are present.',
        action: 'Add context below, then review the assigned rest schedule with the crew.',
      },
      {
        title: 'Follow up with new evidence',
        period: 'Demo day 3',
        readings: [
          { label: 'Sleep', value: '7 h', amount: 7, unit: 'h', source: 'Synthetic sleep diary' },
          {
            label: 'Activity',
            value: '25 min',
            amount: 25,
            unit: 'min',
            source: 'Synthetic activity sensor',
          },
          { label: 'Attention', value: 'Follow-up needed', source: 'Ask the astronaut' },
        ],
        observation:
          'The new diary shows 1.5 hours more sleep than day 2. We still need to ask how the astronaut feels.',
        meaning: 'A longer night does not prove recovery or show that a particular action worked.',
        missing: 'The follow-up report and broader context are still missing.',
        action:
          'Record whether you feel better, the same or worse, and share persistent concerns with your crew.',
      },
    ],
  },
  radin2: {
    title: 'Radiation monitoring',
    intro:
      'David Saint-Jacques participated in Radi-N2 on the ISS. Explore a fictional example of the experiment: six station locations, a personal detector and a sleeping-quarter detector left for one week.',
    disclosure:
      'Inspired by Radi-N2 · Not David Saint-Jacques’s measurements. All bubble counts below are synthetic.',
    risk: 'radiation',
    source: {
      title: 'CSA · Radi-N2',
      url: 'https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp',
      relevance:
        'Describes the eight-detector, seven-day method and David’s participation. This demo illustrates three of those detector placements.',
    },
    steps: [
      {
        title: 'Place and identify the detectors',
        period: 'Demo day 1 · Start of 7-day collection',
        readings: [
          {
            label: 'Station location',
            value: '0 bubbles',
            amount: 0,
            unit: 'bubbles',
            source: 'Synthetic initial reader count',
          },
          {
            label: 'Sleeping quarters',
            value: '0 bubbles',
            amount: 0,
            unit: 'bubbles',
            source: 'Synthetic initial reader count',
          },
          {
            label: 'Personal detector',
            value: '0 bubbles',
            amount: 0,
            unit: 'bubbles',
            source: 'Synthetic initial reader count',
          },
        ],
        observation:
          'Record the initial counts and place each detector. The personal detector and location detectors represent different observations.',
        meaning:
          'Bubble detectors record neutron interactions over an observation period. This is not a continuous vital-sign stream.',
        missing:
          'There is no completed exposure interval yet. Zero initial bubbles is not a statement about environmental safety.',
        action: 'Keep detector identity, placement and collection times together.',
      },
      {
        title: 'Collect after one week',
        period: 'End of 7-day collection',
        readings: [
          {
            label: 'Station location',
            value: '24 bubbles',
            amount: 24,
            unit: 'bubbles',
            source: 'Synthetic final reader count',
          },
          {
            label: 'Sleeping quarters',
            value: '15 bubbles',
            amount: 15,
            unit: 'bubbles',
            source: 'Synthetic final reader count',
          },
          {
            label: 'Personal detector',
            value: '21 bubbles',
            amount: 21,
            unit: 'bubbles',
            source: 'Synthetic final reader count',
          },
        ],
        observation:
          'The three example detectors show different counts over the same seven-day interval.',
        meaning:
          'For this exercise we assume comparable detectors and equal collection periods. The differences prompt a review of placement and measurement conditions.',
        missing:
          'Counts alone do not give a dose or determine health effects. Detector calibration is required.',
        action: 'Check the records and share the counts with the crew for analysis.',
      },
      {
        title: 'Explain the comparison',
        period: 'Review of the same 7-day collection',
        readings: [
          {
            label: 'Station location',
            value: '24 bubbles',
            amount: 24,
            unit: 'bubbles',
            source: 'Same synthetic record',
          },
          {
            label: 'Sleeping quarters',
            value: '15 bubbles',
            amount: 15,
            unit: 'bubbles',
            source: 'Same synthetic record',
          },
          {
            label: 'Personal detector',
            value: '21 bubbles',
            amount: 21,
            unit: 'bubbles',
            source: 'Same synthetic record',
          },
        ],
        observation:
          'The sleeping-quarter detector has 9 fewer bubbles than the station-location detector in this invented example.',
        meaning:
          'Monitoring helps study differences between locations. A location reading is not interchangeable with a personal measurement.',
        missing:
          'This exercise cannot identify a safe location, predict symptoms or calculate an individual cancer risk.',
        action:
          'Preserve each detector’s own record. Do not add their counts together as a personal exposure.',
      },
    ],
  },
};
export function learningResponse(
  scenario: GuidedScenario,
  answer: LearningAnswer,
  completed: boolean,
): string {
  if (answer === 'unwell')
    return 'Contact your crew directly if you feel unwell and follow the mission medical procedure. This practice response sends no message or emergency alert.';
  if (scenario === 'radin2')
    return 'Bubble counts need detector calibration before they can be converted to dose. No dose or safe limit is calculated here.';
  if (answer === 'schedule')
    return completed
      ? 'You marked the schedule review as practiced. Ask how the astronaut feels next; this does not establish recovery.'
      : 'An altered schedule may help explain the shorter night, but it does not establish the cause of the concentration change. Review the assigned rest schedule with the crew.';
  return 'Record when the change began and any changes to your schedule or workload. The available records do not establish a cause.';
}
