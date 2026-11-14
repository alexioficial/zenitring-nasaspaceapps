import { expect, test } from 'bun:test';
import snapshot from '../src/lib/nasa/radlab-dostel1.json';
import { bundledRadiation, parseRadlab, refreshRadiation } from '../src/lib/nasa/radlab';

test('NASA snapshot preserves original dates, units through named fields, nulls and instrument provenance',()=>{
  const series=bundledRadiation();expect(series.points).toHaveLength(84);expect(series.points[0]).toEqual({timestamp:'2022-04-01T23:00:00',instrument:'DosTel1',spacecraft:'ISS',module:'Columbus',absorbedDoseRate:9.815504,doseEquivalentRate:null});expect(series.mode).toBe('bundled');
});
test('parser rejects wrong provenance and malformed measurements instead of substituting zero',()=>{
  const bad=structuredClone(snapshot.response);bad.data[0][2]='bad';expect(()=>parseRadlab(bad)).toThrow();
  bad.data[0][2]=null;expect(parseRadlab(bad)[0].absorbedDoseRate).toBeNull();bad.data[0][1]='OtherDetector';expect(()=>parseRadlab(bad)).toThrow();expect(()=>parseRadlab({columns:[],data:[]})).toThrow();
});
test('refresh failure returns explicitly labelled real historical snapshot',async()=>{
  const fail=(async()=>{throw Error('offline');}) as unknown as typeof fetch;
  const series=await refreshRadiation(fail);expect(series.mode).toBe('bundled');expect(series.message).toContain('unavailable');expect(series.points[0].timestamp).toContain('2022');
});
test('successful retrieval retains historical dates and does not become current mission radiation',async()=>{
  const ok=(async()=>new Response(JSON.stringify(snapshot.response))) as unknown as typeof fetch;
  const series=await refreshRadiation(ok);expect(series.mode).toBe('refreshed');expect(series.message).toContain('historical');expect(series.points[0].timestamp).toContain('2022');
});
