import snapshot from './radlab-dostel1.json';

export const radlabQueryUrl = snapshot.queryUrl;
export const radlabDocs = 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/';
export type RadiationPoint = {
  timestamp: string;
  instrument: string;
  spacecraft: string;
  module: string;
  absorbedDoseRate: number | null;
  doseEquivalentRate: number | null;
};
export type RadiationSeries = {
  points: RadiationPoint[];
  retrievedAt: string;
  queryUrl: string;
  mode: 'bundled' | 'refreshed';
  message: string;
};

export function parseRadlab(raw: unknown): RadiationPoint[] {
  if (!raw || typeof raw !== 'object') throw Error('Invalid RadLab response');
  const { columns, data } = raw as { columns: unknown; data: unknown };
  if (
    !Array.isArray(columns) ||
    !columns.every((c) => typeof c === 'string') ||
    !Array.isArray(data) ||
    data.length === 0 ||
    data.length > 5000
  )
    throw Error('Unexpected RadLab table');
  const required = [
    'timestamp',
    'instrument_id',
    'spacecraft',
    'module',
    'absorbed_dose_rate',
    'dose_equivalent_rate',
  ];
  if (required.some((k) => !columns.includes(k))) throw Error('Missing RadLab fields');
  const dose = (v: unknown) => {
    if (v === null || v === 'NA') return null;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw Error('Invalid dose rate');
    return v;
  };
  const points = data.map((row) => {
    if (!Array.isArray(row) || row.length !== columns.length) throw Error('Invalid RadLab row');
    const get = (key: string) => row[columns.indexOf(key)];
    const timestamp = get('timestamp');
    if (
      typeof timestamp !== 'string' ||
      !/^2022-04-0[12]T\d{2}:\d{2}:\d{2}$/.test(timestamp) ||
      !Number.isFinite(Date.parse(timestamp + 'Z'))
    )
      throw Error('Invalid observation time');
    if (
      timestamp < '2022-04-01T23:00:00' ||
      timestamp >= '2022-04-02T01:05:00' ||
      get('instrument_id') !== 'DosTel1' ||
      get('spacecraft') !== 'ISS' ||
      get('module') !== 'Columbus'
    )
      throw Error('Unexpected RadLab provenance');
    return {
      timestamp,
      instrument: 'DosTel1',
      spacecraft: 'ISS',
      module: 'Columbus',
      absorbedDoseRate: dose(get('absorbed_dose_rate')),
      doseEquivalentRate: dose(get('dose_equivalent_rate')),
    };
  });
  return points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
export function bundledRadiation(
  message = 'Saved NASA response · available without an external connection',
): RadiationSeries {
  return {
    points: parseRadlab(snapshot.response),
    retrievedAt: snapshot.retrievedAt,
    queryUrl: snapshot.queryUrl,
    mode: 'bundled',
    message,
  };
}

// All requests use the same bounded historical query; no arbitrary upstream URLs.
export async function refreshRadiation(fetcher: typeof fetch = fetch): Promise<RadiationSeries> {
  try {
    const response = await fetcher(radlabQueryUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw Error('RadLab unavailable');
    const text = await response.text();
    if (text.length > 2_000_000) throw Error('RadLab response too large');
    const points = parseRadlab(JSON.parse(text));
    return {
      points,
      queryUrl: radlabQueryUrl,
      retrievedAt: new Date().toISOString(),
      mode: 'refreshed',
      message: 'NASA API response · observations remain historical',
    };
  } catch {
    return bundledRadiation('NASA refresh unavailable · showing the saved historical response');
  }
}
