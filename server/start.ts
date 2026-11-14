import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { attachHub } from './hub';

const builtHandler=pathToFileURL(resolve('build/handler.js')).href;
const { handler }=await import(builtHandler);
const http=createServer((req,res)=>{
  if(req.url?.split('?')[0]==='/api/mission-export' && req.method==='GET'){
    res.writeHead(200,{'content-type':'application/json','content-disposition':'attachment; filename="zenit-complete-log.json"','cache-control':'no-store'});res.end(hub.exportLog());return;
  }
  handler(req,res);
});
const hub=attachHub(http,process.env.MISSION_DB_PATH??'data/zenit.sqlite');
const port=Number(process.env.PORT??3000);
http.listen(port,process.env.HOST??'0.0.0.0',()=>console.log(`ZENIT monitor + rings: http://${process.env.HOST??'0.0.0.0'}:${port} · WebSocket /ws`));
async function stop() {await hub.close();http.closeAllConnections();http.close();process.exit(0);}
process.once('SIGTERM',()=>void stop());process.once('SIGINT',()=>void stop());
