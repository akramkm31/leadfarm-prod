'use client';

import React, { useState, useEffect } from 'react';
import { fetchParcelles, fetchProducts, updateTreatment } from '@/lib/data-provider';
import { calculerDAR } from '@/lib/metier/dar';

interface Props {
  open: boolean;
  treatment: any | null;
  onClose: () => void;
  onSaved: (updated: any) => void;
}

export default function EditTraitementModal({ open, treatment, onClose, onSaved }: Props) {
  const [parcelles, setParcelles] = useState<any[]>([]);
  const [produitsPPP, setProduitsPPP] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);

  // Section 1
  const [datePrevue, setDatePrevue] = useState('');
  const [selectedParcelle, setSelectedParcelle] = useState('');
  const [superficie, setSuperficie] = useState('');
  const [culture, setCulture] = useState('');
  const [variete, setVariete] = useState('');
  const [cible, setCible] = useState('');
  const [modeApplication, setModeApplication] = useState('pulvérisation');
  const [materiel, setMateriel] = useState('');
  const [vitesse, setVitesse] = useState('');
  const [pression, setPression] = useState('');
  const [diametrePastilles, setDiametrePastilles] = useState('');

  // Section 2
  const [produits, setProduits] = useState([
    { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '', dar_jours: 21 },
    { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '', dar_jours: 21 },
    { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '', dar_jours: 21 },
  ]);

  // Section 3
  const [operateur, setOperateur] = useState('');
  const [dateReelle, setDateReelle] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [qteProduitUtilise, setQteProduitUtilise] = useState('');
  const [bouillonParCiterne, setBouillonParCiterne] = useState('');
  const [nbCiternes, setNbCiternes] = useState('');

  // Section 4
  const [dateReentree, setDateReentree] = useState('');
  const [dar, setDar] = useState('');
  const [efficacite, setEfficacite] = useState('');
  const [visaRT, setVisaRT] = useState('');

  // ── Load reference data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    fetchParcelles().then(d => setParcelles(d || []));
    fetchProducts().then(d => setProduitsPPP(d || []));
  }, [open]);

  // ── Pre-fill from existing treatment ────────────────────────────────────────
  useEffect(() => {
    if (!open || !treatment) return;
    setDatePrevue(treatment.plannedDate?.slice(0, 10) || '');
    setSelectedParcelle(treatment.siteId || '');
    setSuperficie(treatment.areaTreatedHectares ? String(treatment.areaTreatedHectares) : '');
    setCulture(treatment.culture || '');
    setVariete(treatment.variete || '');
    setCible(treatment.cible || '');
    setModeApplication(treatment.mode_application || 'pulvérisation');
    setMateriel(treatment.materiel || '');
    setVitesse(treatment.vitesse_kmh ? String(treatment.vitesse_kmh) : '');
    setPression(treatment.pression_bar ? String(treatment.pression_bar) : '');
    setDiametrePastilles(treatment.diametre_pastilles_mm ? String(treatment.diametre_pastilles_mm) : '');
    setOperateur(treatment.operatorName || '');
    setDateReelle(treatment.date_reelle?.slice(0, 10) || '');
    setHeureDebut(treatment.heure_debut || '');
    setHeureFin(treatment.heure_fin || '');
    setQteProduitUtilise(treatment.quantite_utilisee || '');
    setBouillonParCiterne(treatment.bouillon_citerne_l ? String(treatment.bouillon_citerne_l) : '');
    setNbCiternes(treatment.nb_citernes ? String(treatment.nb_citernes) : '');
    setDateReentree(treatment.date_reentree?.slice(0, 10) || '');
    setDar(treatment.dar_jours ? `${treatment.dar_jours} jours` : '');
    setEfficacite(treatment.efficacite || '');
    setVisaRT(treatment.visa_rt || '');

    // Pre-fill products
    const existing: any[] = treatment.produitsDetail || [];
    const rows = [0, 1, 2].map(i => existing[i]
      ? {
          produit_id: existing[i].productId || '',
          nom_commercial: existing[i].nom_commercial || '',
          matiere_active: existing[i].matiere_active || '',
          dose_hl: existing[i].dose_hl || '',
          quantite_sortir: existing[i].quantite_sortir || '',
          dar_jours: existing[i].dar_jours || 21,
        }
      : { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '', dar_jours: 21 }
    );
    setProduits(rows);
    setErreurs([]);
  }, [open, treatment]);

  // ── DAR auto-calc ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!datePrevue || produits.every(p => !p.produit_id)) return;
    const sel = produits.filter(p => p.produit_id);
    const result = calculerDAR(sel, new Date(datePrevue), culture);
    setDateReentree(result.date_reentre.toLocaleDateString('fr-DZ'));
    setDar(`${result.dar_jours} jours`);
  }, [produits, datePrevue, culture]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function soumettre() {
    const errs: string[] = [];
    if (!datePrevue) errs.push('Date prévue obligatoire');
    if (!cible) errs.push('Maladie/Ravageur/Cible obligatoire');
    if (errs.length) { setErreurs(errs); return; }

    setSaving(true);
    try {
      const produitsPayload = produits
        .filter(p => p.produit_id)
        .map(p => ({
          productId: p.produit_id,
          nom_commercial: p.nom_commercial,
          matiere_active: p.matiere_active,
          dose_hl: p.dose_hl,
          quantite_sortir: p.quantite_sortir,
          dar_jours: p.dar_jours,
        }));

      const darMatch = dar.match(/(\d+)/);
      const darJours = darMatch ? parseInt(darMatch[1], 10) : 21;

      // Find parcelle name from id
      const p = parcelles.find((x: any) => x.id === selectedParcelle);

      const updated = await updateTreatment(treatment.id, {
        parcelleName: p ? p.name : (treatment.parcelleName || ''),
        plannedDate: datePrevue,
        operatorName: operateur,
        areaTreatedHectares: parseFloat(superficie) || undefined,
        culture, variete, cible, modeApplication, materiel,
        vitesseKmh: parseFloat(vitesse) || undefined,
        pressionBar: parseFloat(pression) || undefined,
        diametrePastillesMm: parseFloat(diametrePastilles) || undefined,
        produitsDetail: produitsPayload,
        dateReelle: dateReelle || undefined,
        heureDebut: heureDebut || undefined,
        heureFin: heureFin || undefined,
        qteProduitUtilise: qteProduitUtilise || undefined,
        bouillonParCiterne: parseFloat(bouillonParCiterne) || undefined,
        nbCiternes: parseInt(nbCiternes, 10) || undefined,
        dateReentree: dateReentree || undefined,
        darJours,
        efficacite: efficacite || undefined,
        visaRT: visaRT || undefined,
      });

      onSaved(updated);
      onClose();
    } catch (err) {
      setErreurs(['Erreur lors de la sauvegarde: ' + String(err)]);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !treatment) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff', color: '#000',
        width: '100%', maxWidth: 900,
        maxHeight: '95vh', overflowY: 'auto',
        borderRadius: 4, padding: '24px',
        fontFamily: 'Calibri, Arial, sans-serif', fontSize: 13,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '2px solid #000', paddingBottom: 8 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>MODIFIER LE TRAITEMENT</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>FOR.PR6.003 — {treatment.id?.slice(0, 8).toUpperCase()}</div>
          </div>
          <div style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11, textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold' }}>FOR.PR6.003</div>
            <div>Version : A</div>
          </div>
        </div>

        {/* SECTION 1 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={tdLabel}>Date prévue :</td>
              <td style={tdInput}><input style={inp} type="date" value={datePrevue} onChange={e => setDatePrevue(e.target.value)} /></td>
              <td style={tdLabel}>Culture :</td>
              <td style={tdInput}><input style={inp} value={culture} onChange={e => setCulture(e.target.value)} /></td>
              <td style={tdLabel}>Variété :</td>
              <td style={tdInput}><input style={inp} value={variete} onChange={e => setVariete(e.target.value)} /></td>
            </tr>
            <tr>
              <td style={tdLabel}>Parcelle :</td>
              <td style={tdInput} colSpan={2}>
                <select style={inp} value={selectedParcelle} onChange={e => setSelectedParcelle(e.target.value)}>
                  <option value="">{treatment.parcelleName || 'Sélectionner...'}</option>
                  {parcelles.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.areaHectares} ha</option>)}
                </select>
              </td>
              <td style={tdLabel}>Superficie :</td>
              <td style={tdInput} colSpan={2}><input style={inp} value={superficie} onChange={e => setSuperficie(e.target.value)} placeholder="ha" /></td>
            </tr>
            <tr>
              <td style={tdLabel}>Maladie / Ravageur / Cible :</td>
              <td style={tdInput} colSpan={5}><input style={inp} value={cible} onChange={e => setCible(e.target.value)} /></td>
            </tr>
            <tr>
              <td style={tdLabel}>Mode d'application :</td>
              <td style={tdInput} colSpan={2}>
                <select style={inp} value={modeApplication} onChange={e => setModeApplication(e.target.value)}>
                  <option>pulvérisation</option><option>injection</option>
                  <option>traitement du sol</option><option>nébulisation</option>
                </select>
              </td>
              <td style={tdLabel}>Matériel utilisé :</td>
              <td style={tdInput} colSpan={2}><input style={inp} value={materiel} onChange={e => setMateriel(e.target.value)} /></td>
            </tr>
            <tr>
              <td style={tdLabel}>Vitesse d'avancement :</td>
              <td style={tdInput}><input style={inp} value={vitesse} onChange={e => setVitesse(e.target.value)} placeholder="km/h" /></td>
              <td style={tdLabel}>Pression de service :</td>
              <td style={tdInput}><input style={inp} value={pression} onChange={e => setPression(e.target.value)} placeholder="bar" /></td>
              <td style={tdLabel}>∅ des pastilles :</td>
              <td style={tdInput}><input style={inp} value={diametrePastilles} onChange={e => setDiametrePastilles(e.target.value)} placeholder="mm" /></td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 2 : PRODUITS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={th}>Produit (Nom commercial)</th>
              <th style={th}>Matière active</th>
              <th style={th}>Dose (/hl)</th>
              <th style={th}>Quantité à sortir</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <select style={inpTable} value={p.produit_id} onChange={e => {
                    const prod = produitsPPP.find((x: any) => x.id === e.target.value) as any;
                    const u = [...produits];
                    u[i] = { ...u[i], produit_id: e.target.value,
                      nom_commercial: prod?.tradeName || prod?.nom_commercial || '',
                      matiere_active: prod?.activeSubstance || prod?.matiere_active || '',
                      dar_jours: prod?.dar || 21 };
                    setProduits(u);
                  }}>
                    <option value="">—</option>
                    {produitsPPP.map((pr: any) => <option key={pr.id} value={pr.id}>{pr.tradeName || pr.nom_commercial}</option>)}
                  </select>
                </td>
                <td style={tdCell}><input style={inpTable} value={p.matiere_active} readOnly placeholder="Auto" /></td>
                <td style={tdCell}>
                  <input style={inpTable} value={p.dose_hl} type="number" step="0.01"
                    onChange={e => { const u = [...produits]; u[i].dose_hl = e.target.value; setProduits(u); }} />
                </td>
                <td style={tdCell}>
                  <input style={inpTable} value={p.quantite_sortir} type="number" step="0.1"
                    onChange={e => { const u = [...produits]; u[i].quantite_sortir = e.target.value; setProduits(u); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SECTION 3 : EXECUTION */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={th}>Opérateur</th><th style={th}>Date réelle</th>
              <th style={th}>Heure début / fin</th><th style={th}>Qté utilisée</th>
              <th style={th}>Bouillon/citerne</th><th style={th}>Nb citernes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}><input style={inpTable} value={operateur} onChange={e => setOperateur(e.target.value)} /></td>
              <td style={tdCell}><input style={inpTable} type="date" value={dateReelle} onChange={e => setDateReelle(e.target.value)} /></td>
              <td style={tdCell}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input style={inpTable} type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} />
                  <span>/</span>
                  <input style={inpTable} type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} />
                </div>
              </td>
              <td style={tdCell}><input style={inpTable} value={qteProduitUtilise} type="number" onChange={e => setQteProduitUtilise(e.target.value)} /></td>
              <td style={tdCell}><input style={inpTable} value={bouillonParCiterne} type="number" onChange={e => setBouillonParCiterne(e.target.value)} /></td>
              <td style={tdCell}><input style={inpTable} value={nbCiternes} type="number" onChange={e => setNbCiternes(e.target.value)} /></td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 4 : DAR */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={th}>Date de réentrée</th><th style={th}>DAR</th>
              <th style={th}>Efficacité du traitement</th><th style={th}>Visa RT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}><input style={{ ...inpTable, background: '#e8f5e9', fontWeight: 'bold' }} value={dateReentree} readOnly /></td>
              <td style={tdCell}><input style={{ ...inpTable, background: '#e8f5e9', fontWeight: 'bold' }} value={dar} readOnly /></td>
              <td style={tdCell}><input style={inpTable} value={efficacite} onChange={e => setEfficacite(e.target.value)} /></td>
              <td style={tdCell}><input style={inpTable} value={visaRT} onChange={e => setVisaRT(e.target.value)} /></td>
            </tr>
          </tbody>
        </table>

        {/* Errors */}
        {erreurs.length > 0 && (
          <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: 4, padding: '8px 12px', marginBottom: 12 }}>
            {erreurs.map((e, i) => <div key={i} style={{ color: '#991B1B', fontSize: 12 }}>⚠ {e}</div>)}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={soumettre} disabled={saving}
            style={{ padding: '8px 24px', border: 'none', borderRadius: 4, background: saving ? '#aaa' : '#203b14', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const tdLabel: React.CSSProperties = { border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold', fontSize: 11, whiteSpace: 'nowrap', background: '#fafafa', width: 1 };
const tdInput: React.CSSProperties = { border: '1px solid #000', padding: 2 };
const tdCell: React.CSSProperties = { border: '1px solid #000', padding: 2 };
const th: React.CSSProperties = { border: '1px solid #000', padding: '5px 6px', fontSize: 11, fontWeight: 'bold', textAlign: 'center' };
const inp: React.CSSProperties = { width: '100%', border: 'none', outline: 'none', padding: '3px 4px', fontSize: 12, background: 'transparent', fontFamily: 'Calibri, Arial' };
const inpTable: React.CSSProperties = { width: '100%', border: 'none', outline: 'none', padding: '4px', fontSize: 12, background: 'transparent', fontFamily: 'Calibri, Arial' };
