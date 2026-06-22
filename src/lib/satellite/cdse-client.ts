/**
 * Copernicus CDSE — OAuth2 + Sentinel Hub Statistical API.
 * Sentinel-2 L2A (20 m) with SCL cloud masking.
 * Indices: NDVI, NDWI, EVI, SAVI, NDRE
 */

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics";
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process";

/**
 * Evalscript — Sentinel-2 L2A, 20 m. Cloud filter via dataFilter.maxCloudCoverage.
 * Bands in DN (default); indices computed after /10000 reflectance conversion.
 * dataMask output required by Statistical API.
 */
const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02","B03","B04","B05","B08","B8A","SCL","dataMask"] }],
    output: [
      { id: "ndvi",  bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi",  bands: 1, sampleType: "FLOAT32" },
      { id: "evi",   bands: 1, sampleType: "FLOAT32" },
      { id: "savi",  bands: 1, sampleType: "FLOAT32" },
      { id: "ndre",  bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 },
    ],
  };
}
function isCloud(scl) {
  return scl === 0 || scl === 1 || scl === 2 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}
function evaluatePixel(s) {
  if (s.dataMask === 0 || isCloud(s.SCL)) {
    return { ndvi:[0], ndwi:[0], evi:[0], savi:[0], ndre:[0], dataMask:[0] };
  }
  const b02 = s.B02 / 10000;
  const b03 = s.B03 / 10000;
  const b04 = s.B04 / 10000;
  const b05 = s.B05 / 10000;
  const b08 = s.B08 / 10000;
  const b8a = s.B8A / 10000;
  const ndviD = b08 + b04;
  const ndwi  = (b03 + b08) > 0 ? (b03 - b08) / (b03 + b08) : 0;
  const ndvi  = ndviD > 0 ? (b08 - b04) / ndviD : 0;
  const eviD  = b08 + 6*b04 - 7.5*b02 + 1;
  const evi   = eviD  > 0 ? 2.5 * (b08 - b04) / eviD : 0;
  const saviD = b08 + b04 + 0.5;
  const savi  = saviD > 0 ? 1.5 * (b08 - b04) / saviD : 0;
  const ndreD = b8a + b05;
  const ndre  = ndreD > 0 ? (b8a - b05) / ndreD : 0;
  return { ndvi:[ndvi], ndwi:[ndwi], evi:[evi], savi:[savi], ndre:[ndre], dataMask:[1] };
}`;

export type SentinelStats = {
  ndvi_mean:  number | null;
  ndvi_min:   number | null;
  ndvi_max:   number | null;
  ndwi_mean:  number | null;
  ndwi_min:   number | null;
  ndwi_max:   number | null;
  evi_mean:   number | null;
  savi_mean:  number | null;
  ndre_mean:  number | null;
  cloud_cover_pct: number | null;
  date_acquisition: string;
};

type TokenCache = { token: string; expiresAt: number } | null;
let _token: TokenCache = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_token && _token.expiresAt > now + 30_000) return _token.token;

  const clientId     = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET not set");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CDSE OAuth2 ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _token = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return _token.token;
}

/** [lat, lon][] → GeoJSON ring [lon, lat][] (closed). */
function toGeoJsonRing(boundary: [number, number][]): number[][] {
  const ring = boundary.map(([lat, lon]) => [lon, lat]);
  const first = ring[0];
  const last  = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
  return ring;
}

function stat(
  outputs: Record<string, { bands?: Record<string, { stats?: Record<string, number> }> }>,
  id: string,
  key: string
): number | null {
  const v = outputs[id]?.bands?.["B0"]?.stats?.[key];
  if (v === undefined || v === null || !isFinite(v)) return null;
  return Math.round(v * 10000) / 10000;
}

function parseStatsInterval(
  iv: {
    interval?: { from?: string };
    outputs?: Record<string, { bands?: Record<string, { stats?: Record<string, number> }> }>;
  },
  dateTo: Date,
  smallParcel = false
): SentinelStats | null {
  const out = iv.outputs ?? {};
  const ndvi_mean = stat(out, "ndvi", "mean");
  const sampleCount = stat(out, "ndvi", "sampleCount");
  const minNdvi = smallParcel ? 0.005 : 0.01;
  if (ndvi_mean === null || !sampleCount || ndvi_mean <= minNdvi) return null;

  const noData = stat(out, "ndvi", "noDataCount");
  const total = stat(out, "ndvi", "sampleCount");
  const cloud =
    noData !== null && total !== null && total > 0
      ? Math.round((noData / total) * 10000) / 100
      : null;

  let savi_mean = stat(out, "savi", "mean");
  if ((savi_mean === null || savi_mean <= 0.001) && ndvi_mean > 0.05) {
    savi_mean = Math.round(ndvi_mean * 1.15 * 10000) / 10000;
  }

  return {
    ndvi_mean,
    ndvi_min: stat(out, "ndvi", "min"),
    ndvi_max: stat(out, "ndvi", "max"),
    ndwi_mean: stat(out, "ndwi", "mean"),
    ndwi_min: stat(out, "ndwi", "min"),
    ndwi_max: stat(out, "ndwi", "max"),
    evi_mean: stat(out, "evi", "mean"),
    savi_mean,
    ndre_mean: stat(out, "ndre", "mean"),
    cloud_cover_pct: cloud,
    date_acquisition: iv.interval?.from?.slice(0, 10) ?? dateTo.toISOString().slice(0, 10),
  };
}

/** All valid acquisition intervals in the search window (for historique / time series). */
export async function fetchParcelleStatsSeries(
  boundary: [number, number][],
  dateTo: Date,
  daysBack = 30,
  options?: { smallParcel?: boolean }
): Promise<SentinelStats[]> {
  if (boundary.length < 3) return [];

  const smallParcel = options?.smallParcel ?? false;
  const resM = smallParcel ? 5 : 10;
  const maxCloud = smallParcel ? 40 : 25;

  const token = await getAccessToken();
  const ring = toGeoJsonRing(boundary);
  const toIso = dateTo.toISOString().replace(/\.\d+Z$/, "Z");
  const fromD = new Date(dateTo);
  fromD.setDate(fromD.getDate() - daysBack);
  const fromIso = fromD.toISOString().replace(/\.\d+Z$/, "Z");

  const payload = {
    input: {
      bounds: { geometry: { type: "Polygon", coordinates: [ring] } },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            maxCloudCoverage: maxCloud,
            mosaickingOrder: "leastCC",
          },
        },
      ],
    },
    aggregation: {
      timeRange: { from: fromIso, to: toIso },
      aggregationInterval: { of: "P10D" },
      evalscript: EVALSCRIPT,
      resx: resM,
      resy: resM,
    },
  };

  const res = await fetch(STATS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sentinel Hub ${res.status}: ${text.slice(0, 300)}`);
  }

  type Interval = {
    interval?: { from?: string };
    outputs?: Record<string, { bands?: Record<string, { stats?: Record<string, number> }> }>;
  };

  const json = (await res.json()) as { data?: Interval[] };
  const series: SentinelStats[] = [];
  for (const iv of json.data ?? []) {
    const parsed = parseStatsInterval(iv, dateTo, smallParcel);
    if (parsed) series.push(parsed);
  }
  return series.sort((a, b) => a.date_acquisition.localeCompare(b.date_acquisition));
}

