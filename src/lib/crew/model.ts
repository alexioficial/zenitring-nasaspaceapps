import type { Config, CrewMember, Metrics, MetricKey } from './types';
import { emptySuit } from './suit';

export const metricInfo: Record<
  MetricKey,
  { label: string; unit: string; description: string; digits: number }
> = {
  pulse: {
    label: 'Heart rate',
    unit: 'bpm',
    description: 'Heartbeats per minute. Simulated ring signal.',
    digits: 0,
  },
  hrv: {
    label: 'HRV',
    unit: 'ms',
    description:
      'Heart rate variability: variation between heartbeats. A simulated estimate, not an assessment of stress or readiness.',
    digits: 0,
  },
  spo2: {
    label: 'SpO₂',
    unit: '%',
    description: 'Simulated estimate of peripheral oxygen saturation.',
    digits: 1,
  },
  skin: {
    label: 'Skin Δ',
    unit: '°C',
    description:
      'Skin temperature deviation from a fictional personal baseline. This is not core body temperature.',
    digits: 1,
  },
  respiration: {
    label: 'Respiration',
    unit: '/min',
    description: 'Simulated breaths per minute.',
    digits: 0,
  },
};
export const metricKeys = Object.keys(metricInfo) as MetricKey[];
export const defaultConfig: Config = {
  intervalMs: 3000,
  scenario: 'normal',
  revision: 1,
  ranges: {
    pulse: [55, 110],
    hrv: [20, 90],
    spo2: [94, 100],
    skin: [-0.5, 0.8],
    respiration: [10, 22],
  },
};
export const crewDefaults = [
  { id: 'vega', name: 'Alex Morgan', role: 'Commander', callsign: 'VEGA', color: '#236c80' },
  { id: 'nova', name: 'Sam Rivera', role: 'Flight engineer', callsign: 'NOVA', color: '#65558c' },
  {
    id: 'atlas',
    name: 'Jordan Lee',
    role: 'Mission specialist',
    callsign: 'ATLAS',
    color: '#7a663d',
  },
  { id: 'lyra', name: 'Robin Chen', role: 'Medical officer', callsign: 'LYRA', color: '#46775c' },
];
export function initialCrew(): CrewMember[] {
  return crewDefaults.map((c) => ({
    ...c,
    healthChecks: [],
    suit: emptySuit(),
    phase: 'cabin',
    phaseHistory: [],
    deviceId: null,
    deviceName: null,
    connected: false,
    lastSeen: null,
    latest: null,
    samples: [],
    config: structuredClone(defaultConfig),
    appliedRevision: null,
  }));
}
export function freshness(
  connected: boolean,
  receivedAt: number | null,
  intervalMs: number,
  now = Date.now(),
) {
  if (!connected) return 'offline';
  if (receivedAt === null) return 'waiting';
  return now - receivedAt > Math.max(9000, intervalMs * 2.5) ? 'stale' : 'live';
}
export function outsideDemo(values: Metrics | null, config: Config): MetricKey[] {
  return values
    ? metricKeys.filter((k) => values[k] < config.ranges[k][0] || values[k] > config.ranges[k][1])
    : [];
}
export function validMetrics(v: unknown): v is Metrics {
  if (!v || typeof v !== 'object') return false;
  const m = v as Metrics;
  return (
    metricKeys.every((k) => typeof m[k] === 'number' && Number.isFinite(m[k])) &&
    m.pulse >= 1 &&
    m.pulse <= 300 &&
    m.hrv >= 0 &&
    m.hrv <= 400 &&
    m.spo2 >= 0 &&
    m.spo2 <= 100 &&
    Math.abs(m.skin) <= 10 &&
    m.respiration >= 0 &&
    m.respiration <= 80
  );
}
export function validateConfig(v: unknown): v is Config {
  if (!v || typeof v !== 'object') return false;
  const c = v as Config;
  const limits: Record<MetricKey, [number, number]> = {
    pulse: [1, 300],
    hrv: [0, 400],
    spo2: [0, 100],
    skin: [-10, 10],
    respiration: [0, 80],
  };
  return (
    Number.isInteger(c.intervalMs) &&
    c.intervalMs >= 1000 &&
    c.intervalMs <= 15000 &&
    ['normal', 'drift', 'excursion'].includes(c.scenario) &&
    Number.isInteger(c.revision) &&
    c.revision >= 1 &&
    !!c.ranges &&
    metricKeys.every(
      (k) =>
        Array.isArray(c.ranges[k]) &&
        c.ranges[k].length === 2 &&
        c.ranges[k].every(Number.isFinite) &&
        c.ranges[k][0] < c.ranges[k][1] &&
        c.ranges[k][0] >= limits[k][0] &&
        c.ranges[k][1] <= limits[k][1],
    )
  );
}
// getRandomValues is available on LAN HTTP where randomUUID may be absent.
export function newId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
export function clockLabel(time: number, seconds = true) {
  return (
    new Date(time).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      ...(seconds ? { second: '2-digit' } : {}),
      timeZone: 'UTC',
    }) + ' UTC'
  );
}
export function ageLabel(time: number | null, now: number) {
  if (time === null) return 'No signal yet';
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
}
