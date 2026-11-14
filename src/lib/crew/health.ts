import type { CrewEvent, CrewMember, Metrics, Phase, SourceType, SuitMetrics } from './types';
import { activeSource } from './suit';
import { freshness, outsideDemo } from './model';

export const healthTopics = {
  recovery: { title: 'Activity & recovery', prompt: 'How do you feel after your recent activity?', why: 'Altered gravity affects muscles, bones and cardiovascular function. Exercise is a mission countermeasure; a heart-rate reading alone cannot assess recovery.', measure: 'Keep the activity context with the reading. If you are in a suitable rest period, repeat the measurement using the device instructions. During EVA, use the suit source and crew procedures.', improvement: 'Review your assigned exercise and recovery schedule with the crew. Record changes in how the activity feels.', source: 'https://www.nasa.gov/reference/fundamentals-of-human-health/', sourceTitle: 'NASA · Fundamentals of human health' },
  fatigue: { title: 'Sleep & attention', prompt: 'How does your alertness feel compared with usual?', why: 'Sleep loss, workload and circadian disruption can affect attention and performance. HRV does not establish that an astronaut is rested or fit for a task.', measure: 'Record how alert you feel and any change in sleep or workload. A wearable reading cannot replace this check-in.', improvement: 'Review the planned sleep opportunity and workload with the crew. Raise alertness concerns before a demanding task.', source: 'https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100', sourceTitle: 'NASA HRP · Sleep, circadian rhythm and workload' },
  wellbeing: { title: 'Wellbeing', prompt: 'How are you coping with today’s demands?', why: 'Isolation, confinement and mission demands can affect wellbeing and team performance. A pulse or gesture cannot identify a mental-health condition.', measure: 'Describe any change in mood, coping or concentration in your own words. This demo shares saved notes with the crew monitor.', improvement: 'Arrange a check-in with your crew support contact and review the mission’s behavioral-health support options.', source: 'https://www.nasa.gov/directorates/esdmd/hhp/behavioral-health-risk/', sourceTitle: 'NASA · Behavioral health risk' },
  nutrition: { title: 'Food & hydration', prompt: 'Have eating or drinking felt different from usual?', why: 'Nutrition and hydration support health in space. Changes in intake deserve context; ring and suit readings do not measure dehydration or nutritional status.', measure: 'Record missed meals, difficulty eating or drinking, or a change from your plan. Use a separate intake record if one is available.', improvement: 'Review the mission’s meal and fluid plan with the crew, including anything that makes it difficult to follow.', source: 'https://www.nasa.gov/reference/fundamentals-of-human-health/', sourceTitle: 'NASA · Nutrition and urinary health' }
} as const;
export type HealthTopic = keyof typeof healthTopics;
export type Feeling = 'usual' | 'changed' | 'help';
export type Followup = 'better' | 'same' | 'worse' | 'contacted';
export const symptomOptions = { dizzy:'Dizziness', headache:'Headache', tired:'Unusual tiredness', focus:'Hard to concentrate', nausea:'Nausea', thirsty:'Unusual thirst', stressed:'Feeling overwhelmed' } as const;
export const activityOptions = { unspecified:'Not specified', resting:'At rest', 'after-exercise':'After exercise', working:'During a task', waking:'After waking' } as const;
export type Symptom = keyof typeof symptomOptions;
export type Activity = keyof typeof activityOptions;
export type HealthInput = { topic: HealthTopic; feeling: Feeling; note: string; eventId: string | null; symptoms?: Symptom[]; activity?: Activity };
export type HealthEvidence = { source: SourceType; deviceId: string; measuredAt: number; receivedAt: number; values: Metrics | SuitMetrics; eventId: string | null };
export type HealthAssessment = {
  status: 'current' | 'historical' | 'unavailable'; headline: string; facts: string[]; missing: string[];
  comparison: { reference:number; delta:number; count:number; from:number; to:number } | null;
  possibilities: { id:string; title:string; support:string; unknown:string; source:string; sourceTitle:string }[];
};
export type HealthGuide = { version: 1 | 2; level: 'routine' | 'measurement' | 'review' | 'help'; title: string; explanation: string; steps: string[]; reason: string; assessment?: HealthAssessment };
export type HealthCheck = {
  id: string; createdAt: number; phase: Phase; input: HealthInput; evidence: HealthEvidence | null;
  guide: HealthGuide; completedSteps: number[]; followups: { id: string; outcome: Followup; createdAt: number }[];
};
export const medicalOperationsSource = 'https://www.nasa.gov/reference/6-0-medical-operations/';
export function validHealthInput(value: unknown): value is HealthInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as HealthInput;
  return Object.hasOwn(healthTopics, v.topic) && ['usual','changed','help'].includes(v.feeling) && typeof v.note === 'string' && v.note.length <= 500 && (v.eventId === null || typeof v.eventId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v.eventId))
    && (v.symptoms === undefined || Array.isArray(v.symptoms) && v.symptoms.length <= Object.keys(symptomOptions).length && new Set(v.symptoms).size === v.symptoms.length && v.symptoms.every(s=>typeof s==='string' && Object.hasOwn(symptomOptions,s)))
    && (v.activity === undefined || typeof v.activity==='string' && Object.hasOwn(activityOptions,v.activity));
}
export function healthEvidence(member: CrewMember, event?: CrewEvent): HealthEvidence | null {
  if (event) {
    const values = event.sourceType === 'spacesuit' ? event.suitSnapshot : event.snapshot;
    return values && event.snapshotAt !== null ? { source: event.sourceType ?? 'ring', deviceId: event.deviceId, measuredAt: event.snapshotAt, receivedAt: event.receivedAt, values: { ...values }, eventId: event.id } : null;
  }
  const source = activeSource(member), sample = source.latest;
  return sample ? { source: source.type, deviceId: sample.deviceId, measuredAt: sample.measuredAt, receivedAt: sample.receivedAt, values: { ...sample.values }, eventId: null } : null;
}
// Educational routing rules authored for this demo, not a NASA clinical algorithm.
export function buildHealthGuide(input: HealthInput, member: CrewMember, evidence: HealthEvidence | null, now: number, online = true): HealthGuide {
  const topic = healthTopics[input.topic];
  const assessment = buildAssessment(input,member,evidence,now,online);
  const current = assessment.status==='current';
  const base = { version: 2 as const, reason: topic.why, assessment };
  if (input.feeling === 'help') return { ...base, level: 'help', title: 'Ask the crew for help now', explanation: 'You reported needing help. A reassuring-looking number does not override what you are experiencing.', steps: ['Contact a nearby crewmate or the crew medical officer directly. Saving this record does not contact them.', 'Follow the mission’s medical response procedure. The crew can coordinate with the flight surgeon when communication permits.', 'Share what changed, the activity and the original reading time. Do not wait for a new measurement or an app acknowledgement to ask for help.'] };
  if (input.feeling === 'changed' || input.symptoms?.length) return { ...base, level: 'review', title: 'Bring this change to the crew', explanation: 'Your self-report is the reason for this step. These measurements cannot determine its cause.', steps: ['Tell the crew medical officer what changed and when. If you need help now, contact the crew directly.', topic.measure, 'Review the mission-approved care procedure with the medical officer, then record how you feel. Treatment selection belongs to that assessment.'] };
  if (!current) return { ...base, level: 'measurement', title: 'Add context before interpreting the reading', explanation: input.eventId ? 'This is a saved moment, not a current health assessment.' : 'The primary measurement is missing, stale or disconnected. Your check-in is still useful.', steps: [topic.measure, 'If a current reading is needed, use the appropriate connected source and check its time. Never substitute a different device silently.', topic.improvement] };
  if (evidence?.source === 'ring' && outsideDemo(evidence.values as Metrics,member.config).length) return { ...base, level: 'review', title: 'Review the reading and its context', explanation: 'A value differs from a configurable demo reference. This is not a clinical threshold or diagnosis.', steps: [topic.measure, 'Share a persistent or unexplained change with the crew medical officer; mention any symptoms regardless of the numbers.', topic.improvement] };
  return { ...base, level: 'routine', title: 'Keep your health routine in view', explanation: 'You reported feeling as usual. Available readings do not establish medical clearance or readiness for a task.', steps: [topic.improvement, 'Record a new check-in if you notice a change. Ask the crew for help whenever you need it.'] };
}

