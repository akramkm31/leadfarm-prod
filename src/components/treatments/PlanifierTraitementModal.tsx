'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { calculerDAR } from '@/lib/metier/dar';
import { fetchParcelles, fetchProducts, insertTreatment } from '@/lib/data-provider';
import { cn } from '@/lib/utils';
import {
  X, ChevronRight, ChevronLeft, MapPin, FlaskConical,
  Calendar, Settings2, Plus, Trash2, CheckCircle2,
  AlertCircle, Loader2, Wind, Droplets,
  ArrowRight, Leaf,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (traitement: any) => void;
  parcelleId?: string;
}

type ProduitLigne = {
  produit_id: string;
  nom_commercial: string;
  matiere_active: string;
  dose_hl: string;
  quantite_sortir: string;
  dar_jours: number;
  product_auth_number: string;
};

const EPPO_CROPS: { code: string; label: string }[] = [
  { code: "OLVEU", label: "Olivier (OLVEU)" },
  { code: "VITVI", label: "Vigne (VITVI)" },
  { code: "TRZAX", label: "Blé tendre (TRZAX)" },
  { code: "HORVX", label: "Orge (HORVX)" },
  { code: "LYPES", label: "Tomate (LYPES)" },
  { code: "SOLTU", label: "Pomme de terre (SOLTU)" },
  { code: "CIDSI", label: "Oranger (CIDSI)" },
  { code: "MABSD", label: "Pommier (MABSD)" },
  { code: "PRUPE", label: "Pêcher (PRUPE)" },
  { code: "PRUAM", label: "Abricotier (PRUAM)" },
  { code: "PHODA", label: "Palmier dattier (PHODA)" },
  { code: "CITLA", label: "Pastèque (CITLA)" },
  { code: "CAPAN", label: "Poivron (CAPAN)" },
  { code: "FRAAN", label: "Fraisier (FRAAN)" },
  { code: "ZEAMX", label: "Maïs (ZEAMX)" },
  { code: "CUCSA", label: "Concombre (CUCSA)" },
  { code: "MELSA", label: "Melon (MELSA)" },
  { code: "ALLCE", label: "Oignon (ALLCE)" },
  { code: "ALASO", label: "Ail (ALASO)" },
  { code: "FICUS", label: "Figuier (FICUS)" },
];

const BBCH_STAGES: { code: string; label: string }[] = [
  { code: "00", label: "00 — Graine sèche / bourgeon dormant" },
  { code: "09", label: "09 — Emergence" },
  { code: "11", label: "11 — 1ère feuille déployée" },
  { code: "19", label: "19 — 9 feuilles ou plus" },
  { code: "21", label: "21 — Début tallage / ramification" },
  { code: "31", label: "31 — 1er nœud visible (élongation)" },
  { code: "51", label: "51 — Début gonflement/épiaison" },
  { code: "55", label: "55 — Milieu épiaison / émergence inflorescence" },
  { code: "60", label: "60 — Début floraison" },
  { code: "65", label: "65 — Pleine floraison" },
  { code: "69", label: "69 — Fin floraison" },
  { code: "71", label: "71 — Nouaison / petit fruit" },
  { code: "75", label: "75 — Grossissement du fruit" },
  { code: "81", label: "81 — Début maturation" },
  { code: "85", label: "85 — Maturation avancée" },
  { code: "89", label: "89 — Maturité complète" },
  { code: "97", label: "97 — Sénescence / dormance" },
];

const STEPS = [
  { id: 1, label: 'Identification', icon: MapPin },
  { id: 2, label: 'Technique', icon: Settings2 },
  { id: 3, label: 'Produits & ordre', icon: FlaskConical },
];

const MODES_APPLICATION = [
  'Pulvérisation', 'Injection au sol', 'Traitement du sol',
  'Nébulisation', 'Badigeonnage', 'Traitement semences',
];

const TREATMENT_TYPES = [
  'Fongicide', 'Insecticide', 'Herbicide', 'Acaricide',
  'Nématicide', 'Régulateur de croissance', 'Fertilisation foliaire', 'Autre',
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[10px] font-semibold text-[#31200b] uppercase tracking-widest">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[9px] text-[#31200b]/50 italic">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-black text-[#203b14] uppercase tracking-[0.15em] border-b border-[#e0e5d5] pb-2 mb-4">
      {children}
    </h3>
  );
}

