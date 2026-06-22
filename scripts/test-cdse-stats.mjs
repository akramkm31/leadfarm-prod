/**
 * Quick CDSE Statistical API smoke test (run with env vars set).
 * node scripts/test-cdse-stats.mjs
 */
const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics";

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
    mosaicking: "ORBIT",
  };
}
function evaluatePixel(s) {
  const BAD = [0, 1, 2, 3, 6, 7, 8, 9, 10, 11];
  const valid = s.dataMask !== 0 && BAD.indexOf(s.SCL) === -1;
  if (!valid) {
    return { ndvi:[0], ndwi:[0], evi:[0], savi:[0], ndre:[0], dataMask:[0] };
  }
  const ndviD = s.B08 + s.B04;
  const ndwi  = (s.B03 + s.B08) > 0 ? (s.B03 - s.B08) / (s.B03 + s.B08) : 0;
  const ndvi  = ndviD > 0 ? (s.B08 - s.B04) / ndviD : 0;
  const eviD  = s.B08 + 6*s.B04 - 7.5*s.B02 + 1;
  const evi   = eviD  > 0 ? 2.5 * (s.B08 - s.B04) / eviD : 0;
  const saviD = s.B08 + s.B04 + 0.5;
  const savi  = saviD > 0 ? 1.5 * (s.B08 - s.B04) / saviD : 0;
  const ndreD = s.B8A + s.B05;
  const ndre  = ndreD > 0 ? (s.B8A - s.B05) / ndreD : 0;
  return { ndvi:[ndvi], ndwi:[ndwi], evi:[evi], savi:[savi], ndre:[ndre], dataMask:[1] };
}`;

const boundary = [
  [34.99447309929553, -0.5182334603827022],
  [34.995, -0.517],
  [34.993, -0.516],
  [34.99447309929553, -0.5182334603827022],
];
const ring = boundary.map(([lat, lon]) => [lon, lat]);

async function main() {
  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET");
    process.exit(1);
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const tokenText = await tokenRes.text();
  console.log("OAuth:", tokenRes.status, tokenText.slice(0, 120));
  if (!tokenRes.ok) process.exit(1);

  const { access_token } = JSON.parse(tokenText);

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  const toIso = to.toISOString().replace(/\.\d+Z$/, "Z");
  const fromIso = from.toISOString().replace(/\.\d+Z$/, "Z");

  const payload = {
    input: {
      bounds: { geometry: { type: "Polygon", coordinates: [ring] } },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: { mosaickingOrder: "leastCC" },
      }],
    },
    aggregation: {
      timeRange: { from: fromIso, to: toIso },
      aggregationInterval: { of: "P10D" },
      evalscript: EVALSCRIPT,
      resx: 20,
      resy: 20,
    },
  };

  const statsRes = await fetch(STATS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await statsRes.text();
  console.log("Stats:", statsRes.status, text.slice(0, 800));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
