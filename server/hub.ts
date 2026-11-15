import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { Repository } from './repository';
import { validSuitMetrics } from '../src/lib/crew/suit';
import { validHealthInput, healthEvidence, buildHealthGuide } from '../src/lib/crew/health';
import { validateConfig, validMetrics } from '../src/lib/crew/model';
import type {
  ClientMessage,
  CrewEvent,
  EventInput,
  MissionState,
  ServerMessage,
} from '../src/lib/crew/types';

type Peer = {
  role: 'ring' | 'spacesuit' | 'monitor' | 'astronaut';
  deviceId: string;
  astronautId?: string;
  lastSeen: number;
};
class Rejected extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const idOK = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
const timeOK = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 946684800000 && v <= Date.now() + 60000;
function ensure(
  ok: unknown,
  code = 'invalid-message',
  message = 'This message is invalid.',
): asserts ok {
  if (!ok) throw new Rejected(code, message);
}
const eventInput = (e: CrewEvent): EventInput => ({
  id: e.id,
  deviceId: e.deviceId,
  astronautId: e.astronautId,
  occurredAt: e.occurredAt,
  kind: e.kind,
  gesture: e.gesture,
  snapshot: e.snapshot,
  snapshotAt: e.snapshotAt,
  ...(e.sourceType ? { sourceType: e.sourceType } : {}),
  ...(e.suitSnapshot !== undefined ? { suitSnapshot: e.suitSnapshot } : {}),
});

