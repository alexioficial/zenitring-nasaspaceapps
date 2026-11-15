export type Source = 'ZENIT Ring' | 'Chest strap' | 'Suit ECG';
export type Reading = { time: number; pulse: number; source: Source };
export type EntryKind = 'recovery' | 'sleep' | 'nutrition' | 'moment';
export type Observation = {
  id: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  time: number;
  period: string;
  available: boolean;
};
export type EntryInput = Pick<Entry, 'kind' | 'summary' | 'notes' | 'manualPulse'>;
export type Entry = {
  id: string;
  time: number;
  kind: EntryKind;
  summary: string;
  notes: string;
  sensorConnected: boolean;
  reading: Reading;
  manualPulse: number | null;
  receivedAt: number | null;
  recordedAt?: number;
  momentId?: string;
  origin?: 'ring-double-tap' | 'ring-hold' | 'screen';
  observations?: Observation[];
};
export type Mission = {
  version: 1;
  clock: number;
  sensorConnected: boolean;
  monitorConnected: boolean;
  latest: Reading;
  samples: Reading[];
  entries: Entry[];
  remote: Reading & { receivedAt: number };
  observations: Observation[];
};

export const STORAGE_KEY = 'zenit-svelte-mission-v1';
export const phases = [
  {
    name: 'Preparation',
    start: 0,
    end: 600,
    source: 'ZENIT Ring',
    note: 'Baseline readings in cabin. The ring is a concept.',
    points: [
      [0, 72],
      [55, 73],
      [116, 74],
      [170, 75],
      [230, 74],
      [280, 77],
      [340, 76],
      [390, 79],
      [450, 78],
      [510, 81],
      [570, 82],
    ],
  },
  {
    name: 'Spacewalk',
    start: 600,
    end: 1380,
    source: 'Suit ECG',
    note: 'Activity and sensor source accompany every spacewalk reading.',
    points: [
      [630, 100],
      [680, 103],
      [730, 102],
      [790, 108],
      [850, 111],
      [900, 114],
      [960, 112],
      [1010, 109],
      [1070, 108],
      [1130, 103],
      [1190, 105],
      [1245, 102],
      [1290, 100],
      [1350, 97],
    ],
  },
  {
    name: 'Return to cabin',
    start: 1380,
    end: 1980,
    source: 'ZENIT Ring',
    note: 'The ring streams to your tablet. A gesture captures this moment for later.',
    points: [
      [1410, 93],
      [1455, 91],
      [1500, 92],
      [1545, 88],
      [1590, 90],
      [1630, 87],
      [1680, 89],
      [1725, 87],
      [1770, 86],
      [1800, 86],
    ],
  },
] as const;

export function ringObservations(time: number): Observation[] {
  return [
    {
      id: 'respiration',
      label: 'Respiratory rate',
      value: String(15 + Math.round(Math.sin(time / 12))),
      unit: 'breaths/min',
      source: 'ZENIT Ring · estimate',
      time,
      period: 'Current sample',
      available: true,
    },
    {
      id: 'activity',
      label: 'Activity',
      value: 'Resting',
      unit: '',
      source: 'ZENIT Ring · motion',
      time,
      period: 'Current sample',
      available: true,
    },
  ];
}
export const nightSummary: Observation[] = [
  {
    id: 'sleep',
    label: 'Sleep duration',
    value: '5 h 40 min',
    unit: '',
    source: 'Ring sleep summary',
    time: 0,
    period: 'Last night · 23:00–07:00',
    available: true,
  },
  {
    id: 'hrv',
    label: 'Average HRV',
    value: '42',
    unit: 'ms',
    source: 'Ring sleep summary',
    time: 0,
    period: 'Last night · 23:00–07:00',
    available: true,
  },
  {
    id: 'skin',
    label: 'Skin temperature deviation',
    value: '+0.2',
    unit: '°C',
    source: 'Ring sleep summary',
    time: 0,
    period: 'Last night vs. personal baseline',
    available: true,
  },
];
export const externalInstruments: Observation[] = [
  {
    id: 'spo2',
    label: 'SpO₂',
    value: '',
    unit: '%',
    source: 'Pulse oximeter',
    time: 0,
    period: 'Instrument not connected',
    available: false,
  },
  {
    id: 'pressure',
    label: 'Blood pressure',
    value: '',
    unit: 'mmHg',
    source: 'Blood pressure cuff',
    time: 0,
    period: 'Instrument not connected',
    available: false,
  },
  {
    id: 'temperature',
    label: 'Body temperature',
    value: '',
    unit: '°C',
    source: 'Thermometer',
    time: 0,
    period: 'Instrument not connected',
    available: false,
  },
  {
    id: 'glucose',
    label: 'Glucose',
    value: '',
    unit: 'mg/dL',
    source: 'Glucose meter',
    time: 0,
    period: 'Instrument not connected',
    available: false,
  },
];

