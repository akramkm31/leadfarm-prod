import { notFound } from "next/navigation";
import { createTraceReadClient } from "@/lib/trace/client";
import { verifyPublicUrl } from "@/lib/trace/verification";

type Props = { params: Promise<{ hash: string }> };

export default async function VerifyPage({ params }: Props) {
  const { hash } = await params;
  const supabase = createTraceReadClient();
  if (!supabase) notFound();

  const { data, error } = await supabase
    .from("trace_verifications")
    .select("*")
    .eq("hash", hash)
    .maybeSingle();

  if (error || !data) notFound();

  const products = (data.products_summary as { name: string; quantity?: number; unit?: string }[]) ?? [];
  const verifyUrl = verifyPublicUrl(hash);

  return (
    <main className="min-h-screen bg-canvas text-graphite">
      <div className="max-w-lg mx-auto px-6 py-12 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-graphite/50">LeadFarm · Traçabilité</p>
          <h1 className="text-2xl font-semibold">Certificat vérifié</h1>
          <p className="text-sm text-graphite/70">
            Ce traitement est enregistré dans le registre phytosanitaire LeadFarm.
          </p>
        </header>

        <section className="rounded-[6.08px] border border-fog-border p-5 space-y-3 bg-white">
          <Row label="Parcelle" value={data.site_name ?? "—"} />
          <Row label="Culture" value={data.culture ?? "—"} />
          <Row label="Cible" value={data.cible ?? "—"} />
          <Row label="Statut" value={data.status ?? "—"} />
          <Row label="Date prévue" value={data.planned_date ?? "—"} />
          <Row label="Date exécution" value={data.executed_date ?? "—"} />
          <Row label="Référence" value={data.treatment_id?.slice(0, 8).toUpperCase() ?? "—"} />
        </section>

        {products.length > 0 && (
          <section className="rounded-[6.08px] border border-fog-border p-5 bg-white">
            <h2 className="text-sm font-semibold mb-3">Produits appliqués</h2>
            <ul className="space-y-2">
              {products.map((p, i) => (
                <li key={i} className="text-sm flex justify-between gap-4">
                  <span>{p.name}</span>
                  {p.quantity != null && (
                    <span className="text-graphite/60 shrink-0">
                      {p.quantity} {p.unit ?? ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="text-xs text-graphite/50 space-y-1">
          <p>Hash : {hash}</p>
          <p>URL : {verifyUrl}</p>
          <p>Enregistré le {new Date(data.created_at).toLocaleString("fr-FR")}</p>
        </footer>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-graphite/60">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
