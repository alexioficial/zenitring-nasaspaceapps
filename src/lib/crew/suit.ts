import type { CrewMember, Phase, SuitMetrics, SuitState } from './types';

export const phases: { id: Phase; label: string; source: string }[] = [
  { id: 'cabin', label: 'Cabin', source: 'Ring' },
  { id: 'spacewalk', label: 'Spacewalk', source: 'Suit ECG' },
  { id: 'recovery', label: 'Recovery', source: 'Ring' }
];
export const suitInfo: Record<keyof SuitMetrics, { label: string; unit: string; digits: number; description: string }> = {
  pulse: { label: 'Suit ECG heart rate', unit: 'bpm', digits: 0, description: 'Simulated rate derived from a conceptual suit ECG. No waveform or rhythm diagnosis.' },
  pressure: { label: 'Suit pressure', unit: 'kPa', digits: 2, description: 'Total pressure in the simulated suit atmosphere.' },
  ppO2: { label: 'O₂ partial pressure', unit: 'kPa', digits: 2, description: 'Oxygen in the suit atmosphere. This is not blood oxygen saturation (SpO₂).' },
  ppCO2: { label: 'CO₂ partial pressure', unit: 'kPa', digits: 3, description: 'Simulated atmosphere measurement; not a measurement of inspired CO₂ or a clinical limit.' },
  temperature: { label: 'Suit air temperature', unit: '°C', digits: 1, description: 'Simulated air temperature, not skin or core body temperature.' },
  battery: { label: 'Suit battery', unit: '%', digits: 0, description: 'Fictional remaining charge. No mission duration or safe-return estimate.' }
};
export const suitKeys = Object.keys(suitInfo) as (keyof SuitMetrics)[];
export const emptySuit = (): SuitState => ({ deviceId: null, deviceName: null, connected: false, lastSeen: null, latest: null, samples: [] });
export function activeSource(c: CrewMember) {
  return c.phase === 'spacewalk'
    ? { type: 'spacesuit' as const, label: 'Suit ECG', deviceId: c.suit.deviceId, connected: c.suit.connected, latest: c.suit.latest, intervalMs: 3000 }
    : { type: 'ring' as const, label: 'Ring', deviceId: c.deviceId, connected: c.connected, latest: c.latest, intervalMs: c.config.intervalMs };
}
export function validSuitMetrics(value: unknown): value is SuitMetrics {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as SuitMetrics;
  // Broad input bounds only: NOT operational/safe ranges.
  return suitKeys.every(k => typeof v[k] === 'number' && Number.isFinite(v[k])) &&
    v.pulse >= 1 && v.pulse <= 300 && v.pressure > 0 && v.pressure <= 200 &&
    v.ppO2 >= 0 && v.ppCO2 >= 0 && v.ppO2 + v.ppCO2 <= v.pressure &&
    v.temperature >= -50 && v.temperature <= 80 && v.battery >= 0 && v.battery <= 100;
}
export function simulateSuit(elapsedMs: number): SuitMetrics {
  const t = elapsedMs / 1000;
  return { pulse: 94 + Math.sin(t / 9) * 9, pressure: 30 + Math.sin(t / 20) * 0.08,
    ppO2: 28.8 + Math.sin(t / 18) * 0.07, ppCO2: 0.32 + Math.sin(t / 12) * 0.06,
    temperature: 22 + Math.sin(t / 28) * 0.7, battery: Math.max(0, 94 - t / 300) };
}
