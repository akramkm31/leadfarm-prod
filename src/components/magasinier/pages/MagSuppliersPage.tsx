"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, Plus, X } from "lucide-react";
import { useSuppliers, useProducts, useMovements } from "@/hooks/useData";
import { insertSupplier, updateSupplier } from "@/lib/data-provider";
import {
  supplierTypeLabels,
  type Supplier,
  type PhytoProduct,
  type StockEntry,
} from "@/lib/mock-data";
import { MagPage, MagActionRow, MagBtn, MagBadge } from "@/components/magasinier/ui";
import { formatMagDate } from "@/lib/magasinier/helpers";
import { PageSkeleton } from "@/components/ui/Skeleton";

const TYPE_TONE: Record<string, "blue" | "violet" | "gray"> = {
  distributeur: "blue",
  fabricant: "violet",
  fournisseur: "gray",
};

const SUPPLIER_TYPES = ["distributeur", "fabricant", "fournisseur"] as const;

type SupplierForm = {
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  wilaya: string;
};

const EMPTY_FORM: SupplierForm = { name: "", type: "distributeur", phone: "", email: "", address: "", wilaya: "" };

export default function MagSuppliersPage() {
  const { data: suppliersRaw, loading: sLoad, refetch } = useSuppliers();
  const { data: productsRaw, loading: pLoad } = useProducts();
  const { data: movementsRaw, loading: mLoad } = useMovements();
  const suppliers = (suppliersRaw ?? []) as Supplier[];
  const products = (productsRaw ?? []) as PhytoProduct[];
  const movements = (movementsRaw ?? []) as StockEntry[];

  const [showAdd, setShowAdd] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const cards = useMemo(
    () =>
      suppliers.map((s) => {
        const prods = products.filter((p) => p.supplierId === s.id);
        const entries = movements.filter((m) => m.supplierId === s.id && m.type === "entry");
        const lastEntry = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        return { ...s, prods, deliveries: entries.length, lastEntry };
      }),
    [suppliers, products, movements]
  );

  if (sLoad || pLoad || mLoad) return <PageSkeleton />;

  return (
    <MagPage>
      <MagActionRow>
        <MagBtn primary onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          Nouveau fournisseur
        </MagBtn>
      </MagActionRow>

      <div className="mag-grid-suppliers">
        {cards.map((s) => (
          <div key={s.id} className="mag-card mag-card-pad">
            <div className="mag-row-between" style={{ alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5, letterSpacing: "-0.02em" }}>{s.name}</div>
                <div className="mag-muted" style={{ fontSize: 11, marginTop: 3 }}>
                  {[s.city, s.wilaya].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <MagBadge tone={TYPE_TONE[s.type] ?? "gray"}>
                {supplierTypeLabels[s.type] || s.type}
              </MagBadge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              {[
                { v: s.prods.length, l: "Produits", c: "var(--mag-text)" },
                { v: s.deliveries, l: "Livraisons", c: "var(--mag-blue)" },
                { v: formatMagDate(s.lastEntry?.date), l: "Dernière entrée", c: "var(--mag-text)", small: true },
              ].map((k) => (
                <div
                  key={k.l}
                  style={{
                    background: "var(--mag-bg)",
                    border: "1px solid var(--mag-border)",
                    borderRadius: 8,
                    padding: "10px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: k.small ? 13 : 18, fontWeight: k.small ? 700 : 800, color: k.c, marginTop: k.small ? 2 : 0 }}>
                    {k.v}
                  </div>
                  <div className="mag-label-sm" style={{ marginTop: 3 }}>{k.l}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--mag-border-light)", paddingTop: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              {s.phone && (
                <div className="mag-row" style={{ gap: 8, fontSize: 12, color: "var(--mag-text-secondary)" }}>
                  <Phone className="w-3.5 h-3.5" />
                  <span className="mag-mono">{s.phone}</span>
                </div>
              )}
              {s.email && (
                <div className="mag-row" style={{ gap: 8, fontSize: 12, color: "var(--mag-text-secondary)" }}>
                  <Mail className="w-3.5 h-3.5" />
                  <span>{s.email}</span>
                </div>
              )}
            </div>

            <div className="mag-row" style={{ gap: 8 }}>
              <MagBtn sm style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditSupplier(s)}>
                Modifier
              </MagBtn>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <SupplierModal
          title="Nouveau fournisseur"
          initial={EMPTY_FORM}
          onClose={() => setShowAdd(false)}
          onSaved={async (form) => {
            await insertSupplier(form);
            setShowAdd(false);
            refetch();
          }}
        />
      )}

      {editSupplier && (
        <SupplierModal
          title="Modifier le fournisseur"
          initial={{
            name: editSupplier.name || "",
            type: editSupplier.type || "distributeur",
            phone: editSupplier.phone || "",
            email: editSupplier.email || "",
            address: (editSupplier as any).address || "",
            wilaya: editSupplier.wilaya || "",
          }}
          onClose={() => setEditSupplier(null)}
          onSaved={async (form) => {
            await updateSupplier(editSupplier.id, form);
            setEditSupplier(null);
            refetch();
          }}
        />
      )}
    </MagPage>
  );
}

function SupplierModal({
  title,
  initial,
  onClose,
  onSaved,
}: {
  title: string;
  initial: SupplierForm;
  onClose: () => void;
  onSaved: (form: SupplierForm) => Promise<void>;
}) {
  const [form, setForm] = useState<SupplierForm>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof SupplierForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onSaved(form);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'enregistrement");
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--mag-border)", borderRadius: 8, fontSize: 14, background: "var(--mag-card)", color: "var(--mag-text)", outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--mag-text-secondary)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" onClick={onClose}>
      <div className="mag-card mag-card-pad max-w-md w-full" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="mag-row-between" style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mag-text-secondary)", padding: 4 }}><X className="w-5 h-5" /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inputStyle} placeholder="Nom du fournisseur" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} style={inputStyle}>
                {SUPPLIER_TYPES.map((t) => (
                  <option key={t} value={t}>{supplierTypeLabels[t] || t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Wilaya</label>
              <input value={form.wilaya} onChange={(e) => set("wilaya", e.target.value)} style={inputStyle} placeholder="Ex: Alger" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Téléphone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inputStyle} placeholder="0555 000 000" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={inputStyle} placeholder="contact@fournisseur.dz" />
          </div>
          <div>
            <label style={labelStyle}>Adresse</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} style={inputStyle} placeholder="Adresse complète" />
          </div>
        </div>

        {error && <p style={{ color: "var(--mag-red, #ef4444)", fontSize: 12, marginTop: 8 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <MagBtn onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Annuler</MagBtn>
          <MagBtn primary onClick={handleSubmit} disabled={saving || !form.name.trim()} style={{ flex: 1, justifyContent: "center" }}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </MagBtn>
        </div>
      </div>
    </div>
  );
}
