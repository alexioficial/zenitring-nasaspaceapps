import type { ClientMessage, ServerMessage } from './types';
export type LinkStatus='offline'|'connecting'|'online'|'conflict';
export function socketUrl() { return `${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`; }
export class MissionConnection {
  status:LinkStatus='offline';
  error='';
  private socket:WebSocket|null=null;
  private retry:ReturnType<typeof setTimeout>|undefined;
  private heartbeat:ReturnType<typeof setInterval>|undefined;
  private lastMessage=0;
  private reconnect=true;
  private attempts=0;
  private commands=new Map<string,ClientMessage>();
  private register:Extract<ClientMessage,{type:'register'}>;
  constructor(private options:{url:string;register:Extract<ClientMessage,{type:'register'}>;onMessage:(m:ServerMessage)=>void;onChange?:()=>void}) {this.register=options.register;}
  private changed(){this.options.onChange?.();}
  connect() {
    this.reconnect=true;clearTimeout(this.retry);
    if(this.socket && this.socket.readyState<2)return;
    this.status='connecting';this.error='';this.changed();
    const socket=new WebSocket(this.options.url);this.socket=socket;this.lastMessage=Date.now();
    socket.onopen=()=>{if(this.socket===socket)socket.send(JSON.stringify(this.register));};
    socket.onmessage=event=>{
      if(this.socket!==socket)return;
      let m:ServerMessage;try{m=JSON.parse(String(event.data));}catch{return;}
      this.lastMessage=Date.now();
      if(m.type==='registered') {this.status='online';this.attempts=0;this.error='';for(const command of this.commands.values())socket.send(JSON.stringify(command));}
      if(m.type==='ack')this.commands.delete(m.id);
      if(m.type==='error') {
        this.error=m.message;if(m.id)this.commands.delete(m.id);
        if(['binding-conflict','device-active','unknown-astronaut'].includes(m.code)){this.status='conflict';this.reconnect=false;socket.close();}
      }
      this.options.onMessage(m);this.changed();
    };
    socket.onerror=()=>{this.error='Connection interrupted. Check the mission server and network.';this.changed();};
    socket.onclose=()=>{
      if(this.socket!==socket)return;this.socket=null;
      if(this.status!=='conflict')this.status='offline';this.changed();
      if(this.reconnect)this.retry=setTimeout(()=>this.connect(),Math.min(8000,500*2**this.attempts++));
    };
    clearInterval(this.heartbeat);
    this.heartbeat=setInterval(()=>{
      if(this.socket?.readyState===WebSocket.OPEN){if(Date.now()-this.lastMessage>16000)this.socket.close();else this.socket.send(JSON.stringify({type:'heartbeat',sentAt:Date.now()}));}
      if(this.status==='online')for(const command of this.commands.values())this.send(command);
    },3000);
  }
  send(message:ClientMessage) {if(this.status==='online' && this.socket?.readyState===WebSocket.OPEN){this.socket.send(JSON.stringify(message));return true;}return false;}
  command(message:ClientMessage & {id:string}) {this.commands.set(message.id,message);this.send(message);this.changed();}
  pending(id:string) {return this.commands.has(id);}
  disconnect() {
    this.reconnect=false;clearTimeout(this.retry);clearInterval(this.heartbeat);
    const socket=this.socket;this.socket=null;socket?.close();this.status='offline';this.changed();
  }
  dispose(){this.disconnect();this.commands.clear();}
}
