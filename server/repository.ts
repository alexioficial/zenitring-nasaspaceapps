import { Database } from 'bun:sqlite';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { initialCrew } from '../src/lib/crew/model';
import type { CrewMember, CrewEvent } from '../src/lib/crew/types';

export class Repository {
  readonly db:Database;
  constructor(path:string) {
    if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
    this.db=new Database(path,{create:true});
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS crew (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, received_at INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, request TEXT NOT NULL, response TEXT NOT NULL);`);
    for(const c of initialCrew()) this.db.query('INSERT OR IGNORE INTO crew VALUES (?,?)').run(c.id,JSON.stringify(c));
  }
  crew():CrewMember[] { return (this.db.query('SELECT data FROM crew ORDER BY rowid').all() as {data:string}[]).map(r=>JSON.parse(r.data)); }
  saveCrew(c:CrewMember) { this.db.query('UPDATE crew SET data=? WHERE id=?').run(JSON.stringify({...c,connected:false}),c.id); }
  events(limit=200):CrewEvent[] { return (this.db.query(`SELECT data FROM events WHERE id IN (SELECT id FROM events ORDER BY received_at DESC,rowid DESC LIMIT ?) OR (json_extract(data,'$.kind')='emergency' AND json_extract(data,'$.status')!='resolved') ORDER BY received_at DESC,rowid DESC`).all(limit) as {data:string}[]).map(r=>JSON.parse(r.data)); }
  event(id:string):CrewEvent|null { const row=this.db.query('SELECT data FROM events WHERE id=?').get(id) as {data:string}|null;return row?JSON.parse(row.data):null; }
  saveEvent(e:CrewEvent) { this.db.query('INSERT INTO events VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(e.id,e.receivedAt,JSON.stringify(e)); }
  command(id:string):{request:string;response:string}|null { return this.db.query('SELECT request,response FROM commands WHERE id=?').get(id) as {request:string;response:string}|null; }
  saveCommand(id:string,request:string,response:unknown) { this.db.query('INSERT INTO commands VALUES (?,?,?)').run(id,request,JSON.stringify(response)); }
  transaction(work:()=>void) { this.db.transaction(work)(); }
  close() { this.db.close(); }
}
