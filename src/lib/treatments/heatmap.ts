import { getFlowColor } from "@/lib/trajectory-utils";

export type HeatmapPoint = {
  lat: number;
  lng: number;
  flow: number;
  color: string;
};

export type HeatmapCell = {
  lat: number;
  lng: number;
  avgFlow: number;
  pointCount: number;
  color: string;
};

type RawPoint = {
  lat: number;
  lng: number;
  debit1_lpm?: number | null;
  debit2_lpm?: number | null;
};

/** Aggregate GPS points into a fixed grid (≈5 m cells). */
export function buildHeatmapGrid(
  points: RawPoint[],
  cellSizeM = 5
): HeatmapCell[] {
  if (!points.length) return [];

  const refLat = points[0].lat;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((refLat * Math.PI) / 180);
  const cellLat = cellSizeM / metersPerDegLat;
  const cellLng = cellSizeM / metersPerDegLng;

  const cells = new Map<string, { lat: number; lng: number; flows: number[] }>();

  for (const p of points) {
    const flow = ((p.debit1_lpm ?? 0) + (p.debit2_lpm ?? 0)) / 2;
    const ci = Math.floor(p.lat / cellLat);
    const cj = Math.floor(p.lng / cellLng);
    const key = `${ci}:${cj}`;
    const existing = cells.get(key);
    if (existing) {
      existing.flows.push(flow);
    } else {
      cells.set(key, {
        lat: (ci + 0.5) * cellLat,
        lng: (cj + 0.5) * cellLng,
        flows: [flow],
      });
    }
  }

  return Array.from(cells.values()).map((c) => {
    const avgFlow = c.flows.reduce((a, b) => a + b, 0) / c.flows.length;
    return {
      lat: c.lat,
      lng: c.lng,
      avgFlow,
      pointCount: c.flows.length,
      color: getFlowColor(avgFlow),
    };
  });
}

export function cellsToGeoJSON(cells: HeatmapCell[]): {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { avgFlow: number; pointCount: number; color: string };
    geometry: { type: "Point"; coordinates: [number, number] };
  }>;
} {
  return {
    type: "FeatureCollection",
    features: cells.map((c) => ({
      type: "Feature",
      properties: {
        avgFlow: c.avgFlow,
        pointCount: c.pointCount,
        color: c.color,
      },
      geometry: {
        type: "Point",
        coordinates: [c.lng, c.lat],
      },
    })),
  };
}