function SummaryRow({ label, val }: { label: string; val: string }) {
  if (!val || val === '—') return null;
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#f0f2eb] last:border-0">
      <span className="text-[10px] text-[#31200b]/60">{label}</span>
      <span className="text-[11px] font-semibold text-[var(--color-adaline-ink)]/80 truncate max-w-[58%] text-right">{val}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PlanifierTraitementModal({ open, onClose, onSave, parcelleId }: Props) {
  const [step, setStep] = useState(1);
  const [parcelles, setParcelles] = useState<any[]>([]);
  const [produitsPPP, setProduitsPPP] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);

  // Step 1
  const [selectedParcelle, setSelectedParcelle] = useState(parcelleId || '');
  const [datePrevue, setDatePrevue] = useState('');
  const [culture, setCulture] = useState('');
  const [variete, setVariete] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [type, setType] = useState(TREATMENT_TYPES[0]);

  // EPPO / BBCH
  const [eppoCropCode, setEppoCropCode] = useState('');
  const [bbchStage, setBbchStage] = useState('');

  // Step 2
  const [cible, setCible] = useState('');
  const [modeApplication, setModeApplication] = useState(MODES_APPLICATION[0]);
  const [materiel, setMateriel] = useState('');
  const [vitesse, setVitesse] = useState('');
  const [pression, setPression] = useState('');
  const [diametrePastilles, setDiametrePastilles] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [windSpeed, setWindSpeed] = useState('');

  // Step 3
  const [produits, setProduits] = useState<ProduitLigne[]>([
    { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '', dar_jours: 21, product_auth_number: '' },
  ]);
  const [darResult, setDarResult] = useState<{ dar_jours: number; date_reentre: Date } | null>(null);

  // Opérateur prévu (exécution terrain plus tard)
  const [operateurPrevu, setOperateurPrevu] = useState('');

  const superficieNum = parseFloat(superficie) || 0;

  useEffect(() => {
    if (!open) return;
    fetchParcelles().then(d => setParcelles(d || []));
    fetchProducts().then(d => setProduitsPPP(d || []));
    setStep(1);
    setErreurs([]);
    setSelectedParcelle(parcelleId || '');
    setEppoCropCode('');
    setBbchStage('');
  }, [open]);

  useEffect(() => {
    const p = parcelles.find((x: any) => x.id === selectedParcelle);
    if (!p) return;
    setSuperficie(p.areaHectares ? String(p.areaHectares) : '');
    setCulture(p.cropType || '');
    setVariete(p.variete || '');
  }, [selectedParcelle, parcelles]);

  useEffect(() => {
    if (!datePrevue || !produits.some(p => p.produit_id)) return;
    try {
      const res = calculerDAR(produits.filter(p => p.produit_id), new Date(datePrevue), culture);
      setDarResult(res);
    } catch { setDarResult(null); }
  }, [produits, datePrevue, culture]);

  const parcelleOptions = useMemo(() => {
    const opts: { id: string; label: string; ha: string }[] = [];
    parcelles.forEach((p: any) => {
      opts.push({ id: p.id, label: p.name, ha: p.areaHectares ? `${p.areaHectares} ha` : '' });
      p.children?.forEach((c: any) =>
        opts.push({ id: c.id, label: `${p.name} / ${c.name}`, ha: c.areaHectares ? `${c.areaHectares} ha` : '' })
      );
    });
    return opts;
  }, [parcelles]);

  function selectProduit(i: number, produitId: string) {
    const prod = produitsPPP.find((x: any) => x.id === produitId) as any;
    setProduits(prev => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        produit_id: produitId,
        nom_commercial: prod?.tradeName || prod?.nom_commercial || prod?.trade_name || '',
        matiere_active: prod?.activeSubstance || prod?.matiere_active || prod?.active_ingredient || '',
        dar_jours: prod?.dar || 21,
      };
      if (next[i].dose_hl && superficieNum > 0) {
        next[i].quantite_sortir = (parseFloat(next[i].dose_hl) * superficieNum * 10).toFixed(2);
      }
      return next;
    });
  }

  function updateProduit(i: number, field: keyof ProduitLigne, val: string) {
    setProduits(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      if (field === 'dose_hl' && superficieNum > 0) {
        next[i].quantite_sortir = (parseFloat(val || '0') * superficieNum * 10).toFixed(2);
      }
      return next;
    });
  }

  function validateStep(s: number): string[] {
    const errs: string[] = [];
    if (s === 1) {
      if (!selectedParcelle) errs.push('Sélectionner une parcelle');
      if (!datePrevue) errs.push('Date prévue obligatoire');
    }
    if (s === 2 && !cible) errs.push('Maladie / Ravageur / Cible obligatoire');
    if (s === 3 && produits.filter(p => p.produit_id).length === 0) errs.push('Au moins 1 produit requis');
    return errs;
  }

  function goNext() {
    const errs = validateStep(step);
    if (errs.length) { setErreurs(errs); return; }
    setErreurs([]);
    setStep(s => Math.min(s + 1, 3));
  }

  function goBack() {
    setErreurs([]);
    setStep(s => Math.max(s - 1, 1));
  }

  async function soumettre() {
    const errs = [
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
    ];
    if (errs.length) {
      setErreurs(errs);
      return;
    }

    setSaving(true);
    setErreurs([]);
    try {
      const p = parcelles.find((x: any) => x.id === selectedParcelle);
      const produitsPayload = produits
        .filter(prod => prod.produit_id)
        .map(prod => ({
          productId: prod.produit_id,
          nom_commercial: prod.nom_commercial,
          matiere_active: prod.matiere_active,
          dose_hl: prod.dose_hl,
          quantite_sortir: prod.quantite_sortir,
          dar_jours: prod.dar_jours,
          product_auth_number: prod.product_auth_number || undefined,
        }));

      const res = await insertTreatment({
        parcelleName: p ? p.name : selectedParcelle,
        parcelleId: selectedParcelle || undefined,
        type,
        plannedDate: datePrevue,
        status: "planned",
        operatorName: operateurPrevu || undefined,
        areaTreatedHectares: superficieNum || undefined,
        culture, variete, cible,
        modeApplication,
        materiel: materiel || undefined,
        vitesseKmh: parseFloat(vitesse) || undefined,
        pressionBar: parseFloat(pression) || undefined,
        diametrePastillesMm: parseFloat(diametrePastilles) || undefined,
        temperature: parseFloat(temperature) || undefined,
        humidity: parseFloat(humidity) || undefined,
        windSpeed: parseFloat(windSpeed) || undefined,
        eppoCropCode: eppoCropCode || undefined,
        bbchStage: bbchStage || undefined,
        produitsDetail: produitsPayload,
        dateReentree: darResult ? darResult.date_reentre.toISOString().split('T')[0] : undefined,
        darJours: darResult?.dar_jours || 21,
      });
      if (res) { onSave(res); onClose(); }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: unknown }).message)
            : "Erreur inconnue";
      setErreurs([msg.startsWith("Erreur") ? msg : `Erreur lors de la sauvegarde : ${msg}`]);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const selectedOpt = parcelleOptions.find(o => o.id === selectedParcelle);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-stone-moss)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#203b14]/15 border border-[#203b14]/30 flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4 text-[#203b14]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--color-adaline-ink)]/90 tracking-tight">
                Planifier un traitement
              </h2>
              <p className="text-[10px] text-[#31200b] font-mono mt-0.5">FOR.PR6.003 · Brouillon</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-[var(--color-adaline-ink)]/40 hover:text-[var(--color-adaline-ink)]/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Step indicator ─────────────────────────────── */}
        <div className="px-6 py-3 border-b border-[var(--color-stone-moss)] shrink-0">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                    done ? 'bg-[#203b14]/12 text-[#203b14]' :
                    active ? 'bg-[#203b14]/10 border border-[#203b14]/30 text-[#203b14]' :
                    'text-[#31200b]/35',
                  )}>
                    {done
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <Icon className="w-3 h-3" />
                    }
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden font-mono">{s.id}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className={cn('w-3 h-3 shrink-0',
                      step > s.id ? 'text-[#203b14]/40' : 'text-[#31200b]/12'
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* STEP 1: Identification */}
          {step === 1 && (
            <div className="space-y-5">
              <SectionTitle>Identification & Localisation</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Parcelle" required>
                  <select
                    value={selectedParcelle}
                    onChange={e => setSelectedParcelle(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-sm"
                  >
                    <option value="">— Sélectionner —</option>
                    {parcelleOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.label}{o.ha ? ` — ${o.ha}` : ''}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Date prévue" required>
                  <input
                    type="date"
                    value={datePrevue}
                    onChange={e => setDatePrevue(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-sm"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Culture">
                  <input value={culture} onChange={e => setCulture(e.target.value)}
                    placeholder="ex: Olivier" className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
                <Field label="Variété">
                  <input value={variete} onChange={e => setVariete(e.target.value)}
                    placeholder="ex: Sigoise" className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
                <Field label="Superficie (ha)" hint="Auto-remplie depuis la parcelle">
                  <input type="number" step="0.01" value={superficie}
                    onChange={e => setSuperficie(e.target.value)}
                    placeholder="0.00" className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
              </div>
              <Field label="Code EPPO (culture)" hint="Code standardisé EU Reg. 2023/564">
                <select
                  value={eppoCropCode}
                  onChange={e => setEppoCropCode(e.target.value)}
                  className="glass-input w-full px-3 py-2.5 text-sm"
                >
                  <option value="">— Sélectionner —</option>
                  {EPPO_CROPS.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Type de traitement" required>
                <div className="grid grid-cols-4 gap-2">
                  {TREATMENT_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={cn(
                        'px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all text-left leading-tight',
                        type === t
                          ? 'bg-[#203b14]/10 border-[#203b14]/40 text-[#203b14]'
                          : 'border-[#e0e5d5] text-[#31200b] hover:border-[#203b14]/20 hover:bg-[#203b14]/[0.03]'
                      )}>{t}</button>
                  ))}
                </div>
              </Field>
              <Field label="Opérateur prévu" hint="Optionnel — exécution terrain par l'opérateur ensuite">
                <input value={operateurPrevu} onChange={e => setOperateurPrevu(e.target.value)}
                  placeholder="Nom de l'opérateur terrain"
                  className="glass-input w-full px-3 py-2.5 text-sm" />
              </Field>
            </div>
          )}

          {/* STEP 2: Technique & Météo */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionTitle>Cible & Conditions d'Application</SectionTitle>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Maladie / Ravageur / Cible" required>
                  <input value={cible} onChange={e => setCible(e.target.value)}
                    placeholder="ex: Boufaroua, Cochenille blanche, Oïdium…"
                    className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
                <Field label="Stade BBCH" hint="Stade phénologique à l'application">
                  <select
                    value={bbchStage}
                    onChange={e => setBbchStage(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-sm"
                  >
                    <option value="">— Sélectionner —</option>
                    {BBCH_STAGES.map(s => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mode d'application">
                  <select value={modeApplication} onChange={e => setModeApplication(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-sm">
                    {MODES_APPLICATION.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Matériel utilisé">
                  <input value={materiel} onChange={e => setMateriel(e.target.value)}
                    placeholder="Tracteur + pulvérisateur 1000L"
                    className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Vitesse (km/h)">
                  <input type="number" step="0.1" value={vitesse}
                    onChange={e => setVitesse(e.target.value)}
                    placeholder="6.5" className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
                <Field label="Pression (bar)">
                  <input type="number" step="0.1" value={pression}
                    onChange={e => setPression(e.target.value)}
                    placeholder="12" className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
                <Field label="Ø pastilles (mm)">
                  <input type="number" step="0.1" value={diametrePastilles}
                    onChange={e => setDiametrePastilles(e.target.value)}
                    placeholder="1.5" className="glass-input w-full px-3 py-2.5 text-sm" />
                </Field>
              </div>
              <div className="rounded-xl border border-[#e0e5d5] bg-[#f9fbf5] p-4 space-y-3">
                <p className="text-[10px] font-semibold text-[#31200b] uppercase tracking-widest flex items-center gap-1.5">
                  <Wind className="w-3 h-3 text-[#203b14]" /> Conditions météo
                  <span className="normal-case font-normal text-[#31200b]/50">(optionnel)</span>
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Température (°C)">
                    <input type="number" step="0.5" value={temperature}
                      onChange={e => setTemperature(e.target.value)}
                      placeholder="22" className="glass-input w-full px-3 py-2.5 text-sm" />
                  </Field>
                  <Field label="Humidité (%)">
                    <input type="number" min="0" max="100" value={humidity}
                      onChange={e => setHumidity(e.target.value)}
                      placeholder="60" className="glass-input w-full px-3 py-2.5 text-sm" />
                  </Field>
                  <Field label="Vent (km/h)">
                    <input type="number" step="0.5" value={windSpeed}
                      onChange={e => setWindSpeed(e.target.value)}
                      placeholder="8" className="glass-input w-full px-3 py-2.5 text-sm" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Produits */}
          {step === 3 && (
            <div className="space-y-4">
              <SectionTitle>Produits Phytosanitaires (PPP)</SectionTitle>
              {produits.map((p, i) => (
                <div key={i} className="rounded-xl border border-[#e0e5d5] bg-[#f9fbf5] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#203b14] uppercase tracking-widest flex items-center gap-1.5">
                      <FlaskConical className="w-3 h-3" /> Produit {i + 1}
                    </span>
                    {produits.length > 1 && (
                      <button
                        onClick={() => setProduits(prev => prev.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nom commercial" required>
                      <select value={p.produit_id} onChange={e => selectProduit(i, e.target.value)}
                        className="glass-input w-full px-3 py-2.5 text-sm">
                        <option value="">— Sélectionner —</option>
                        {produitsPPP.map((prod: any) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.tradeName || prod.nom_commercial || prod.trade_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Matière active">
                      <input value={p.matiere_active} readOnly placeholder="Auto-rempli"
                        className="glass-input w-full px-3 py-2.5 text-sm opacity-60 cursor-default" />
                    </Field>
                  </div>
                  <Field label="N° Homologation (AMM/INPV)" hint="Optionnel — EU Reg. 2023/564">
                    <input
                      value={p.product_auth_number}
                      onChange={e => updateProduit(i, 'product_auth_number' as any, e.target.value)}
                      placeholder="ex: 2120100 ou INPV-2024-001"
                      className="glass-input w-full px-3 py-2.5 text-sm font-mono"
                    />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Dose (/hl)" hint="L ou kg / hectolitre">
                      <input type="number" step="0.01" value={p.dose_hl}
                        onChange={e => updateProduit(i, 'dose_hl', e.target.value)}
                        placeholder="0.25" className="glass-input w-full px-3 py-2.5 text-sm" />
                    </Field>
                    <Field label="Qté à sortir" hint={superficieNum > 0 ? `Auto · ${superficieNum} ha` : 'Saisir superficie d\'abord'}>
                      <input type="number" step="0.01" value={p.quantite_sortir}
                        onChange={e => updateProduit(i, 'quantite_sortir', e.target.value)}
                        placeholder="L ou kg" className="glass-input w-full px-3 py-2.5 text-sm" />
                    </Field>
                    <Field label="DAR (jours)">
                      <div className="glass-input w-full px-3 py-2.5 text-sm font-mono flex items-center gap-1.5">
                        <span className="text-amber-700 font-bold">{p.dar_jours || 21}</span>
                        <span className="text-[10px] text-[#31200b]/50">jours</span>
                      </div>
                    </Field>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setProduits(prev => [...prev, { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '', dar_jours: 21, product_auth_number: '' }])}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#203b14]/30 text-[#203b14] text-sm font-semibold hover:bg-[#203b14]/[0.04] transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter un produit
              </button>
              {darResult && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    DAR calculé : <strong>{darResult.dar_jours} jours</strong>
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono shrink-0">
                    Récolte après le {darResult.date_reentre.toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-[#e0e5d5] bg-[#f9fbf5] p-4 space-y-0.5">
                <p className="text-[10px] font-black text-[#203b14] uppercase tracking-widest mb-2">Récapitulatif de l&apos;ordre</p>
                <SummaryRow label="Parcelle" val={selectedOpt?.label || '—'} />
                <SummaryRow label="Superficie" val={superficieNum ? `${superficieNum} ha` : '—'} />
                <SummaryRow label="Date prévue" val={datePrevue ? new Date(datePrevue).toLocaleDateString('fr-FR') : '—'} />
                <SummaryRow label="Culture" val={culture || '—'} />
                <SummaryRow label="Cible" val={cible || '—'} />
                <SummaryRow label="Mode" val={modeApplication} />
                <SummaryRow label="Opérateur prévu" val={operateurPrevu || '—'} />
                <SummaryRow label="Produits" val={`${produits.filter(p => p.produit_id).length} produit(s)`} />
              </div>

              <p className="text-[10px] text-[#31200b]/55 italic border border-dashed border-[#e0e5d5] rounded-xl p-3">
                L&apos;exécution terrain (date réelle, volumes, visa RT) sera saisie par l&apos;opérateur après application, puis validée par le RT.
              </p>
            </div>
          )}

          {/* Errors */}
          {erreurs.length > 0 && (
            <div className="mt-4 flex flex-col gap-1 p-3 rounded-xl bg-red-50 border border-red-200">
              {erreurs.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{e}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-stone-moss)] shrink-0">
          <button
            onClick={step === 1 ? onClose : goBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#e0e5d5] text-sm text-[#31200b] hover:bg-[#f0f2eb] transition-colors"
          >
            {step === 1
              ? <><X className="w-3.5 h-3.5" /> Annuler</>
              : <><ChevronLeft className="w-3.5 h-3.5" /> Retour</>
            }
          </button>

          {/* Dot progress */}
          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <div key={s.id} className={cn(
                'h-1.5 rounded-full transition-all duration-200',
                step === s.id ? 'w-5 bg-[#203b14]' :
                step > s.id ? 'w-1.5 bg-[#203b14]/40' : 'w-1.5 bg-[#e0e5d5]'
              )} />
            ))}
          </div>

          {step < 3 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#203b14] text-white text-sm font-bold hover:bg-[#1a3010] transition-colors"
            >
              Suivant <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={soumettre}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#203b14] text-white text-sm font-bold hover:bg-[#1a3010] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                : <><CheckCircle2 className="w-4 h-4" /> Créer l&apos;ordre planifié</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
