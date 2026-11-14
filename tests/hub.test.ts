import { afterEach, describe, expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { attachHub } from '../server/hub';
import { defaultConfig } from '../src/lib/crew/model';
import type { ServerMessage, MissionState } from '../src/lib/crew/types';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

const cleanups:(()=>Promise<void>)[]=[];
afterEach(async()=>{ for(const close of cleanups.splice(0).reverse()) await close(); });
async function fixture(path=':memory:') {
  const http=createServer((_req,res)=>res.end('ok'));
  const hub=attachHub(http,path,{heartbeatMs:50,timeoutMs:1000});
  await new Promise<void>(resolve=>http.listen(0,'127.0.0.1',resolve));
  const address=http.address(); if(!address || typeof address==='string') throw Error('No port');
  cleanups.push(async()=>{await hub.close();http.closeAllConnections();http.close();});
  return {hub,url:`ws://127.0.0.1:${address.port}/ws`};
}
async function client(url:string, role:'ring'|'monitor',deviceId:string,astronautId?:string) {
  const ws=new WebSocket(url); const messages:ServerMessage[]=[];
  ws.addEventListener('message',event=>messages.push(JSON.parse(String(event.data))));
  await new Promise<void>((resolve,reject)=>{ws.addEventListener('open',()=>resolve(),{once:true});ws.addEventListener('error',reject,{once:true});});
  cleanups.push(async()=>{ws.close();});
  const wait=async(predicate:(m:ServerMessage)=>boolean)=>{
    const end=Date.now()+2500;
    while(Date.now()<end) {const i=messages.findIndex(predicate);if(i>=0)return messages.splice(i,1)[0]; await Bun.sleep(5);}
    throw Error('Message timeout: '+JSON.stringify(messages));
  };
  ws.send(JSON.stringify({type:'register',role,deviceId,astronautId,deviceName:'Test ring'}));
  return {ws,wait,send:(m:unknown)=>ws.send(JSON.stringify(m)),messages};
}
const values={pulse:82,hrv:45,spo2:98,skin:0.2,respiration:16};
const event=(id:string)=>({id,deviceId:'ring-a',astronautId:'vega',occurredAt:Date.now()-120000,kind:'emergency',gesture:'swipe',snapshot:values,snapshotAt:Date.now()-120000});

describe('shared WebSocket mission',()=>{
  test('an older unresolved emergency remains visible beyond the recent-history window',async()=>{
    const {hub}=await fixture();
    const old={...event('old-emergency'),receivedAt:1000,status:'active',actions:[],annotations:[]} as const;
    hub.repository.saveEvent(structuredClone(old) as any);
    for(let i=0;i<205;i++)hub.repository.saveEvent({...event(`moment-${i}`),kind:'moment',gesture:'double-tap',receivedAt:2000+i,status:'active',annotations:[],actions:[]} as any);
    expect(hub.snapshot().events.some(e=>e.id==='old-emergency')).toBe(true);
  });
  test('server restart preserves event evidence, configuration, notes and ring reservation',async()=>{
    const path=join(tmpdir(),`zenit-restart-${crypto.randomUUID()}.sqlite`);
    cleanups.push(async()=>{for(const suffix of ['', '-wal','-shm'])rmSync(path+suffix,{force:true});});
    const first=await fixture(path);const ring=await client(first.url,'ring','ring-a','vega');await ring.wait(m=>m.type==='registered');
    ring.send({type:'event',event:event('persistent')});await ring.wait(m=>m.type==='ack');
    await first.hub.close();
    const second=await fixture(path);const saved=second.hub.snapshot();
    expect(saved.events[0].id).toBe('persistent');expect(saved.events[0].snapshot?.pulse).toBe(82);
    expect(saved.crew[0].deviceId).toBe('ring-a');expect(saved.crew[0].connected).toBe(false);
    const resumed=await client(second.url,'ring','ring-a','vega');await resumed.wait(m=>m.type==='registered');
    resumed.send({type:'event',event:{...event('persistent'),occurredAt:saved.events[0].occurredAt,snapshotAt:saved.events[0].snapshotAt}});await resumed.wait(m=>m.type==='ack');
    expect(second.hub.snapshot().events).toHaveLength(1);
  });
  test('multiple independent rings route their real telemetry to the right crew member',async()=>{
    const {url}=await fixture(); const monitor=await client(url,'monitor','tablet');
    await monitor.wait(m=>m.type==='registered');
    const a=await client(url,'ring','ring-a','vega'); const b=await client(url,'ring','ring-b','nova');
    await a.wait(m=>m.type==='registered');await b.wait(m=>m.type==='registered');
    a.send({type:'telemetry',id:'sample-a',deviceId:'ring-a',astronautId:'vega',measuredAt:Date.now(),values});
    b.send({type:'telemetry',id:'sample-b',deviceId:'ring-b',astronautId:'nova',measuredAt:Date.now(),values:{...values,pulse:91}});
    const state=await monitor.wait(m=>m.type==='state' && m.state.crew.find(c=>c.id==='nova')?.latest?.values.pulse===91);
    expect(state.type==='state' && state.state.crew.find(c=>c.id==='vega')?.latest?.values.pulse).toBe(82);
  });
  test('binding is exclusive, including while the original ring is offline',async()=>{
    const {url}=await fixture();const a=await client(url,'ring','ring-a','vega');await a.wait(m=>m.type==='registered');
    const b=await client(url,'ring','ring-b','vega');expect((await b.wait(m=>m.type==='error')).type).toBe('error');
    a.ws.close();await Bun.sleep(30);
    const c=await client(url,'ring','ring-c','vega');const error=await c.wait(m=>m.type==='error');
    expect(error.type==='error' && error.code).toBe('binding-conflict');
  });
  test('lost-ack retries preserve original snapshots and never duplicate an emergency',async()=>{
    const {url,hub}=await fixture();const a=await client(url,'ring','ring-a','vega');await a.wait(m=>m.type==='registered');
    const e=event('emergency-1');a.send({type:'event',event:e});const ack=await a.wait(m=>m.type==='ack' && m.id===e.id);
    a.send({type:'event',event:e});await a.wait(m=>m.type==='ack' && m.id===e.id);
    const saved=hub.snapshot().events;
    expect(saved).toHaveLength(1);expect(saved[0].occurredAt).toBe(e.occurredAt);expect(saved[0].snapshot).toEqual(values);
    expect(ack.type==='ack' && ack.receivedAt).toBeGreaterThan(e.occurredAt+100000);
    a.send({type:'event',event:{...e,snapshot:{...values,pulse:150}}});
    const conflict=await a.wait(m=>m.type==='error');expect(conflict.type==='error' && conflict.code).toBe('id-conflict');
  });
  test('recognition, resolution and notes are independent persistent audit records',async()=>{
    const {url,hub}=await fixture(); const ring=await client(url,'ring','ring-a','vega');await ring.wait(m=>m.type==='registered');
    ring.send({type:'event',event:event('e')});await ring.wait(m=>m.type==='ack');
    const monitor=await client(url,'monitor','tablet');await monitor.wait(m=>m.type==='registered');
    monitor.send({type:'emergency-action',id:'bad',eventId:'e',action:'resolved',note:'Checked'});
    await monitor.wait(m=>m.type==='error');expect(hub.snapshot().events[0].status).toBe('active');
    monitor.send({type:'emergency-action',id:'ack',eventId:'e',action:'acknowledged',note:''});await monitor.wait(m=>m.type==='ack');
    expect(hub.snapshot().events[0].status).toBe('acknowledged');
    monitor.send({type:'annotate',id:'note',eventId:'e',text:'Astronaut reports dizziness',createdAt:Date.now()});await monitor.wait(m=>m.type==='ack');
    monitor.send({type:'emergency-action',id:'resolve',eventId:'e',action:'resolved',note:'Crew checked in; demonstration ended'});await monitor.wait(m=>m.type==='ack');
    const e=hub.snapshot().events[0];expect(e.status).toBe('resolved');expect(e.actions).toHaveLength(2);expect(e.annotations[0].text).toContain('dizziness');expect(e.snapshot?.pulse).toBe(82);
  });
  test('configuration reaches only the actual target emitter and records application',async()=>{
    const {url,hub}=await fixture();const ring=await client(url,'ring','ring-a','vega');await ring.wait(m=>m.type==='registered');
    const monitor=await client(url,'monitor','tablet');await monitor.wait(m=>m.type==='registered');
    monitor.send({type:'config',id:'config',astronautId:'vega',config:{...defaultConfig,intervalMs:1000}});
    const update=await ring.wait(m=>m.type==='config');
    expect(update.type==='config' && update.config.intervalMs).toBe(1000);
    ring.send({type:'config-applied',astronautId:'vega',revision:2});await Bun.sleep(20);
    expect(hub.snapshot().crew[0].appliedRevision).toBe(2);
    expect(hub.snapshot().crew[1].config.intervalMs).toBe(3000);
  });
  test('rings cannot annotate or spoof another astronaut and malformed data is rejected',async()=>{
    const {url,hub}=await fixture();const ring=await client(url,'ring','ring-a','vega');await ring.wait(m=>m.type==='registered');
    ring.send({type:'telemetry',id:'spoof',deviceId:'ring-a',astronautId:'nova',measuredAt:Date.now(),values});await ring.wait(m=>m.type==='error');
    ring.send({type:'annotate',id:'note',eventId:'x',text:'spoof',createdAt:Date.now()});await ring.wait(m=>m.type==='error');
    ring.send({type:'telemetry',id:'invalid',deviceId:'ring-a',astronautId:'vega',measuredAt:Date.now(),values:{...values,spo2:1000}});await ring.wait(m=>m.type==='error');
    expect(hub.snapshot().crew[0].latest).toBeNull();
  });
});