function buildAssessment(input:HealthInput,member:CrewMember,evidence:HealthEvidence|null,now:number,online:boolean):HealthAssessment {
  const source=activeSource(member), symptoms=input.symptoms??[];
  const phaseStart=member.phaseHistory.at(-1)?.changedAt??0;
  const current=!!(online && !input.eventId && evidence && !evidence.eventId && evidence.source===source.type && evidence.deviceId===source.deviceId
    && evidence.measuredAt>=phaseStart && evidence.measuredAt<=now && evidence.receivedAt<=now
    && freshness(source.connected,evidence.measuredAt,source.intervalMs,now)==='live'
    && freshness(source.connected,evidence.receivedAt,source.intervalMs,now)==='live');
  const facts:string[]=[symptoms.length?`You reported: ${symptoms.map(s=>symptomOptions[s]).join(', ')}.`:input.feeling==='usual'?'You reported feeling as usual.':input.feeling==='help'?'You reported needing help now.':'You reported a change in how you feel.'];
  if(input.activity && input.activity!=='unspecified') facts.push(`Reported context: ${activityOptions[input.activity]}.`);
  const missing:string[]=[];
  let comparison:HealthAssessment['comparison']=null;
  if(evidence){
    if(evidence.source==='ring'){
      const v=evidence.values as Metrics;
      facts.push(`Ring: heart rate ${v.pulse.toFixed(0)} bpm · SpO₂ ${v.spo2.toFixed(1)}% · breathing rate ${v.respiration.toFixed(1)}/min.`, `Ring: HRV ${v.hrv.toFixed(0)} ms · skin temperature change ${v.skin>=0?'+':''}${v.skin.toFixed(1)} °C from the fictional baseline.`);
      missing.push('The ring cannot identify the cause of a symptom or measure core body temperature.');
    } else {
      const v=evidence.values as SuitMetrics;
      facts.push(`Suit ECG: heart rate ${v.pulse.toFixed(0)} bpm.`, `Suit atmosphere: pressure ${v.pressure.toFixed(2)} kPa · O₂ ${v.ppO2.toFixed(2)} kPa · CO₂ ${v.ppCO2.toFixed(3)} kPa · air temperature ${v.temperature.toFixed(1)} °C.`);
      missing.push('Suit oxygen pressure is not blood oxygen saturation. Suit air temperature is not body temperature; CO₂ here is not an inspired-dose measurement.');
    }
    if(!current) missing.push('This reading is historical or unverified for the current phase. It cannot describe your current condition.');
    if(current){
      const samples=evidence.source==='ring'?member.samples:member.suit.samples;
      const preceding=samples.filter(s=>s.deviceId===evidence.deviceId && s.astronautId===member.id && s.measuredAt>=phaseStart && s.measuredAt>=evidence.measuredAt-300000 && s.measuredAt<evidence.measuredAt && s.receivedAt<=now).sort((a,b)=>a.measuredAt-b.measuredAt).slice(-20);
      if(preceding.length>=3){
        const pulses=preceding.map(s=>s.values.pulse).sort((a,b)=>a-b),mid=Math.floor(pulses.length/2);
        const reference=pulses.length%2?pulses[mid]:(pulses[mid-1]+pulses[mid])/2;
        comparison={reference,delta:evidence.values.pulse-reference,count:preceding.length,from:preceding[0].measuredAt,to:preceding.at(-1)!.measuredAt};
      }
    }
  } else missing.push('No source reading is attached. Your self-report still matters.');
  if(!comparison) missing.push('No comparable recent pulse history: use at least three earlier readings from the same device and mission phase.');
  missing.push('No clinical baseline, blood pressure, physical examination or confirmed cause is available in this prototype.');
  const possibilities:HealthAssessment['possibilities']=[];
  const add=(id:string,title:string,support:string,unknown:string,topic:HealthTopic)=>possibilities.push({id,title,support,unknown,source:healthTopics[topic].source,sourceTitle:healthTopics[topic].sourceTitle});
  if(input.activity==='after-exercise') add('activity','Activity and recovery may be contributing','You selected “After exercise”.'+(comparison?` Pulse is ${Math.abs(comparison.delta).toFixed(0)} bpm ${comparison.delta>=0?'above':'below'} the recent median.`:''),'Activity timing and a recovery series are needed. A pulse change does not explain dizziness or establish normal recovery.','recovery');
  if(symptoms.includes('tired') || symptoms.includes('focus') || input.topic==='fatigue') add('fatigue','Sleep and workload may be contributing','You selected sleep/attention or reported tiredness or difficulty concentrating.','Sleep duration, schedule and workload have not been measured here. HRV cannot diagnose fatigue or clear you for a task.','fatigue');
  if(symptoms.includes('thirsty') || input.topic==='nutrition') add('intake','Food and fluid intake deserve review','You selected food/hydration or reported unusual thirst.','An intake history and medical assessment are missing. These sensors do not establish dehydration.','nutrition');
  if(symptoms.includes('stressed') || input.topic==='wellbeing') add('wellbeing','Mission demands may be affecting wellbeing','You selected wellbeing or reported feeling overwhelmed.','A personal conversation and broader context are needed; wearable signals cannot identify a mental-health condition.','wellbeing');
  if(evidence?.source==='spacesuit') possibilities.push({id:'environment',title:'Suit conditions are part of the assessment',support:'The attached suit record includes atmospheric pressure, oxygen, carbon dioxide and air temperature.',unknown:'A relationship to your symptoms is unconfirmed. Compare with the suit’s own alerts and mission procedures; this app does not determine safe atmospheric limits.',source:'https://www.nasa.gov/reference/11-0-spacesuits-vol-2/',sourceTitle:'NASA · Suited atmosphere, §11.3'});
  if(!possibilities.length) add('context','More context is needed to explain this moment',symptoms.length?'Your reported symptoms deserve review even when numbers look familiar.':'A reading and a general feeling do not identify a cause.','Record when this started, the activity and whether it persists. The crew medical officer can determine what assessment is appropriate.',input.topic);
  return {status:evidence?(current?'current':'historical'):'unavailable',headline:input.feeling==='help'?'Your request for help takes priority':symptoms.length || input.feeling==='changed'?'A change to understand with the crew':current?'Put your readings in context':'Your experience is the starting point',facts,missing,comparison,possibilities};
}