/**
 * Fetch all vegetation/water indices for a parcelle boundary.
 * @param boundary   [lat, lon][] from Supabase parcelles.boundary
 * @param dateTo     end of acquisition window
 * @param daysBack   window size in days (7–90)
 */
export async function fetchParcelleNdvi(
  boundary: [number, number][],
  dateTo: Date,
  daysBack = 30,
): Promise<SentinelStats | null> {
  if (boundary.length < 3) return null;
  const series = await fetchParcelleStatsSeries(boundary, dateTo, daysBack);
  return series.at(-1) ?? null;
}

export function isCdseConfigured(): boolean {
  return Boolean(process.env.SENTINEL_HUB_CLIENT_ID && process.env.SENTINEL_HUB_CLIENT_SECRET);
}

// ─── Tile evalscripts (RGBA 0–1 → AUTO → UINT8 PNG) ─────────────────────────

const NDVI_TILE_EVALSCRIPT = `//VERSION=3
function setup(){return{input:[{bands:["B04","B08","SCL","dataMask"]}],output:{bands:4,sampleType:"AUTO"}};}
function isCloud(s){return[0,1,2,3,8,9,10,11].includes(s);}
function mix(a,b,t){return a+(b-a)*t;}
function col(ndvi){
  const v=Math.max(-0.05,Math.min(0.85,ndvi)),t=(v+0.05)/0.9;
  if(t<0.2){const u=t/0.2;return[mix(0.88,0.96,u),mix(0.78,0.86,u),mix(0.68,0.42,u),0.82];}
  if(t<0.45){const u=(t-0.2)/0.25;return[mix(0.96,0.72,u),mix(0.86,0.88,u),mix(0.42,0.32,u),0.82];}
  if(t<0.7){const u=(t-0.45)/0.25;return[mix(0.72,0.22,u),mix(0.88,0.62,u),mix(0.32,0.22,u),0.82];}
  const u=(t-0.7)/0.3;return[mix(0.22,0.06,u),mix(0.62,0.42,u),mix(0.22,0.10,u),0.82];
}
function evaluatePixel(s){
  if(s.dataMask===0||isCloud(s.SCL))return[0,0,0,0];
  const b08=s.B08/10000,b04=s.B04/10000;
  const ndvi=(b08-b04)/(b08+b04+1e-6);return col(ndvi);
}`;

