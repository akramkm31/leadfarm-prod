import type { Parcelle } from "@/lib/mock-data";

export const STATUS_LABELS: Record<string, string> = {
  planned: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

export const TYPE_LABELS: Record<string, string> = {
  pulverisation: "Pulvérisation",
  desherbage: "Désherbage",
  fertilisation: "Fertilisation",
  fongicide: "Fongicide",
  irrigation: "Irrigation",
};

export function getProp(obj: Record<string, unknown>, camelKey: string, snakeKey: string) {
  return obj[camelKey] !== undefined ? obj[camelKey] : obj[snakeKey];
}

/** Id parcelle (ou sous-parcelle) associé à un traitement. */
export function treatmentParcelleId(treatment: Record<string, unknown>): string | null {
  const id =
    getProp(treatment, "sousParcelleId", "sous_parcelle_id") ||
    getProp(treatment, "parcelleId", "parcelle_id");
  return id ? String(id) : null;
}

function normalizeParcelleName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Résout la parcelle d'un traitement (UUID, puis correspondance par nom). */
export function findParcelleByTreatment(
  parcelles: Parcelle[],
  treatment: Record<string, unknown>
): Parcelle | null {
  const id = treatmentParcelleId(treatment);
  if (id) {
    const byId = findParcelle(parcelles, id);
    if (byId) return byId;
  }

  const rawName = String(
    getProp(treatment, "parcelleName", "site_name") || ""
  ).trim();
  if (!rawName) return null;

  const target = normalizeParcelleName(rawName);
  const all = parcelles.flatMap((p) => [p, ...(p.children || [])]);

  const exact = all.find((p) => {
    const n = normalizeParcelleName(p.name || p.cropType || "");
    return n === target;
  });
  if (exact) return exact;

  const partial = all.find((p) => {
    const n = normalizeParcelleName(p.name || p.cropType || "");
    return n.length > 2 && (target.includes(n) || n.includes(target));
  });
  return partial ?? null;
}

export function resolveTreatmentParcelleId(
  parcelles: Parcelle[],
  treatment: Record<string, unknown>
): string | null {
  return findParcelleByTreatment(parcelles, treatment)?.id ?? null;
}

export function findParcelle(parcelles: Parcelle[], id: string): Parcelle | null {
  for (const p of parcelles) {
    if (p.id === id) return p;
    const child = p.children?.find((c) => c.id === id);
    if (child) return child;
  }
  return null;
}

/** Traitements liés à une parcelle (id, sous-parcelle, ou site_name). */
export function treatmentsForParcelle(treatments: Record<string, unknown>[], parcelle: Parcelle) {
  const ids = new Set<string>([
    String(parcelle.id),
    ...(parcelle.children || []).map((c) => String(c.id)),
  ]);
  const nameLower = parcelle.name.toLowerCase().trim();

  return treatments.filter((t) => {
    const pid = getProp(t, "parcelleId", "parcelle_id");
    const sid = getProp(t, "sousParcelleId", "sous_parcelle_id");
    const site = String(getProp(t, "parcelleName", "site_name") || "")
      .toLowerCase()
      .trim();

    if (pid !== undefined && pid !== null && ids.has(String(pid))) return true;
    if (sid !== undefined && sid !== null && ids.has(String(sid))) return true;
    if (site && (site === nameLower || site.includes(nameLower) || nameLower.includes(site))) {
      return true;
    }
    return false;
  });
}

export function sortTreatmentsByDate(treatments: Record<string, unknown>[]) {
  return [...treatments].sort((a, b) => {
    const da = String(getProp(a, "plannedDate", "planned_date") || "");
    const db = String(getProp(b, "plannedDate", "planned_date") || "");
    return new Date(db).getTime() - new Date(da).getTime();
  });
}

const TYPE_COLOR: Record<string, string> = {
  pulverisation: "#2d6b3f",
  desherbage:    "#8b6914",
  fertilisation: "#1a5f7a",
  fongicide:     "#7a1a1a",
  irrigation:    "#1a4a7a",
};
const TYPE_BG: Record<string, string> = {
  pulverisation: "#e8f5ec",
  desherbage:    "#fdf3dc",
  fertilisation: "#dceef7",
  fongicide:     "#f7dcdc",
  irrigation:    "#dce8f7",
};
const TYPE_ICON: Record<string, string> = {
  pulverisation: "💧",
  desherbage:    "🌿",
  fertilisation: "🌱",
  fongicide:     "🛡️",
  irrigation:    "🌊",
};
const STATUS_COLOR: Record<string, string> = {
  completed:   "#166534", termine:    "#166534",
  in_progress: "#92400e", en_cours:   "#92400e",
  planned:     "#374151", planifie:   "#374151",
  cancelled:   "#991b1b", annule:     "#991b1b",
};
const STATUS_BG: Record<string, string> = {
  completed:   "#dcfce7", termine:    "#dcfce7",
  in_progress: "#fef3c7", en_cours:   "#fef3c7",
  planned:     "#f3f4f6", planifie:   "#f3f4f6",
  cancelled:   "#fee2e2", annule:     "#fee2e2",
};

export function buildHistoryPopupHtml(
  parcelle: Parcelle,
  treatments: Record<string, unknown>[]
): string {
  const done    = treatments.filter(t => { const s = String(getProp(t,"status","status")||""); return s==="completed"||s==="termine"; }).length;
  const planned = treatments.filter(t => { const s = String(getProp(t,"status","status")||""); return s==="planned"||s==="planifie"; }).length;

  const statsHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:10px;">
      ${[
        { n: treatments.length, label: "Total" },
        { n: done,              label: "Terminées",  color: done > 0 ? "#166534" : "#555" },
        { n: planned,           label: "Planifiées", color: planned > 0 ? "#92400e" : "#555" },
      ].map(s => `
        <div style="text-align:center;padding:8px 4px;">
          <div style="font-size:18px;font-weight:800;line-height:1;color:${s.color||"#1a2e0f"};">${s.n}</div>
          <div style="font-size:8px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${s.label}</div>
        </div>
      `).join("")}
    </div>
  `;

  const rowsHtml = treatments.length === 0
    ? `<div style="text-align:center;padding:16px 0;color:#999;font-size:11px;">Aucune intervention enregistrée</div>`
    : treatments.map((t, i) => {
        const type      = String(getProp(t,"type","type")||"");
        const rawStatus = String(getProp(t,"status","status")||"");
        const dateRaw   = getProp(t,"plannedDate","planned_date");
        const date      = dateRaw ? new Date(String(dateRaw)).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}) : "—";
        const operator  = String(getProp(t,"operatorName","operator_name")||"");
        const typeLabel = TYPE_LABELS[type] || type || "Traitement";
        const statusLabel = STATUS_LABELS[rawStatus] || rawStatus;
        const color  = TYPE_COLOR[type]  || "#2d6b3f";
        const bg     = TYPE_BG[type]     || "#e8f5ec";
        const icon   = TYPE_ICON[type]   || "🌾";
        const sBg    = STATUS_BG[rawStatus]    || "#f3f4f6";
        const sColor = STATUS_COLOR[rawStatus] || "#374151";
        const isLast = i === treatments.length - 1;

        const rawProducts = (getProp(t,"products","products") as unknown[]) ?? (getProp(t,"treatment_products","treatment_products") as unknown[]) ?? [];
        const products = (Array.isArray(rawProducts) ? rawProducts : []).slice(0, 3);
        const productsHtml = products.length > 0
          ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">${
              products.map(p => {
                const row = p as Record<string,unknown>;
                const nested = row.products as Record<string,unknown>|undefined;
                const name = String(row.productName||row.tradeName||nested?.trade_name||"Produit");
                return `<span style="font-size:8px;padding:1px 6px;border-radius:20px;background:${bg};color:${color};font-weight:600;">${name}</span>`;
              }).join("")
            }</div>` : "";

        return `
          <div style="display:flex;gap:9px;padding-bottom:${isLast?"0":"10px"};position:relative;">
            ${!isLast ? `<div style="position:absolute;left:12px;top:22px;bottom:0;width:1px;background:${color}22;"></div>` : ""}
            <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1.5px solid ${color}30;">${icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;">
                <div>
                  <div style="font-size:11px;font-weight:700;color:#1a2e0f;line-height:1.2;">${typeLabel}</div>
                  <div style="font-size:9px;color:#888;font-family:monospace;margin-top:1px;">${date}</div>
                </div>
                <span style="font-size:7.5px;font-weight:700;padding:2px 6px;border-radius:20px;background:${sBg};color:${sColor};white-space:nowrap;flex-shrink:0;">${statusLabel}</span>
              </div>
              ${operator ? `<div style="font-size:9px;color:#666;margin-top:2px;">👤 ${operator}</div>` : ""}
              ${productsHtml}
            </div>
          </div>
        `;
      }).join("");

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;color:#1a2e0f;line-height:1.4;">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 12px 8px;border-bottom:2px solid ${parcelle.color}30;background:${parcelle.color}0d;margin:-12px -12px 10px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${parcelle.color};box-shadow:0 0 0 2px white,0 0 0 3px ${parcelle.color}60;flex-shrink:0;"></div>
        <div>
          <div style="font-size:13px;font-weight:800;color:${parcelle.color};line-height:1;">${parcelle.name}</div>
          <div style="font-size:9px;color:rgba(0,0,0,0.4);text-transform:uppercase;letter-spacing:0.05em;margin-top:1px;">${parcelle.areaHectares} ha · ${parcelle.cropType}</div>
        </div>
      </div>
      ${statsHtml}
      <div style="max-height:300px;overflow-y:auto;overflow-x:hidden;padding-right:4px;">
        ${rowsHtml}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.07);">
        <a href="/trace/${encodeURIComponent(parcelle.id)}" style="font-size:10px;font-weight:600;color:#2d6b3f;text-decoration:none;">Traçabilité →</a>
        <a href="/parcelles?select=${encodeURIComponent(parcelle.id)}" style="font-size:10px;font-weight:700;background:#2d6b3f;color:#fff;padding:5px 12px;border-radius:8px;text-decoration:none;">Fiche Parcelle →</a>
      </div>
    </div>
  `;
}

/** @deprecated use buildHistoryPopupHtml */
export function buildHistoryRowsHtml(
  parcelleTreatments: Record<string, unknown>[],
  highlightTreatmentId?: string | null
): string {
  return parcelleTreatments
    .map((item) => {
      const itemDate = getProp(item, "plannedDate", "planned_date");
      const itemType = TYPE_LABELS[String(getProp(item, "type", "type") || "")] || String(getProp(item, "type", "type") || "Traitement");
      const rawStatus = String(getProp(item, "status", "status") || "");
      const itemStatus = STATUS_LABELS[rawStatus] || rawStatus;
      const isCurrent = highlightTreatmentId && String(item.id) === String(highlightTreatmentId);
      const dateStr = itemDate ? new Date(String(itemDate)).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—";
      return `<div style="display:flex;align-items:center;justify-content:space-between;font-size:10px;padding:4.5px 0;border-bottom:1px solid rgba(0,0,0,0.03);${isCurrent?"font-weight:700;color:#203b14;":"color:#555;"}"><span>${dateStr} · ${itemType}</span><span style="font-size:8px;text-transform:uppercase;opacity:0.85;font-family:monospace;">${itemStatus}</span></div>`;
    })
    .join("");
}
