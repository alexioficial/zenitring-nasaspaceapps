import type { HealthCheck, HealthInput, Followup } from './health';
export type Scenario = 'normal' | 'drift' | 'excursion';
export type Phase = 'cabin' | 'spacewalk' | 'recovery';
export type SourceType = 'ring' | 'spacesuit';
export type SuitMetrics = {
  pulse: number;
  pressure: number;
  ppO2: number;
  ppCO2: number;
  temperature: number;
  battery: number;
};
export type SuitSample = {
  id: string;
  deviceId: string;
  astronautId: string;
  measuredAt: number;
  receivedAt: number;
  values: SuitMetrics;
  sourceType: 'spacesuit';
};
export type SuitState = {
  deviceId: string | null;
  deviceName: string | null;
  connected: boolean;
  lastSeen: number | null;
  latest: SuitSample | null;
  samples: SuitSample[];
};
export type Metrics = {
  pulse: number;
  hrv: number;
  spo2: number;
  skin: number;
  respiration: number;
};
export type MetricKey = keyof Metrics;
export type Config = {
  intervalMs: number;
  scenario: Scenario;
  revision: number;
  ranges: Record<MetricKey, [number, number]>;
};
export type Sample = {
  id: string;
  deviceId: string;
  astronautId: string;
  measuredAt: number;
  receivedAt: number;
  values: Metrics;
};
export type Annotation = { id: string; text: string; createdAt: number; receivedAt: number };
export type EmergencyAction = {
  id: string;
  action: 'acknowledged' | 'resolved';
  note: string;
  receivedAt: number;
};
export type CrewEvent = {
  sourceType?: SourceType;
  suitSnapshot?: SuitMetrics | null;
  id: string;
  deviceId: string;
  astronautId: string;
  occurredAt: number;
  receivedAt: number;
  kind: 'moment' | 'emergency';
  gesture: 'double-tap' | 'swipe' | 'button';
  snapshot: Metrics | null;
  snapshotAt: number | null;
  annotations: Annotation[];
  status: 'active' | 'acknowledged' | 'resolved';
  actions: EmergencyAction[];
};
export type EventInput = Pick<
  CrewEvent,
  | 'id'
  | 'deviceId'
  | 'astronautId'
  | 'occurredAt'
  | 'kind'
  | 'gesture'
  | 'snapshot'
  | 'snapshotAt'
  | 'sourceType'
  | 'suitSnapshot'
>;
export type CrewMember = {
  healthChecks: HealthCheck[];
  suit: SuitState;
  phase: Phase;
  phaseHistory: { phase: Phase; changedAt: number }[];
  id: string;
  name: string;
  role: string;
  color: string;
  deviceId: string | null;
  deviceName: string | null;
  connected: boolean;
  lastSeen: number | null;
  latest: Sample | null;
  samples: Sample[];
  config: Config;
  appliedRevision: number | null;
};
export type MissionState = { crew: CrewMember[]; events: CrewEvent[]; serverTime: number };
export type ClientMessage =
  | {
      type: 'register';
      role: 'ring' | 'spacesuit' | 'monitor' | 'astronaut';
      deviceId: string;
      astronautId?: string;
      deviceName?: string;
    }
  | { type: 'heartbeat'; sentAt: number }
  | {
      type: 'telemetry';
      id: string;
      deviceId: string;
      astronautId: string;
      measuredAt: number;
      values: Metrics;
      sourceType?: 'ring';
    }
  | {
      type: 'telemetry';
      id: string;
      deviceId: string;
      astronautId: string;
      measuredAt: number;
      values: SuitMetrics;
      sourceType: 'spacesuit';
    }
  | { type: 'phase'; id: string; astronautId: string; phase: Phase }
  | { type: 'health-checkin'; id: string; astronautId: string; input: HealthInput }
  | {
      type: 'health-step';
      id: string;
      astronautId: string;
      checkId: string;
      step: number;
      completed: boolean;
    }
  | { type: 'health-followup'; id: string; astronautId: string; checkId: string; outcome: Followup }
  | { type: 'event'; event: EventInput }
  | { type: 'config'; id: string; astronautId: string; config: Config }
  | { type: 'config-applied'; astronautId: string; revision: number }
  | { type: 'simulation'; id: string; scenario: Scenario }
  | { type: 'annotate'; id: string; eventId: string; text: string; createdAt: number }
  | {
      type: 'emergency-action';
      id: string;
      eventId: string;
      action: 'acknowledged' | 'resolved';
      note: string;
    }
  | { type: 'release'; id: string; astronautId: string; sourceType?: SourceType };
export type ServerMessage =
  | { type: 'state'; state: MissionState }
  | {
      type: 'registered';
      role: 'ring' | 'spacesuit' | 'monitor' | 'astronaut';
      astronautId?: string;
      config?: Config;
    }
  | { type: 'config'; astronautId: string; config: Config }
  | { type: 'ack'; id: string; receivedAt: number; event?: CrewEvent }
  | { type: 'heartbeat'; serverTime: number }
  | { type: 'error'; code: string; message: string; id?: string };
