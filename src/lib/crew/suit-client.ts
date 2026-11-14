import { MissionConnection } from './connection';
import { newId } from './model';
import { simulateSuit, validSuitMetrics } from './suit';
import type { Delivery } from './ring-client';
import type { EventInput, ServerMessage } from './types';

type SavedSuit = { pending: EventInput[]; deliveries: Record<string, Delivery> };
export class SuitClient {
  readonly connection: MissionConnection;
  values = simulateSuit(0);
  sampledAt = Date.now();
  paused = false;
  pending: EventInput[] = [];
  deliveries: Record<string, Delivery> = {};
  storageError = '';
  private unreadable = false;
  private startAt = Date.now();
  private tick: ReturnType<typeof setInterval>;
  constructor(
    readonly options: {
      url: string;
      astronautId: string;
      deviceId: string;
      onChange?: () => void;
      load?: () => unknown;
      save?: (saved: SavedSuit) => void;
    },
  ) {
    try {
      const saved = options.load?.() as SavedSuit | null;
      if (saved) {
        if (
          !Array.isArray(saved.pending) ||
          !saved.deliveries ||
          saved.pending.some(
            (e) =>
              e.sourceType !== 'spacesuit' ||
              e.deviceId !== options.deviceId ||
              e.astronautId !== options.astronautId ||
              typeof e.id !== 'string' ||
              !Number.isFinite(e.occurredAt) ||
              !Number.isFinite(e.snapshotAt) ||
              e.snapshot !== null ||
              e.gesture !== 'button' ||
              !['moment', 'emergency'].includes(e.kind) ||
              !validSuitMetrics(e.suitSnapshot),
          )
        )
          throw Error('Invalid outbox');
        this.pending = saved.pending;
        this.deliveries = saved.deliveries;
      }
    } catch {
      this.unreadable = true;
      this.storageError =
        'Saved outbox could not be read and was preserved. Keep this tab open until new events are confirmed.';
    }
    this.connection = new MissionConnection({
      url: options.url,
      register: {
        type: 'register',
        role: 'spacesuit',
        astronautId: options.astronautId,
        deviceId: options.deviceId,
        deviceName: 'EVA suit simulator',
      },
      onMessage: (m) => this.receive(m),
      onChange: () => this.changed(),
    });
    // Sampling is local and continues independently of the monitor link.
    this.tick = setInterval(() => {
      if (!this.paused) {
        this.sample();
        this.transmit();
      }
      this.flush();
      this.changed();
    }, 3000);
  }
  private changed() {
    this.options.onChange?.();
  }
  private sample() {
    this.sampledAt = Date.now();
    this.values = simulateSuit(this.sampledAt - this.startAt);
  }
  private transmit() {
    this.connection.send({
      type: 'telemetry',
      sourceType: 'spacesuit',
      id: newId(),
      deviceId: this.options.deviceId,
      astronautId: this.options.astronautId,
      measuredAt: this.sampledAt,
      values: { ...this.values },
    });
  }
  private persist() {
    try {
      if (!this.unreadable)
        this.options.save?.({ pending: this.pending, deliveries: this.deliveries });
    } catch {
      this.storageError = 'Pending events are in this tab only. Keep it open until confirmed.';
    }
    this.changed();
  }
  private receive(m: ServerMessage) {
    if (m.type === 'registered') {
      if (!this.paused) {
        this.sample();
        this.transmit();
      }
      this.flush();
    }
    if (m.type === 'ack' && this.pending.some((e) => e.id === m.id)) {
      this.pending = this.pending.filter((e) => e.id !== m.id);
      this.deliveries[m.id] = { status: 'confirmed', receivedAt: m.receivedAt };
      this.persist();
    }
    if (m.type === 'error' && m.id && this.pending.some((e) => e.id === m.id)) {
      this.deliveries[m.id] = {
        status: m.code === 'server-error' ? 'pending' : 'rejected',
        message: m.message,
      };
      this.persist();
    }
    this.changed();
  }
  private flush() {
    for (const e of this.pending)
      if (this.deliveries[e.id]?.status !== 'rejected')
        this.connection.send({ type: 'event', event: e });
  }
  capture(): EventInput {
    if (!this.paused) this.sample();
    const event: EventInput = {
      id: newId(),
      sourceType: 'spacesuit',
      astronautId: this.options.astronautId,
      deviceId: this.options.deviceId,
      occurredAt: Date.now(),
      kind: 'moment',
      gesture: 'button',
      snapshot: null,
      suitSnapshot: { ...this.values },
      snapshotAt: this.sampledAt,
    };
    this.pending.push(event);
    this.deliveries[event.id] = { status: 'pending' };
    this.persist();
    this.flush();
    return event;
  }
  retry(id: string) {
    if (!this.pending.some((e) => e.id === id)) return;
    this.deliveries[id] = { status: 'pending' };
    this.persist();
    this.flush();
  }
  pause() {
    this.paused = !this.paused;
    this.changed();
  }
  connect() {
    this.connection.connect();
  }
  disconnect() {
    this.connection.disconnect();
  }
  dispose() {
    clearInterval(this.tick);
    this.connection.dispose();
  }
}
