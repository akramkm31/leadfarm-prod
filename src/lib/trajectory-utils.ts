// Types mirrored here to avoid circular dep with TractorLiveMap
export type TrajectorySegment = {
  points: [number, number][];
  speed: number;
  color: string;
};
export type Trajectory = {
  segments: TrajectorySegment[];
  start?: [number, number] | null;
  end?: [number, number] | null;
  startTime?: string;
  endTime?: string;
};

export const SPEED_COLORS = {
  slow: "#1a9850",   // < 4 km/h
  medium: "#91cf60", // 4 - 7 km/h
  normal: "#f0d400", // 7 - 10 km/h
  fast: "#fc7850",   // 10 - 15 km/h
  vfast: "#d73027",  // > 15 km/h
};

export function getSpeedColor(speed: number) {
  if (speed < 4) return SPEED_COLORS.slow;
  if (speed < 7) return SPEED_COLORS.medium;
  if (speed < 10) return SPEED_COLORS.normal;
  if (speed < 15) return SPEED_COLORS.fast;
  return SPEED_COLORS.vfast;
}

export const FLOW_COLORS = {
  ok: "#203b14",      // Green
  low: "#f0d400",    // Yellow
  zero: "#d73027",   // Red
};

export function getFlowColor(flow: number) {
  if (flow <= 0.05) return FLOW_COLORS.zero;
  if (flow < 1.5) return FLOW_COLORS.low;
  return FLOW_COLORS.ok;
}

/**
 * Converts raw GPS points [lat, lon, speed, timestamp] into a Trajectory object
 * with speed-colored segments for the map component.
 */
export function pointsToTrajectory(points: [number, number, number, string][]): Trajectory {
  if (points.length < 1) return { segments: [] };
  if (points.length === 1) {
      return {
          segments: [],
          start: [points[0][0], points[0][1]],
          end: [points[0][0], points[0][1]],
          startTime: points[0][3],
          endTime: points[0][3],
      };
  }

  const segments: TrajectorySegment[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    segments.push({
      points: [[p1[0], p1[1]], [p2[0], p2[1]]],
      speed: p2[2],
      color: getSpeedColor(p2[2]),
    });
  }

  return {
    segments,
    start: [points[0][0], points[0][1]],
    end: [points[points.length - 1][0], points[points.length - 1][1]],
    startTime: points[0][3],
    endTime: points[points.length - 1][3],
  };
}

/**
 * Converts high-resolution points from treatment_points table into a colored trajectory
 */
export function dbPointsToTrajectory(points: any[]): Trajectory {
  if (points.length < 1) return { segments: [] };

  const segments: TrajectorySegment[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const avgFlow = (p2.debit1_lpm + p2.debit2_lpm) / 2;
    segments.push({
      points: [[p1.lat, p1.lng], [p2.lat, p2.lng]],
      speed: p2.speed_kmh,
      color: getFlowColor(avgFlow), // Use flow color for expert level
    });
  }

  return {
    segments,
    start: [points[0].lat, points[0].lng],
    end: [points[points.length - 1].lat, points[points.length - 1].lng],
    startTime: points[0].timestamp,
    endTime: points[points.length - 1].timestamp,
  };
}

/**
 * Basic distance calculation between two points (Haversine-ish)
 * Returns distance in meters.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
