import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

export type TraceVerificationPayload = {
  treatmentId: string;
  siteName?: string | null;
  status?: string | null;
  plannedDate?: string | null;
  executedDate?: string | null;
  culture?: string | null;
  cible?: string | null;
  products?: { name: string; quantity?: number | null; unit?: string | null }[];
  exploitationId?: string | null;
};

export function computeTraceHash(treatmentId: string, executedDate?: string | null): string {
  const payload = `${treatmentId}:${executedDate ?? "planned"}:leadfarm-v1`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export async function upsertTraceVerification(
  data: TraceVerificationPayload
): Promise<string> {
  const hash = computeTraceHash(data.treatmentId, data.executedDate);
  const supabase = createServiceClient();

  await (supabase as unknown as { from: (t: string) => { upsert: (v: object, o?: object) => Promise<unknown> } })
    .from("trace_verifications")
    .upsert(
    {
      hash,
      treatment_id: data.treatmentId,
      exploitation_id: data.exploitationId ?? null,
      site_name: data.siteName ?? null,
      status: data.status ?? null,
      planned_date: data.plannedDate ?? null,
      executed_date: data.executedDate ?? null,
      culture: data.culture ?? null,
      cible: data.cible ?? null,
      products_summary: data.products ?? [],
    },
    { onConflict: "hash" }
  );

  return hash;
}

export function verifyPublicUrl(hash: string, baseUrl?: string): string {
  const origin = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://leadfarm.dz";
  return `${origin.replace(/\/$/, "")}/verify/${hash}`;
}
