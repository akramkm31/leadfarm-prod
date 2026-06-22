type ParcelleCentroid = { center?: [number, number] };

export function getExploitationCentroid(
  parcelles: ParcelleCentroid[]
): { lat: number; lng: number } | null {
  const points = parcelles.filter((p) => Array.isArray(p.center) && p.center.length === 2);
  if (!points.length) return null;
  const lat = points.reduce((s, p) => s + p.center![0], 0) / points.length;
  const lng = points.reduce((s, p) => s + p.center![1], 0) / points.length;
  return { lat, lng };
}
