import { crewDefaults } from './model';
import type { Metrics, Scenario } from './types';

export function simulate(astronautId:string, elapsedMs:number, scenario:Scenario, previous?:Metrics, stepMs=3000):Metrics {
  const index=Math.max(0,crewDefaults.findIndex(c=>c.id===astronautId));
  const t=elapsedMs/1000;
  const stress=scenario==='normal'?0:scenario==='drift'?0.5:1;
  const target:Metrics={
    pulse:74+index*5+Math.sin(t/18+index)*3+stress*65,
    hrv:55-index*5+Math.sin(t/25+index)*3-stress*32,
    spo2:98-index*0.3+Math.sin(t/31+index)*0.3-stress*7,
    skin:0.1+index*0.05+Math.sin(t/45)*0.1+stress*1.4,
    respiration:14+index+Math.sin(t/22)*0.8+stress*12
  };
  const rates:Metrics={pulse:3,hrv:2,spo2:0.35,skin:0.08,respiration:0.8};
  return Object.fromEntries(Object.entries(target).map(([key,v])=>{
    const k=key as keyof Metrics;
    const limit=rates[k]*Math.min(5,Math.max(0.1,stepMs/3000));
    const value=previous ? previous[k]+Math.max(-limit,Math.min(limit,v-previous[k])) : v;
    return [k,Math.round(value*100)/100];
  })) as Metrics;
}