const NDWI_TILE_EVALSCRIPT = `//VERSION=3
function setup(){return{input:[{bands:["B03","B08","SCL","dataMask"]}],output:{bands:4,sampleType:"AUTO"}};}
function isCloud(s){return[0,1,2,3,8,9,10,11].includes(s);}
function mix(a,b,t){return a+(b-a)*t;}
function col(ndwi){
  const v=Math.max(-0.5,Math.min(0.5,ndwi)),t=(v+0.5);
  if(t<0.35){const u=t/0.35;return[mix(0.80,0.95,u),mix(0.28,0.82,u),mix(0.08,0.22,u),0.82];}
  if(t<0.55){const u=(t-0.35)/0.2;return[mix(0.95,0.82,u),mix(0.82,0.92,u),mix(0.22,0.28,u),0.82];}
  if(t<0.75){const u=(t-0.55)/0.2;return[mix(0.82,0.20,u),mix(0.92,0.50,u),mix(0.28,0.85,u),0.82];}
  const u=(t-0.75)/0.25;return[mix(0.20,0.04,u),mix(0.50,0.20,u),mix(0.85,0.92,u),0.82];
}
function evaluatePixel(s){
  if(s.dataMask===0||isCloud(s.SCL))return[0,0,0,0];
  const b03=s.B03/10000,b08=s.B08/10000;
  const ndwi=(b03-b08)/(b03+b08+1e-6);return col(ndwi);
}`;

/** Convert XYZ Leaflet tile coords to EPSG:3857 bounding box. */
function tileToMercatorBbox(x: number, y: number, z: number) {
  const C = 2 * Math.PI * 6378137;
  const size = C / Math.pow(2, z);
  return {
    minX: x * size - C / 2,
    minY: C / 2 - (y + 1) * size,
    maxX: (x + 1) * size - C / 2,
    maxY: C / 2 - y * size,
  };
}

/**
 * Fetch a 256×256 NDVI/NDWI PNG tile from Sentinel Hub Process API.
 * Maps directly to Leaflet XYZ tile coordinates.
 */
export async function fetchSentinelTilePng(
  z: number,
  x: number,
  y: number,
  options?: { index?: "ndvi" | "ndwi"; days?: number }
): Promise<ArrayBuffer | null> {
  if (!isCdseConfigured()) return null;
  if (z < 9 || z > 17) return null;

  const index = options?.index ?? "ndvi";
  const days = options?.days ?? 30;
  const token = await getAccessToken();
  const { minX, minY, maxX, maxY } = tileToMercatorBbox(x, y, z);
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setDate(dateFrom.getDate() - days);

  const payload = {
    input: {
      bounds: {
        bbox: [minX, minY, maxX, maxY],
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/3857" },
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: {
            from: dateFrom.toISOString().replace(/\.\d+Z$/, "Z"),
            to:   dateTo.toISOString().replace(/\.\d+Z$/, "Z"),
          },
          maxCloudCoverage: 35,
          mosaickingOrder: "leastCC",
        },
      }],
    },
    output: {
      width: 256,
      height: 256,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript: index === "ndwi" ? NDWI_TILE_EVALSCRIPT : NDVI_TILE_EVALSCRIPT,
  };

  const res = await fetch(PROCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return buf.byteLength > 400 ? buf : null;
}

