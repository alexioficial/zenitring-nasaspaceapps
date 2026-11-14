import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { Repository } from './repository';
import { validateConfig, validMetrics } from '../src/lib/crew/model';
import type { ClientMessage, CrewEvent, EventInput, MissionState, ServerMessage } from '../src/lib/crew/types';

type Peer={ role:'ring'|'monitor'; deviceId:string; astronautId?:string; lastSeen:number };
class Rejected extends Error { constructor(public code:string,message:string){super(message);} }
const idOK=(v:unknown):v is string=>typeof v==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
const timeOK=(v:unknown):v is number=>typeof v==='number' && Number.isFinite(v) && v>=946684800000 && v<=Date.now()+60000;
function ensure(ok:unknown,code='invalid-message',message='This message is invalid.'):asserts ok { if(!ok) throw new Rejected(code,message); }
const eventInput=(e:CrewEvent):EventInput=>({id:e.id,deviceId:e.deviceId,astronautId:e.astronautId,occurredAt:e.occurredAt,kind:e.kind,gesture:e.gesture,snapshot:e.snapshot,snapshotAt:e.snapshotAt});

export function attachHub(server:Server, databasePath='data/zenit.sqlite', options:{heartbeatMs?:number;timeoutMs?:number}={}) {
  const repository=new Repository(databasePath);
  let closed=false;
  const peers=new Map<WebSocket,Peer>();
  const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false});
  const send=(ws:WebSocket,m:ServerMessage)=>{if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(m));};
  function snapshot():MissionState {
    return {serverTime:Date.now(),events:repository.events(),crew:repository.crew().map(c=>{
      const peer=[...peers.values()].find(p=>p.role==='ring' && p.astronautId===c.id);
      return {...c,connected:!!peer,lastSeen:peer?.lastSeen??c.lastSeen};
    })};
  }
  const broadcast=()=>{const message:ServerMessage={type:'state',state:snapshot()};for(const [ws,p] of peers) if(p.role==='monitor')send(ws,message);};
  function command(ws:WebSocket,m:ClientMessage & {id:string},mutate:()=>void) {
    ensure(idOK(m.id)); const request=JSON.stringify(m); const old=repository.command(m.id);
    if(old) {ensure(old.request===request,'id-conflict','This ID already belongs to a different command.');send(ws,JSON.parse(old.response));return false;}
    const ack:ServerMessage={type:'ack',id:m.id,receivedAt:Date.now()};
    repository.transaction(()=>{mutate();repository.saveCommand(m.id,request,ack);});
    send(ws,ack);broadcast();return true;
  }
  function receive(ws:WebSocket, raw:string) {
    let m:ClientMessage|undefined;
    try {
      const value:unknown=JSON.parse(raw);
      ensure(value && typeof value==='object' && !Array.isArray(value)); m=value as ClientMessage;
      if(m.type==='register') {
        const registration=m;
        ensure(!peers.has(ws),'already-registered','Reconnect to change your device binding.');
        ensure(idOK(m.deviceId) && ['ring','monitor'].includes(m.role));
        ensure(![...peers.values()].some(p=>p.deviceId===registration.deviceId),'device-active','This device already has an active connection.');
        if(m.role==='ring') {
          const c=repository.crew().find(c=>c.id===registration.astronautId);
          ensure(c,'unknown-astronaut','Select a crew member.');
          ensure(!c.deviceId || c.deviceId===m.deviceId,'binding-conflict','This astronaut is reserved for another ring. Release it from the monitor after disconnecting that ring.');
          ensure(![...peers.values()].some(p=>p.role==='ring' && p.astronautId===c.id),'binding-conflict','This astronaut already has an active ring.');
          ensure(!repository.crew().some(other=>other.id!==c.id && other.deviceId===registration.deviceId),'binding-conflict','This ring is reserved for another astronaut. Release its previous binding first.');
          c.deviceId=m.deviceId;c.deviceName=typeof m.deviceName==='string'?m.deviceName.slice(0,60):'Simulated ring';c.lastSeen=Date.now();c.appliedRevision=null;repository.saveCrew(c);
          peers.set(ws,{role:'ring',deviceId:m.deviceId,astronautId:c.id,lastSeen:Date.now()});
          send(ws,{type:'registered',role:'ring',astronautId:c.id,config:c.config});
        } else { peers.set(ws,{role:'monitor',deviceId:m.deviceId,lastSeen:Date.now()});send(ws,{type:'registered',role:'monitor'});send(ws,{type:'state',state:snapshot()}); }
        broadcast();return;
      }
      const p=peers.get(ws);ensure(p,'not-registered','Register this device first.');p.lastSeen=Date.now();
      if(m.type==='heartbeat') {send(ws,{type:'heartbeat',serverTime:Date.now()});return;}
      const c=repository.crew().find(c=>c.id===p.astronautId);
      if(m.type==='telemetry') {
        ensure(p.role==='ring' && c && m.deviceId===p.deviceId && m.astronautId===p.astronautId,'not-authorized','A ring may transmit only its own signals.');
        ensure(idOK(m.id) && timeOK(m.measuredAt) && validMetrics(m.values));
        const measured=m;
        if(!c.latest || measured.measuredAt>c.latest.measuredAt) {
          const sample={...measured,receivedAt:Date.now()};c.latest=sample;c.samples=[...c.samples,sample].slice(-120);c.lastSeen=sample.receivedAt;repository.saveCrew(c);broadcast();
        }
        return;
      }
      if(m.type==='config-applied') {
        ensure(p.role==='ring' && c && m.astronautId===p.astronautId && m.revision===c.config.revision);
        c.appliedRevision=m.revision;repository.saveCrew(c);broadcast();return;
      }
      if(m.type==='event') {
        const e=m.event;ensure(p.role==='ring' && c && e && e.deviceId===p.deviceId && e.astronautId===p.astronautId,'not-authorized','This event does not belong to the linked ring.');
        ensure(idOK(e.id) && timeOK(e.occurredAt) && ['moment','emergency'].includes(e.kind) && ['double-tap','swipe','button'].includes(e.gesture));
        ensure((e.kind==='moment' && e.gesture!=='swipe') || (e.kind==='emergency' && e.gesture!=='double-tap'));
        ensure((e.snapshot===null && e.snapshotAt===null) || (validMetrics(e.snapshot) && timeOK(e.snapshotAt) && e.snapshotAt<=e.occurredAt+1000));
        const old=repository.event(e.id);
        if(old) {
          ensure(JSON.stringify(eventInput(old))===JSON.stringify(eventInput(e as CrewEvent)),'id-conflict','This event ID already has different evidence.');
          send(ws,{type:'ack',id:old.id,receivedAt:old.receivedAt,event:old});return;
        }
        const saved:CrewEvent={...eventInput(e as CrewEvent),receivedAt:Date.now(),status:'active',annotations:[],actions:[]};
        repository.saveEvent(saved);send(ws,{type:'ack',id:saved.id,receivedAt:saved.receivedAt,event:saved});broadcast();return;
      }
      if(m.type==='simulation') {
        ensure(p.role==='ring' && c && ['normal','drift','excursion'].includes(m.scenario));
        const changed=command(ws,m,()=>{ensure(m!.type==='simulation');c.config={...c.config,scenario:m!.scenario,revision:c.config.revision+1};repository.saveCrew(c);});
        if(changed)send(ws,{type:'config',astronautId:c.id,config:c.config});return;
      }
      // All remaining messages are central-monitor operations.
      ensure(p.role==='monitor','not-authorized','This action is available only on the crew monitor.');
      if(m.type==='config') {
        const astronautId=m.astronautId;
        ensure(validateConfig(m.config));const member=repository.crew().find(c=>c.id===astronautId);ensure(member);
        const changed=command(ws,m,()=>{ensure(m!.type==='config');member.config={...m!.config,revision:member.config.revision+1};repository.saveCrew(member);});
        if(changed) for(const [ring,peer] of peers) if(peer.role==='ring' && peer.astronautId===member.id)send(ring,{type:'config',astronautId:member.id,config:member.config});
      } else if(m.type==='annotate') {
        ensure(typeof m.text==='string' && m.text.trim().length>=1 && m.text.length<=500 && timeOK(m.createdAt));
        const event=repository.event(m.eventId);ensure(event,'missing-event','This event is unavailable.');
        command(ws,m,()=>{ensure(m!.type==='annotate');event.annotations.push({id:m!.id,text:m!.text.trim(),createdAt:m!.createdAt,receivedAt:Date.now()});repository.saveEvent(event);});
      } else if(m.type==='emergency-action') {
        ensure(['acknowledged','resolved'].includes(m.action) && typeof m.note==='string' && m.note.length<=500);
        const event=repository.event(m.eventId);ensure(event?.kind==='emergency','missing-event','This emergency is unavailable.');
        command(ws,m,()=>{ensure(m!.type==='emergency-action');ensure((m!.action==='acknowledged' && event.status==='active') || (m!.action==='resolved' && event.status==='acknowledged'),'invalid-transition','Acknowledge an active emergency before resolving it.');ensure(m!.action!=='resolved' || m!.note.trim().length>0,'note-required','Describe the resolution before closing this emergency.');event.status=m!.action;event.actions.push({id:m!.id,action:m!.action,note:m!.note.trim(),receivedAt:Date.now()});repository.saveEvent(event);});
      } else if(m.type==='release') {
        const astronautId=m.astronautId;
        const member=repository.crew().find(c=>c.id===astronautId);ensure(member);
        command(ws,m,()=>{ensure(![...peers.values()].some(peer=>peer.role==='ring' && peer.astronautId===member.id),'device-active','Disconnect the ring before releasing its binding.');member.deviceId=null;member.deviceName=null;member.appliedRevision=null;repository.saveCrew(member);});
      } else throw new Rejected('unknown-message','Unknown message type.');
    } catch(error) {
      const requestId=m && 'id' in m && typeof m.id==='string'?m.id:m?.type==='event'?m.event?.id:undefined;
      send(ws,{type:'error',code:error instanceof Rejected?error.code:'server-error',message:error instanceof Rejected?error.message:'The server could not save this message. Retry after checking server storage.',id:requestId});
      if(!(error instanceof Rejected)) console.error('ZENIT message rejected:',error);
    }
  }
  function upgrade(req:import('node:http').IncomingMessage,socket:import('node:stream').Duplex,head:Buffer) {
    if(req.url?.split('?')[0]!=='/ws')return;
    const origin=req.headers.origin;
    const allowed=process.env.PUBLIC_ORIGIN;
    let validOrigin=true;
    try{if(origin)validOrigin=allowed?origin===allowed:new URL(origin).host===req.headers.host;}catch{validOrigin=false;}
    if(!validOrigin) {socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  }
  server.on('upgrade',upgrade);
  wss.on('connection',ws=>{
    const deadline=setTimeout(()=>{if(!peers.has(ws))ws.close(1008,'Registration required');},5000);
    ws.on('message',raw=>receive(ws,String(raw)));
    ws.on('error',()=>{});
    ws.on('close',()=>{clearTimeout(deadline);const p=peers.get(ws);peers.delete(ws);if(closed)return;if(p?.role==='ring'){const c=repository.crew().find(c=>c.id===p.astronautId);if(c){c.lastSeen=p.lastSeen;repository.saveCrew(c);}}broadcast();});
  });
  const timer=setInterval(()=>{const now=Date.now();for(const [ws,p] of peers){if(now-p.lastSeen>(options.timeoutMs??16000)){peers.delete(ws);ws.terminate();broadcast();}else send(ws,{type:'heartbeat',serverTime:now});}},options.heartbeatMs??5000);
  const exportLog=()=>JSON.stringify({exportedAt:new Date().toISOString(),simulated:true,provenance:'Simulated ZENIT rings; actual WebSocket reception. AI assisted implementation; no AI health assessment.',crew:repository.crew(),events:repository.events(-1)},null,2);
  return {snapshot,repository,exportLog,async close(){if(closed)return;closed=true;clearInterval(timer);server.off('upgrade',upgrade);for(const ws of wss.clients)ws.terminate();await new Promise<void>(resolve=>wss.close(()=>resolve()));repository.close();}};
}
