import { NextRequest } from "next/server";
import { withAuthRbac, json } from "@/lib/api-helpers";
import { CANONICAL_PARCELLE_TABLE } from "@/lib/parcelles/constants";
import { insertRegionRow } from "@/lib/parcelles/insert-region";
import { mapRegionToParcelle } from "@/lib/parcelles/mappers";
import { syncParcelleMirror } from "@/lib/parcelles/sync-mirror";
import type { RegionRow } from "@/lib/database.types";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const { data, error } = await auth.supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .select("*")
    .order("name");
  if (error) return json({ error: error.message }, 500);
  return json(data);
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }

  const name = String(body.name ?? "").trim();
  const cropType = String(body.cropType ?? body.crop_type ?? "").trim();
  if (!name || !cropType) {
    return json({ error: "Nom et culture sont obligatoires" }, 400);
  }

  const boundary = body.boundary as [number, number][] | undefined;
  if (!Array.isArray(boundary) || boundary.length < 3) {
    return json({ error: "Tracez au moins 3 points sur la carte" }, 400);
  }

  const siteLabel = String(body.site ?? "Tlemcen").trim() || "Tlemcen";
  const variete = String(body.variete ?? cropType).trim() || cropType;
  const color = String(body.color ?? "#10b981");
  const areaHectares = Number(body.areaHectares ?? body.area_hectares ?? 0);
  const center = body.center as [number, number] | undefined;
  const parentId = (body.parentId ?? body.parent_id ?? null) as string | null;

  const regionResult = await insertRegionRow(auth.supabase, {
    name,
    boundary,
    color,
    area_hectares: areaHectares,
    crop_type: cropType,
    variete,
    site: siteLabel,
    center: center ?? null,
    culture_type: "arboriculture",
    parent_id: parentId,
  });

  const { data: region, error } = regionResult;

  if (error) {
    const message =
      error.code === "23505"
        ? "Une parcelle avec ce nom existe déjà"
        : error.message || "Erreur lors de l'enregistrement";
    return json({ error: message }, 400);
  }

  const regionRow = region as RegionRow;
  void syncParcelleMirror(auth.supabase, regionRow, auth.access.exploitationId ?? undefined);
  return json(
    mapRegionToParcelle({
      ...regionRow,
      site: regionRow.site ?? siteLabel,
      variete: regionRow.variete ?? variete,
    }),
    201
  );
}
