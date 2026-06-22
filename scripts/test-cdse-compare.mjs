const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics";

function makeEvalscript(orbit) {
  const mosaicking = orbit ? ', mosaicking: "ORBIT"' : "";
  return `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02","B03","B04","B05","B08","B8A","dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 },
    ]${mosaicking}
  };
}
function evaluatePixel(s) {
  if (s.dataMask === 0) return { ndvi:[0], ndwi:[0], dataMask:[0] };
  const b03 = s.B03 / 10000, b04 = s.B04 / 10000, b08 = s.B08 / 10000;
  const ndviD = b08 + b04;
  const ndvi = ndviD > 0 ? (b08 - b04) / ndviD : 0;
  const ndwi = (b03 + b08) > 0 ? (b03 - b08) / (b03 + b08) : 0;
  return { ndvi:[ndvi], ndwi:[ndwi], dataMask:[1] };
}`;
}

const boundary = [
  [34.996, -0.542],
  [34.996, -0.53],
  [34.989, -0.53],
  [34.989, -0.542],
];
const ring = boundary.map(([lat, lon]) => [lon, lat]);
ring.push([...ring[0]]);

async function fetchStats(evalscript) {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SENTINEL_HUB_CLIENT_ID,
      client_secret: process.env.SENTINEL_HUB_CLIENT_SECRET,
    }),
  });
  const { access_token } = await tokenRes.json();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  const fmt = (d) => d.toISOString().replace(/\.\d+Z$/, "Z");
  const payload = {
    input: {
      bounds: { geometry: { type: "Polygon", coordinates: [ring] } },
      data: [{ type: "sentinel-2-l2a", dataFilter: { maxCloudCoverage: 50, mosaickingOrder: "leastCC" } }],
    },
    aggregation: {
      timeRange: { from: fmt(from), to: fmt(to) },
      aggregationInterval: { of: "P10D" },
      evalscript,
      resx: 10,
      resy: 10,
    },
  };
  const res = await fetch(STATS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  const intervals = json.data ?? [];
  for (let i = intervals.length - 1; i >= 0; i--) {
    const st = intervals[i]?.outputs?.ndvi?.bands?.B0?.stats;
    if (st?.mean > 0.05 && st?.sampleCount > 0) {
      return { status: res.status, mean: st.mean, samples: st.sampleCount, date: intervals[i].interval?.from?.slice(0, 10) };
    }
  }
  const last = intervals[intervals.length - 1]?.outputs?.ndvi?.bands?.B0?.stats;
  return { status: res.status, mean: last?.mean ?? null, samples: last?.sampleCount ?? 0, date: "none" };
}

for (const orbit of [true, false]) {
  const label = orbit ? "ORBIT" : "SIMPLE";
  const r = await fetchStats(makeEvalscript(orbit));
  console.log(label, r);
}
