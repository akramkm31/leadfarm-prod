import { getSupabaseBrowser } from "@/lib/supabase-browser";

export interface LfFertigationLine {
  id: string;
  station_label: string | null;
  sector_code: string | null;
  surface_ha: number | null;
  input_label: string | null;
  product_id: string | null;
  dose: number | null;
}

export interface FertigationStation {
  station: string;
  sectors: FertigationSector[];
  surface_ha: number;
  lineCount: number;
}

export interface FertigationSector {
  sector: string;
  surface_ha: number;
  lines: LfFertigationLine[];
}

/** Plan d'engrais / fertigation réel (PLANIFICATION ENGRAIS FERTIGATION TENIRA POMMIER). */
export async function fetchLfFertigation(): Promise<LfFertigationLine[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("lf_fertigation_lines")
    .select("id, station_label, sector_code, surface_ha, input_label, product_id, dose")
    .order("station_label", { ascending: true })
    .order("sector_code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LfFertigationLine[];
}

/** Regroupe les lignes en stations → secteurs pour l'affichage en grille. */
export function groupFertigation(lines: LfFertigationLine[]): FertigationStation[] {
  const stations = new Map<string, Map<string, LfFertigationLine[]>>();
  for (const line of lines) {
    const station = line.station_label || "—";
    const sector = line.sector_code || "—";
    if (!stations.has(station)) stations.set(station, new Map());
    const sectors = stations.get(station)!;
    if (!sectors.has(sector)) sectors.set(sector, []);
    sectors.get(sector)!.push(line);
  }

  return Array.from(stations.entries()).map(([station, sectors]) => {
    const sectorList: FertigationSector[] = Array.from(sectors.entries()).map(([sector, sectorLines]) => ({
      sector,
      surface_ha: sectorLines[0]?.surface_ha ?? 0,
      lines: sectorLines,
    }));
    return {
      station,
      sectors: sectorList,
      surface_ha: sectorList.reduce((sum, s) => sum + (s.surface_ha ?? 0), 0),
      lineCount: sectorList.reduce((sum, s) => sum + s.lines.length, 0),
    };
  });
}
