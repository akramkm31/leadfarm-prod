import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuthRbac, validateBody, json, requireFeature } from "@/lib/api-helpers";
import {
  createFertigation,
  DEFAULT_EXPLOITATION_ID,
  listFertigations,
} from "@/lib/fertigation/repository";

const produitSchema = z.object({
  nom_commercial: z.string(),
  composition: z.string().optional(),
  dose_hl: z.string().optional(),
  volume: z.number().optional(),
  quantite_par_bac: z.string().optional(),
  nombre_bacs: z.number().optional(),
  quantite_sortir: z.string().optional(),
});

const postSchema = z.object({
  parcelleId: z.string().uuid(),
  nFertigation: z.string().min(1).max(64),
  modeApplication: z.string().min(1).max(120),
  materiel: z.string().max(200).optional(),
  pressionBar: z.number().min(0).max(20).optional(),
  produits: z.array(produitSchema).default([]),
  visaResponsable: z.string().max(120).optional(),
  pdfUrl: z.string().max(500).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "fertigation");
  if (denied) return denied;

  try {
    const data = await listFertigations(auth.supabase);
    return json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur lecture fertigations";
    return json({ error: msg }, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "fertigation");
  if (denied) return denied;

  const raw = await req.json().catch(() => ({}));
  const parsed = validateBody(raw, postSchema);
  if (parsed.error) return parsed.error;

  const exploitationId = auth.access.exploitationId || DEFAULT_EXPLOITATION_ID;

  try {
    const data = await createFertigation(auth.supabase, {
      parcelleId: parsed.data.parcelleId,
      exploitationId,
      nFertigation: parsed.data.nFertigation,
      modeApplication: parsed.data.modeApplication,
      materiel: parsed.data.materiel || "Pompe doseuse + injecteur Venturi",
      pressionBar: parsed.data.pressionBar ?? 3,
      produits: parsed.data.produits,
      visaResponsable: parsed.data.visaResponsable,
      pdfUrl: parsed.data.pdfUrl,
    });
    return json({ success: true, data }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Enregistrement échoué";
    return json({ error: msg }, 500);
  }
}
