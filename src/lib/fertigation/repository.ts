import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_EXPLOITATION_ID } from "@/lib/parcelles/constants";
import { syncParcelleMirror } from "@/lib/parcelles/sync-mirror";
import type { RegionRow } from "@/lib/database.types";
import { allowMcdMockData } from "@/lib/dev-demo";
import type { LfFertigationLine } from "@/lib/lechehab/fertigation";

export type FertigationRecord = {
  id: string;
  n_fertigation: string;
  parcelle_id: string;
  parcelle_nom: string;
  culture: string;
  date_fertigation: string;
  mode_application: string;
  materiel: string | null;
  pression_bar: number | null;
  produits: unknown[];
  visa_responsable: string | null;
  pdf_url: string | null;
  created_at: string;
};

const MOCK_PLAN: LfFertigationLine[] = [
  { id: "fp-1", station_label: "CARRIERE", sector_code: "S1", surface_ha: 6.79, input_label: "AN", product_id: null, dose: 0.01 },
  { id: "fp-2", station_label: "CARRIERE", sector_code: "S1", surface_ha: 6.79, input_label: "AP", product_id: null, dose: 13.58 },
  { id: "fp-3", station_label: "CARRIERE", sector_code: "S1", surface_ha: 6.79, input_label: "DAP", product_id: null, dose: 67.9 },
  { id: "fp-4", station_label: "CARRIERE", sector_code: "S2", surface_ha: 7.3, input_label: "NK", product_id: null, dose: 91.25 },
  { id: "fp-5", station_label: "Maguer Grande", sector_code: "S1", surface_ha: 13, input_label: "NC", product_id: null, dose: 221 },
  { id: "fp-6", station_label: "Maguer Grande", sector_code: "S1", surface_ha: 13, input_label: "FER", product_id: null, dose: 65 },
  { id: "fp-7", station_label: "25 Ha", sector_code: "S1", surface_ha: 5.33, input_label: "Blackjak", product_id: null, dose: 7.995 },
  { id: "fp-8", station_label: "13 Ha Devil Gala", sector_code: "S1", surface_ha: 13, input_label: "SA", product_id: null, dose: 39 },
];

async function enrichParcelleNames(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<FertigationRecord[]> {
  const ids = [...new Set(rows.map((r) => r.parcelle_id as string).filter(Boolean))];
  const nameMap = new Map<string, { nom: string; culture: string }>();

  if (ids.length) {
    const { data: regions } = await supabase.from("regions").select("id, name, crop_type").in("id", ids);
    for (const r of regions || []) {
      nameMap.set(r.id, { nom: r.name, culture: r.crop_type || "" });
    }
    const missing = ids.filter((id) => !nameMap.has(id));
    if (missing.length) {
      const { data: parcelles } = await supabase
        .from("parcelles")
        .select("id, nom, culture_actuelle")
        .in("id", missing);
      for (const p of parcelles || []) {
        nameMap.set(p.id, { nom: p.nom, culture: p.culture_actuelle || "" });
      }
    }
  }

  return rows.map((r) => {
    const meta = nameMap.get(r.parcelle_id as string);
    return {
      id: r.id as string,
      n_fertigation: r.n_fertigation as string,
      parcelle_id: r.parcelle_id as string,
      parcelle_nom: meta?.nom || "",
      culture: meta?.culture || "",
      date_fertigation: r.date_fertigation as string,
      mode_application: (r.mode_application as string) || "",
      materiel: (r.materiel as string) || null,
      pression_bar: r.pression_bar != null ? Number(r.pression_bar) : null,
      produits: (r.produits as unknown[]) || [],
      visa_responsable: (r.visa_responsable as string) || null,
      pdf_url: (r.pdf_url as string) || null,
      created_at: r.created_at as string,
    };
  });
}

export async function listFertigations(supabase: SupabaseClient): Promise<FertigationRecord[]> {
  const { data, error } = await supabase
    .from("fertigations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return enrichParcelleNames(supabase, data || []);
}

export async function createFertigation(
  supabase: SupabaseClient,
  input: {
    parcelleId: string;
    exploitationId: string;
    nFertigation: string;
    modeApplication: string;
    materiel: string;
    pressionBar: number;
    produits: unknown[];
    visaResponsable?: string;
    pdfUrl?: string | null;
  }
): Promise<FertigationRecord> {
  const { data: region } = await supabase.from("regions").select("*").eq("id", input.parcelleId).maybeSingle();
  if (region) {
    await syncParcelleMirror(supabase, region as RegionRow, input.exploitationId);
  }

  const { data, error } = await supabase
    .from("fertigations")
    .insert({
      exploitation_id: input.exploitationId,
      parcelle_id: input.parcelleId,
      n_fertigation: input.nFertigation,
      date_fertigation: new Date().toISOString().slice(0, 10),
      mode_application: input.modeApplication,
      materiel: input.materiel,
      pression_bar: input.pressionBar,
      produits: input.produits,
      visa_responsable: input.visaResponsable || null,
      pdf_url: input.pdfUrl || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const [row] = await enrichParcelleNames(supabase, [data]);
  return row;
}

export async function fetchFertigationPlan(
  supabase: SupabaseClient
): Promise<{ lines: LfFertigationLine[]; source: "database" | "mock" }> {
  const { data, error } = await supabase
    .from("lf_fertigation_lines")
    .select("id, station_label, sector_code, surface_ha, input_label, product_id, dose")
    .order("station_label", { ascending: true })
    .order("sector_code", { ascending: true });

  if (error) throw new Error(error.message);
  if (data?.length) return { lines: data as LfFertigationLine[], source: "database" };

  if (allowMcdMockData()) {
    return { lines: MOCK_PLAN, source: "mock" };
  }
  return { lines: [], source: "database" };
}

export { DEFAULT_EXPLOITATION_ID };