export function createMission(): Mission {
  return {
    version: 1,
    clock: 1800,
    sensorConnected: true,
    monitorConnected: false,
    latest: { time: 1800, pulse: 86, source: 'ZENIT Ring' },
    samples: [],
    entries: [],
    observations: ringObservations(1800),
    remote: { time: 1350, pulse: 97, source: 'Suit ECG', receivedAt: 1352 },
  };
}

export function timestamp(seconds: number, short = false) {
  const hours = 9 + Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return [hours, minutes, ...(short ? [] : [rest])]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

function deliver(mission: Mission): Mission {
  if (!mission.monitorConnected) return mission;
  return {
    ...mission,
    remote:
      mission.latest.time > mission.remote.time
        ? { ...mission.latest, receivedAt: mission.clock }
        : mission.remote,
    entries: mission.entries.map((entry) =>
      entry.receivedAt === null ? { ...entry, receivedAt: mission.clock } : entry,
    ),
  };
}

export function tick(mission: Mission): Mission {
  const clock = mission.clock + 2;
  const latest: Reading = mission.sensorConnected
    ? {
        time: clock,
        pulse: Math.round(84 + 3 * Math.sin(clock / 11) + 2 * Math.sin(clock / 5)),
        source: 'ZENIT Ring',
      }
    : mission.latest;
  return deliver({
    ...mission,
    clock,
    latest,
    observations: mission.sensorConnected
      ? [
          ...ringObservations(clock),
          ...mission.observations.filter((o) => !['respiration', 'activity'].includes(o.id)),
        ]
      : mission.observations,
    samples: mission.sensorConnected ? [...mission.samples, latest].slice(-600) : mission.samples,
  });
}

export function setMonitor(mission: Mission, connected: boolean): Mission {
  return deliver({ ...mission, monitorConnected: connected });
}

export function snapshotObservations(mission: Mission): Observation[] {
  return [
    ...mission.observations.map((o) => ({
      ...o,
      available: ['respiration', 'activity'].includes(o.id)
        ? mission.sensorConnected && o.available
        : o.available,
    })),
    ...nightSummary.map((o) => ({ ...o })),
    ...externalInstruments
      .filter((o) => !mission.observations.some((saved) => saved.id === o.id))
      .map((o) => ({ ...o })),
  ];
}

export function addEntry(mission: Mission, input: EntryInput, id: string): Mission {
  if (!input.summary.trim() || input.summary.length > 160 || input.notes.length > 500)
    throw new Error('Check the entry.');
  if (
    input.manualPulse !== null &&
    (!Number.isInteger(input.manualPulse) || input.manualPulse < 1 || input.manualPulse > 300)
  )
    throw new Error('Enter a heart rate between 1 and 300 bpm.');
  if (mission.entries.some((entry) => entry.id === id)) return mission;
  return deliver({
    ...mission,
    entries: [
      ...mission.entries,
      {
        ...input,
        summary: input.summary.trim(),
        id,
        time: mission.clock,
        recordedAt: mission.clock,
        origin: 'screen',
        observations: snapshotObservations(mission),
        sensorConnected: mission.sensorConnected,
        reading: { ...mission.latest },
        receivedAt: null,
      },
    ],
  });
}

export function captureMoment(
  mission: Mission,
  id: string,
  gesture: 'ring-double-tap' | 'ring-hold' | 'screen',
): Mission {
  if (mission.entries.some((entry) => entry.id === id)) return mission;
  if (gesture !== 'screen' && !mission.sensorConnected) return mission;
  const next = addEntry(
    mission,
    { kind: 'moment', summary: 'Moment captured', notes: '', manualPulse: null },
    id,
  );
  return {
    ...next,
    entries: next.entries.map((e) => (e.id === id ? { ...e, origin: gesture } : e)),
  };
}

export function annotateMoment(
  mission: Mission,
  momentId: string,
  summary: string,
  id: string,
): Mission {
  if (mission.entries.some((entry) => entry.id === id)) return mission;
  const moment = mission.entries.find((e) => e.id === momentId && e.kind === 'moment');
  if (!moment) throw new Error('This captured moment is unavailable.');
  if (mission.entries.some((e) => e.momentId === momentId)) return mission;
  const next = addEntry(mission, { kind: 'recovery', summary, notes: '', manualPulse: null }, id);
  return {
    ...next,
    entries: next.entries.map((e) =>
      e.id === id
        ? {
            ...e,
            momentId,
            time: moment.time,
            reading: { ...moment.reading },
            sensorConnected: moment.sensorConnected,
            observations: moment.observations?.map((o) => ({ ...o })),
          }
        : e,
    ),
  };
}

export function syncDemoInstruments(mission: Mission): Mission {
  const values: Record<string, string> = {
    spo2: '98',
    pressure: '118/76',
    temperature: '36.7',
    glucose: '92',
  };
  return {
    ...mission,
    observations: [
      ...mission.observations.filter((o) => !externalInstruments.some((i) => i.id === o.id)),
      ...externalInstruments.map((o) => ({
        ...o,
        value: values[o.id],
        source: `${o.source} · import`,
        time: mission.clock,
        period: 'Spot measurement',
        available: true,
      })),
    ],
  };
}

// Validate browser storage as untrusted input before restoring a mission.
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
function isReading(value: unknown): value is Reading {
  return (
    record(value) &&
    finite(value.time) &&
    finite(value.pulse) &&
    value.pulse >= 1 &&
    value.pulse <= 300 &&
    ['ZENIT Ring', 'Chest strap', 'Suit ECG'].includes(String(value.source))
  );
}
function isObservation(value: unknown): value is Observation {
  return (
    record(value) &&
    ['id', 'label', 'value', 'unit', 'source', 'period'].every(
      (key) => typeof value[key] === 'string',
    ) &&
    finite(value.time) &&
    typeof value.available === 'boolean'
  );
}
function isRemote(value: unknown): value is Mission['remote'] {
  return record(value) && finite(value.receivedAt) && isReading(value);
}
export function restoreMission(raw: string | null): Mission | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (
      !record(v) ||
      v.version !== 1 ||
      !finite(v.clock) ||
      v.clock < 1800 ||
      typeof v.sensorConnected !== 'boolean' ||
      typeof v.monitorConnected !== 'boolean' ||
      !isReading(v.latest) ||
      !isRemote(v.remote) ||
      !Array.isArray(v.samples) ||
      v.samples.length > 600 ||
      !v.samples.every(isReading) ||
      !Array.isArray(v.entries)
    )
      return null;
    if (
      !v.entries.every(
        (e: unknown) =>
          record(e) &&
          typeof e.id === 'string' &&
          finite(e.time) &&
          ['recovery', 'sleep', 'nutrition', 'moment'].includes(String(e.kind)) &&
          typeof e.summary === 'string' &&
          e.summary.length <= 160 &&
          typeof e.notes === 'string' &&
          e.notes.length <= 500 &&
          typeof e.sensorConnected === 'boolean' &&
          isReading(e.reading) &&
          (e.manualPulse === null ||
            (finite(e.manualPulse) &&
              Number.isInteger(e.manualPulse) &&
              e.manualPulse >= 1 &&
              e.manualPulse <= 300)) &&
          (e.receivedAt === null || finite(e.receivedAt)) &&
          (e.recordedAt === undefined || finite(e.recordedAt)) &&
          (e.momentId === undefined || typeof e.momentId === 'string') &&
          (e.origin === undefined ||
            ['ring-double-tap', 'ring-hold', 'screen'].includes(String(e.origin))) &&
          (e.observations === undefined ||
            (Array.isArray(e.observations) && e.observations.every(isObservation))),
      )
    )
      return null;
    if (
      v.observations !== undefined &&
      (!Array.isArray(v.observations) || !v.observations.every(isObservation))
    )
      return null;
    // Existing strap-era entries retain their original source; never relabel old evidence.
    return { ...v, observations: v.observations ?? [] } as Mission;
  } catch {
    return null;
  }
}
