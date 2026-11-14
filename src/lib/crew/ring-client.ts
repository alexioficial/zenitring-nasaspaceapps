import { MissionConnection, type LinkStatus } from './connection';
import { defaultConfig, newId } from './model';
import { simulate } from './simulation';
import type { Config, EventInput, Metrics, ServerMessage } from './types';

export type Delivery = {
  status: 'pending' | 'confirmed' | 'rejected';
  receivedAt?: number;
  message?: string;
};
type SavedRing = { pending: EventInput[]; deliveries: Record<string, Delivery> };
export class RingClient {
  readonly connection: MissionConnection;
  config: Config = structuredClone(defaultConfig);
  values: Metrics;
  sampledAt: number;
  transmittedAt: number | null = null;
  transmissions = 0;
  pending: EventInput[] = [];
  deliveries: Record<string, Delivery> = {};
  storageError = '';
  paused = false;
  private emission: ReturnType<typeof setTimeout> | undefined;
  private retry: ReturnType<typeof setInterval> | undefined;
  private started = Date.now();
  private previousSample = Date.now();
  private unreadableOutbox = false;
  constructor(
    readonly options: {
      url: string;
      deviceId: string;
      astronautId: string;
      deviceName: string;
      onChange?: () => void;
      load?: () => SavedRing | null;
      save?: (saved: SavedRing) => void;
    },
  ) {
    this.values = simulate(options.astronautId, 0, 'normal');
    this.sampledAt = Date.now();
    try {
      const saved = options.load?.();
      if (saved) {
        this.pending = saved.pending;
        this.deliveries = saved.deliveries;
      }
    } catch {
      this.unreadableOutbox = true;
      this.storageError =
        'Saved evidence could not be read and is preserved. New pending events stay in this tab; keep it open until confirmed.';
    }
    this.connection = new MissionConnection({
      url: options.url,
      register: {
        type: 'register',
        role: 'ring',
        deviceId: options.deviceId,
        astronautId: options.astronautId,
        deviceName: options.deviceName,
      },
      onMessage: (m) => this.message(m),
      onChange: () => this.changed(),
    });
  }
  get status(): LinkStatus {
    return this.connection.status;
  }
  get error() {
    return this.connection.error;
  }
  private changed() {
    this.options.onChange?.();
  }
  private persist() {
    try {
      if (!this.unreadableOutbox)
        this.options.save?.({ pending: this.pending, deliveries: this.deliveries });
    } catch {
      this.storageError =
        'Pending events are in this tab only. Keep it open until every event is confirmed.';
    }
    this.changed();
  }
  private message(m: ServerMessage) {
    if (m.type === 'registered' && m.config) {
      this.apply(m.config);
      this.flush();
    }
    if (m.type === 'config' && m.astronautId === this.options.astronautId) this.apply(m.config);
    if (m.type === 'ack' && this.pending.some((e) => e.id === m.id)) {
      this.pending = this.pending.filter((e) => e.id !== m.id);
      this.deliveries = {
        ...this.deliveries,
        [m.id]: { status: 'confirmed', receivedAt: m.receivedAt },
      };
      this.persist();
    }
    if (m.type === 'error' && m.id && this.pending.some((e) => e.id === m.id)) {
      this.deliveries = {
        ...this.deliveries,
        [m.id]: { status: m.code === 'server-error' ? 'pending' : 'rejected', message: m.message },
      };
      this.persist();
    }
    this.changed();
  }
  private apply(config: Config) {
    this.config = structuredClone(config);
    clearTimeout(this.emission);
    this.connection.send({
      type: 'config-applied',
      astronautId: this.options.astronautId,
      revision: config.revision,
    });
    if (this.transmittedAt === null) this.transmit();
    else this.schedule();
    this.changed();
  }
  private sample() {
    const now = Date.now();
    this.values = simulate(
      this.options.astronautId,
      now - this.started,
      this.config.scenario,
      this.values,
      now - this.previousSample,
    );
    this.previousSample = now;
    this.sampledAt = now;
  }
  private schedule() {
    clearTimeout(this.emission);
    if (this.status === 'online' && !this.paused)
      this.emission = setTimeout(() => this.transmit(), this.config.intervalMs);
  }
  private transmit() {
    if (this.status !== 'online' || this.paused) return;
    this.sample();
    if (
      this.connection.send({
        type: 'telemetry',
        id: newId(),
        deviceId: this.options.deviceId,
        astronautId: this.options.astronautId,
        measuredAt: this.sampledAt,
        values: { ...this.values },
      })
    ) {
      this.transmittedAt = Date.now();
      this.transmissions++;
    }
    this.schedule();
    this.changed();
  }
  private flush() {
    for (const e of this.pending)
      if (this.deliveries[e.id]?.status !== 'rejected')
        this.connection.send({ type: 'event', event: e });
  }
  connect() {
    this.connection.connect();
    clearInterval(this.retry);
    this.retry = setInterval(() => this.flush(), 2000);
  }
  disconnect() {
    clearTimeout(this.emission);
    this.connection.disconnect();
  }
  pause(value: boolean) {
    this.paused = value;
    if (value) clearTimeout(this.emission);
    else if (this.status === 'online') this.transmit();
    this.changed();
  }
  capture(gesture: 'double-tap' | 'swipe' | 'button', emergency = false): EventInput {
    if (!this.paused) this.sample();
    const event: EventInput = {
      id: newId(),
      deviceId: this.options.deviceId,
      astronautId: this.options.astronautId,
      occurredAt: Date.now(),
      kind: gesture === 'swipe' || emergency ? 'emergency' : 'moment',
      gesture,
      snapshot: { ...this.values },
      snapshotAt: this.sampledAt,
    };
    this.pending = [...this.pending, event];
    this.deliveries = { ...this.deliveries, [event.id]: { status: 'pending' } };
    this.persist();
    this.flush();
    return event;
  }
  retryRejected(id: string) {
    this.deliveries = { ...this.deliveries, [id]: { status: 'pending' } };
    this.persist();
    this.flush();
  }
  dispose() {
    clearTimeout(this.emission);
    clearInterval(this.retry);
    this.connection.dispose();
  }
}