export function attachHub(
  server: Server,
  databasePath = 'data/zenit.sqlite',
  options: { heartbeatMs?: number; timeoutMs?: number } = {},
) {
  const repository = new Repository(databasePath);
  let closed = false;
  const peers = new Map<WebSocket, Peer>();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16384, perMessageDeflate: false });
  const send = (ws: WebSocket, m: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  };
  function snapshot(): MissionState {
    return {
      serverTime: Date.now(),
      events: repository.events(),
      crew: repository.crew().map((c) => {
        const peer = [...peers.values()].find((p) => p.role === 'ring' && p.astronautId === c.id);
        const suitPeer = [...peers.values()].find(
          (p) => p.role === 'spacesuit' && p.astronautId === c.id,
        );
        return {
          ...c,
          connected: !!peer,
          lastSeen: peer?.lastSeen ?? c.lastSeen,
          suit: {
            ...c.suit,
            connected: !!suitPeer,
            lastSeen: suitPeer?.lastSeen ?? c.suit.lastSeen,
          },
        };
      }),
    };
  }
  function stateFor(state: MissionState, peer: Peer): MissionState {
    if (peer.role !== 'astronaut') return state;
    return {
      ...state,
      crew: state.crew.filter((c) => c.id === peer.astronautId),
      events: state.events.filter((e) => e.astronautId === peer.astronautId),
    };
  }
  const broadcast = () => {
    const state = snapshot();
    for (const [ws, p] of peers)
      if (p.role === 'monitor' || p.role === 'astronaut')
        send(ws, { type: 'state', state: stateFor(state, p) });
  };
  function command(ws: WebSocket, m: ClientMessage & { id: string }, mutate: () => void) {
    ensure(idOK(m.id));
    const request = JSON.stringify(m);
    const old = repository.command(m.id);
    if (old) {
      ensure(
        old.request === request,
        'id-conflict',
        'This ID already belongs to a different command.',
      );
      send(ws, JSON.parse(old.response));
      return false;
    }
    const ack: ServerMessage = { type: 'ack', id: m.id, receivedAt: Date.now() };
    repository.transaction(() => {
      mutate();
      repository.saveCommand(m.id, request, ack);
    });
    send(ws, ack);
    broadcast();
    return true;
  }
  function receive(ws: WebSocket, raw: string) {
    let m: ClientMessage | undefined;
    try {
      const value: unknown = JSON.parse(raw);
      ensure(value && typeof value === 'object' && !Array.isArray(value));
      m = value as ClientMessage;
      if (m.type === 'register') {
        const registration = m;
        ensure(!peers.has(ws), 'already-registered', 'Reconnect to change your device binding.');
        ensure(idOK(m.deviceId) && ['ring', 'spacesuit', 'monitor', 'astronaut'].includes(m.role));
        ensure(
          ![...peers.values()].some((p) => p.deviceId === registration.deviceId),
          'device-active',
          'This device already has an active connection.',
        );
        if (m.role === 'ring' || m.role === 'spacesuit') {
          const c = repository.crew().find((c) => c.id === registration.astronautId);
          ensure(c, 'unknown-astronaut', 'Select a crew member.');
          const target = m.role === 'spacesuit' ? c.suit : c;
          ensure(
            !target.deviceId || target.deviceId === m.deviceId,
            'binding-conflict',
            'This source is reserved for another device. Release it from the monitor after disconnecting.',
          );
          ensure(
            ![...peers.values()].some(
              (p) => p.role === registration.role && p.astronautId === c.id,
            ),
            'binding-conflict',
            'This astronaut already has an active device of this type.',
          );
          ensure(
            !repository
              .crew()
              .some(
                (other) =>
                  (other.deviceId === registration.deviceId &&
                    (other.id !== c.id || registration.role !== 'ring')) ||
                  (other.suit.deviceId === registration.deviceId &&
                    (other.id !== c.id || registration.role !== 'spacesuit')),
              ),
            'binding-conflict',
            'This device is reserved for another source. Release its previous binding first.',
          );
          target.deviceId = m.deviceId;
          target.deviceName =
            typeof m.deviceName === 'string' ? m.deviceName.slice(0, 60) : `Simulated ${m.role}`;
          target.lastSeen = Date.now();
          if (m.role === 'ring') c.appliedRevision = null;
          repository.saveCrew(c);
          peers.set(ws, {
            role: m.role,
            deviceId: m.deviceId,
            astronautId: c.id,
            lastSeen: Date.now(),
          });
          send(ws, {
            type: 'registered',
            role: m.role,
            astronautId: c.id,
            ...(m.role === 'ring' ? { config: c.config } : {}),
          });
        } else {
          if (m.role === 'astronaut')
            ensure(
              repository.crew().some((c) => c.id === registration.astronautId),
              'unknown-astronaut',
              'This personal monitor link does not identify a crew member.',
            );
          const peer: Peer = {
            role: m.role,
            deviceId: m.deviceId,
            astronautId: m.role === 'astronaut' ? m.astronautId : undefined,
            lastSeen: Date.now(),
          };
          peers.set(ws, peer);
          send(ws, { type: 'registered', role: m.role, astronautId: peer.astronautId });
          send(ws, { type: 'state', state: stateFor(snapshot(), peer) });
        }
        broadcast();
        return;
      }
      const p = peers.get(ws);
      ensure(p, 'not-registered', 'Register this device first.');
      p.lastSeen = Date.now();
      if (m.type === 'heartbeat') {
        send(ws, { type: 'heartbeat', serverTime: Date.now() });
        return;
      }
      const c = repository.crew().find((c) => c.id === p.astronautId);
      if (m.type === 'telemetry') {
        const source = m.sourceType ?? 'ring';
        ensure(
          (p.role === 'ring' || p.role === 'spacesuit') &&
            p.role === source &&
            c &&
            m.deviceId === p.deviceId &&
            m.astronautId === p.astronautId,
          'not-authorized',
          'A device may transmit only its own source.',
        );
        ensure(idOK(m.id) && timeOK(m.measuredAt));
        if (m.sourceType === 'spacesuit') {
          ensure(validSuitMetrics(m.values));
          if (!c.suit.latest || m.measuredAt > c.suit.latest.measuredAt) {
            const sample = { ...m, receivedAt: Date.now() };
            c.suit.latest = sample;
            c.suit.samples = [...c.suit.samples, sample].slice(-120);
            c.suit.lastSeen = sample.receivedAt;
            repository.saveCrew(c);
            broadcast();
          }
        } else {
          ensure(validMetrics(m.values));
          if (!c.latest || m.measuredAt > c.latest.measuredAt) {
            const sample = { ...m, receivedAt: Date.now() };
            c.latest = sample;
            c.samples = [...c.samples, sample].slice(-120);
            c.lastSeen = sample.receivedAt;
            repository.saveCrew(c);
            broadcast();
          }
        }
        return;
      }
      if (m.type === 'config-applied') {
        ensure(
          p.role === 'ring' &&
            c &&
            m.astronautId === p.astronautId &&
            m.revision === c.config.revision,
        );
        c.appliedRevision = m.revision;
        repository.saveCrew(c);
        broadcast();
        return;
      }
      if (m.type === 'event') {
        const e = m.event;
        ensure(
          (p.role === 'ring' || p.role === 'spacesuit') &&
            c &&
            e &&
            (e.sourceType ?? 'ring') === p.role &&
            e.deviceId === p.deviceId &&
            e.astronautId === p.astronautId,
          'not-authorized',
          'This event does not belong to the linked source.',
        );
        ensure(
          idOK(e.id) &&
            timeOK(e.occurredAt) &&
            ['moment', 'emergency'].includes(e.kind) &&
            ['double-tap', 'swipe', 'button'].includes(e.gesture),
        );
        ensure(
          (e.kind === 'moment' && e.gesture !== 'swipe') ||
            (e.kind === 'emergency' && e.gesture !== 'double-tap'),
        );
        if (p.role === 'spacesuit')
          ensure(
            e.gesture === 'button' &&
              e.snapshot === null &&
              validSuitMetrics(e.suitSnapshot) &&
              timeOK(e.snapshotAt) &&
              e.snapshotAt <= e.occurredAt + 1000,
          );
        else
          ensure(
            e.suitSnapshot == null &&
              ((e.snapshot === null && e.snapshotAt === null) ||
                (validMetrics(e.snapshot) &&
                  timeOK(e.snapshotAt) &&
                  e.snapshotAt <= e.occurredAt + 1000)),
          );
        const old = repository.event(e.id);
        if (old) {
          ensure(
            JSON.stringify(eventInput(old)) === JSON.stringify(eventInput(e as CrewEvent)),
            'id-conflict',
            'This event ID already has different evidence.',
          );
          send(ws, { type: 'ack', id: old.id, receivedAt: old.receivedAt, event: old });
          return;
        }
        const saved: CrewEvent = {
          ...eventInput(e as CrewEvent),
          receivedAt: Date.now(),
          status: 'active',
          annotations: [],
          actions: [],
        };
        repository.saveEvent(saved);
        send(ws, { type: 'ack', id: saved.id, receivedAt: saved.receivedAt, event: saved });
        broadcast();
        return;
      }
      if (m.type === 'simulation') {
        ensure(p.role === 'ring' && c && ['normal', 'drift', 'excursion'].includes(m.scenario));
        const changed = command(ws, m, () => {
          ensure(m!.type === 'simulation');
          c.config = { ...c.config, scenario: m!.scenario, revision: c.config.revision + 1 };
          repository.saveCrew(c);
        });
        if (changed) send(ws, { type: 'config', astronautId: c.id, config: c.config });
        return;
      }
      ensure(
        p.role === 'monitor' || p.role === 'astronaut',
        'not-authorized',
        'This action is available only on a monitor.',
      );
      if (p.role === 'astronaut' && 'astronautId' in m)
        ensure(
          m.astronautId === p.astronautId,
          'not-authorized',
          'This personal link is scoped to one astronaut.',
        );
      if (m.type === 'health-checkin') {
        const request = m;
        ensure(validHealthInput(request.input));
        const member = snapshot().crew.find((c) => c.id === request.astronautId);
        ensure(member);
        const event = request.input.eventId ? repository.event(request.input.eventId) : undefined;
        ensure(
          !request.input.eventId || event?.astronautId === member.id,
          'missing-event',
          'Choose a captured moment belonging to this astronaut.',
        );
        command(ws, m, () => {
          const now = Date.now();
          const evidence = healthEvidence(member, event ?? undefined);
          member.healthChecks.push({
            id: request.id,
            createdAt: now,
            phase: member.phase,
            input: structuredClone(request.input),
            evidence,
            guide: buildHealthGuide(request.input, member, evidence, now),
            completedSteps: [],
            followups: [],
          });
          repository.saveCrew(member);
        });
      } else if (m.type === 'health-step' || m.type === 'health-followup') {
        const request = m;
        const member = repository.crew().find((c) => c.id === request.astronautId);
        ensure(member);
        const check = member.healthChecks.find((c) => c.id === request.checkId);
        ensure(check, 'missing-check', 'This check-in is unavailable.');
        command(ws, m, () => {
          if (request.type === 'health-step') {
            ensure(
              Number.isInteger(request.step) &&
                request.step >= 0 &&
                request.step < check.guide.steps.length &&
                typeof request.completed === 'boolean',
            );
            check.completedSteps = request.completed
              ? [...new Set([...check.completedSteps, request.step])]
              : check.completedSteps.filter((s) => s !== request.step);
          } else {
            ensure(['better', 'same', 'worse', 'contacted'].includes(request.outcome));
            check.followups.push({
              id: request.id,
              outcome: request.outcome,
              createdAt: Date.now(),
            });
          }
          repository.saveCrew(member);
        });
      } else if (m.type === 'phase') {
        const request = m;
        const member = repository.crew().find((c) => c.id === request.astronautId);
        ensure(member && ['cabin', 'spacewalk', 'recovery'].includes(request.phase));
        command(ws, m, () => {
          if (member.phase !== request.phase) {
            member.phase = request.phase;
            member.phaseHistory = [
              ...member.phaseHistory,
              { phase: request.phase, changedAt: Date.now() },
            ];
            repository.saveCrew(member);
          }
        });
      } else if (m.type === 'config') {
        const astronautId = m.astronautId;
        ensure(
          p.role === 'monitor' || p.astronautId === astronautId,
          'not-authorized',
          'This personal link is scoped to one astronaut.',
        );
        ensure(validateConfig(m.config));
        const member = repository.crew().find((c) => c.id === astronautId);
        ensure(member);
        const changed = command(ws, m, () => {
          ensure(m!.type === 'config');
          member.config = { ...m!.config, revision: member.config.revision + 1 };
          repository.saveCrew(member);
        });
        if (changed)
          for (const [ring, peer] of peers)
            if (peer.role === 'ring' && peer.astronautId === member.id)
              send(ring, { type: 'config', astronautId: member.id, config: member.config });
      } else if (m.type === 'annotate') {
        ensure(
          typeof m.text === 'string' &&
            m.text.trim().length >= 1 &&
            m.text.length <= 500 &&
            timeOK(m.createdAt),
        );
        const event = repository.event(m.eventId);
        ensure(event, 'missing-event', 'This event is unavailable.');
        ensure(
          p.role === 'monitor' || p.astronautId === event.astronautId,
          'not-authorized',
          'This personal link cannot annotate another astronaut.',
        );
        command(ws, m, () => {
          ensure(m!.type === 'annotate');
          event.annotations.push({
            id: m!.id,
            text: m!.text.trim(),
            createdAt: m!.createdAt,
            receivedAt: Date.now(),
          });
          repository.saveEvent(event);
        });
      } else if (m.type === 'emergency-action') {
        ensure(
          ['acknowledged', 'resolved'].includes(m.action) &&
            typeof m.note === 'string' &&
            m.note.length <= 500,
        );
        const event = repository.event(m.eventId);
        ensure(event?.kind === 'emergency', 'missing-event', 'This emergency is unavailable.');
        ensure(
          p.role === 'monitor' || p.astronautId === event.astronautId,
          'not-authorized',
          'This personal link cannot act on another astronaut.',
        );
        command(ws, m, () => {
          ensure(m!.type === 'emergency-action');
          ensure(
            (m!.action === 'acknowledged' && event.status === 'active') ||
              (m!.action === 'resolved' && event.status === 'acknowledged'),
            'invalid-transition',
            'Acknowledge an active emergency before resolving it.',
          );
          ensure(
            m!.action !== 'resolved' || m!.note.trim().length > 0,
            'note-required',
            'Describe the resolution before closing this emergency.',
          );
          event.status = m!.action;
          event.actions.push({
            id: m!.id,
            action: m!.action,
            note: m!.note.trim(),
            receivedAt: Date.now(),
          });
          repository.saveEvent(event);
        });
      } else if (m.type === 'release') {
        ensure(
          p.role === 'monitor',
          'not-authorized',
          'Ring bindings are managed from the central monitor.',
        );
        const astronautId = m.astronautId;
        const member = repository.crew().find((c) => c.id === astronautId);
        ensure(member);
        const source = m.sourceType ?? 'ring';
        ensure(['ring', 'spacesuit'].includes(source));
        command(ws, m, () => {
          ensure(
            ![...peers.values()].some(
              (peer) => peer.role === source && peer.astronautId === member.id,
            ),
            'device-active',
            'Disconnect the device before releasing its binding.',
          );
          const target = source === 'spacesuit' ? member.suit : member;
          target.deviceId = null;
          target.deviceName = null;
          if (source === 'ring') member.appliedRevision = null;
          repository.saveCrew(member);
        });
      } else throw new Rejected('unknown-message', 'Unknown message type.');
    } catch (error) {
      const requestId =
        m && 'id' in m && typeof m.id === 'string'
          ? m.id
          : m?.type === 'event'
            ? m.event?.id
            : undefined;
      send(ws, {
        type: 'error',
        code: error instanceof Rejected ? error.code : 'server-error',
        message:
          error instanceof Rejected
            ? error.message
            : 'The server could not save this message. Retry after checking server storage.',
        id: requestId,
      });
      if (!(error instanceof Rejected)) console.error('ZENIT message rejected:', error);
    }
  }
  function upgrade(
    req: import('node:http').IncomingMessage,
    socket: import('node:stream').Duplex,
    head: Buffer,
  ) {
    if (req.url?.split('?')[0] !== '/ws') return;
    const origin = req.headers.origin;
    const allowed = process.env.PUBLIC_ORIGIN;
    let validOrigin = true;
    try {
      if (origin)
        validOrigin = allowed ? origin === allowed : new URL(origin).host === req.headers.host;
    } catch {
      validOrigin = false;
    }
    if (!validOrigin) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  }
  server.on('upgrade', upgrade);
  wss.on('connection', (ws) => {
    const deadline = setTimeout(() => {
      if (!peers.has(ws)) ws.close(1008, 'Registration required');
    }, 5000);
    ws.on('message', (raw) => receive(ws, String(raw)));
    ws.on('error', () => {});
    ws.on('close', () => {
      clearTimeout(deadline);
      const p = peers.get(ws);
      peers.delete(ws);
      if (closed) return;
      if (p && (p.role === 'ring' || p.role === 'spacesuit')) {
        const c = repository.crew().find((c) => c.id === p.astronautId);
        if (c) {
          (p.role === 'spacesuit' ? c.suit : c).lastSeen = p.lastSeen;
          repository.saveCrew(c);
        }
      }
      broadcast();
    });
  });
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ws, p] of peers) {
      if (now - p.lastSeen > (options.timeoutMs ?? 16000)) {
        peers.delete(ws);
        ws.terminate();
        broadcast();
      } else send(ws, { type: 'heartbeat', serverTime: now });
    }
  }, options.heartbeatMs ?? 5000);
  const exportLog = () =>
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        simulated: true,
        provenance:
          'Simulated ZENIT rings and suits; actual WebSocket reception. NASA historical data and reference sources remain separate. AI assisted implementation. Change detection and next steps are local and deterministic; an optional Gemini explanation may describe a detected change and does not diagnose or control actions.',
        crew: repository.crew(),
        events: repository.events(-1),
      },
      null,
      2,
    );
  return {
    snapshot,
    repository,
    exportLog,
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      server.off('upgrade', upgrade);
      for (const ws of wss.clients) ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      repository.close();
    },
  };
}