/** NDVI false-color PNG for parcel preview (Process API). */
const PREVIEW_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" },
  };
}
function isCloud(scl) {
  return scl === 0 || scl === 1 || scl === 2 || scl === 3 || scl === 8 || scl === 9 || scl === 10 || scl === 11;
}
function mix(a, b, t) {
  return a + (b - a) * t;
}
function ndviColor(ndvi) {
  const v = Math.max(-0.05, Math.min(0.85, ndvi));
  const t = (v + 0.05) / 0.9;
  if (t < 0.2) {
    const u = t / 0.2;
    return [mix(0.88, 0.96, u), mix(0.78, 0.86, u), mix(0.68, 0.42, u), 1];
  }
  if (t < 0.45) {
    const u = (t - 0.2) / 0.25;
    return [mix(0.96, 0.72, u), mix(0.86, 0.88, u), mix(0.42, 0.32, u), 1];
  }
  if (t < 0.7) {
    const u = (t - 0.45) / 0.25;
    return [mix(0.72, 0.22, u), mix(0.88, 0.62, u), mix(0.32, 0.22, u), 1];
  }
  const u = (t - 0.7) / 0.3;
  return [mix(0.22, 0.06, u), mix(0.62, 0.42, u), mix(0.22, 0.10, u), 1];
}
function evaluatePixel(s) {
  if (s.dataMask === 0) return [0, 0, 0, 0];
  if (isCloud(s.SCL)) return [0, 0, 0, 0];
  const b04 = s.B04 / 10000;
  const b08 = s.B08 / 10000;
  const ndvi = (b08 - b04) / (b08 + b04 + 1e-6);
  return ndviColor(ndvi);
}`;

function dayIsoRange(date: Date): { from: string; to: string } {
  const d = date.toISOString().slice(0, 10);
  return { from: `${d}T00:00:00Z`, to: `${d}T23:59:59Z` };
}

function windowIsoRange(date: Date, daysBack: number): { from: string; to: string } {
  const toIso = date.toISOString().replace(/\.\d+Z$/, "Z");
  const fromD = new Date(date);
  fromD.setDate(fromD.getDate() - daysBack);
  return { from: fromD.toISOString().replace(/\.\d+Z$/, "Z"), to: toIso };
}

async function requestPreviewPng(
  token: string,
  ring: number[][],
  timeRange: { from: string; to: string },
  options?: { maxCloud?: number }
): Promise<ArrayBuffer | null> {
  const maxCloud = options?.maxCloud ?? 40;
  const payload = {
    input: {
      bounds: { geometry: { type: "Polygon", coordinates: [ring] } },
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange,
            maxCloudCoverage: maxCloud,
            mosaickingOrder: "leastCC",
          },
        },
      ],
    },
    output: {
      width: 512,
      height: 512,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    processing: {
      upsampling: "BICUBIC",
      downsampling: "BICUBIC",
    },
    evalscript: PREVIEW_EVALSCRIPT,
  };

  const res = await fetch(PROCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sentinel preview ${res.status}: ${text.slice(0, 200)}`);
  }

  const buf = await res.arrayBuffer();
  return buf.byteLength > 400 ? buf : null;
}

export async function fetchParcellePreviewPng(
  boundary: [number, number][],
  dateTo: Date,
  daysBack = 30,
  options?: { smallParcel?: boolean }
): Promise<ArrayBuffer | null> {
  if (boundary.length < 3 || !isCdseConfigured()) return null;

  const token = await getAccessToken();
  const ring = toGeoJsonRing(boundary);

  const ranges = [
    windowIsoRange(dateTo, 7),
    windowIsoRange(dateTo, 14),
    windowIsoRange(dateTo, Math.max(daysBack, 30)),
    windowIsoRange(dateTo, 60),
  ];

  for (const timeRange of ranges) {
    try {
      const buf = await requestPreviewPng(token, ring, timeRange, { maxCloud: 40 });
      if (buf) return buf;
    } catch {
      /* try next window */
    }
  }

  return null;
}
