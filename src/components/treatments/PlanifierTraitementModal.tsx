'use client';

import React, { useState, useEffect } from 'react';
import { calculerDAR } from '@/lib/metier/dar';
import { fetchParcelles, fetchProducts, insertTreatment } from '@/lib/data-provider';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (traitement: any) => void;
  parcelleId?: string;
}

export default function PlanifierTraitementModal({ open, onClose, onSave, parcelleId }: Props) {
  // ── STATE ──────────────────────────────────────────────────────────────────
  const [parcelles, setParcelles] = useState<any[]>([]);
  const [produitsPPP, setProduitsPPP] = useState<any[]>([]);

  // Section 1
  const [site, setSite] = useState('');
  const [nTraitement, setNTraitement] = useState('');
  const [datePrevue, setDatePrevue] = useState('');
  const [selectedParcelle, setSelectedParcelle] = useState(parcelleId || '');
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

  // ── LOAD DATA ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    fetchParcelles().then(data => setParcelles(data || []));
    fetchProducts().then(data => setProduitsPPP(data || []));
  }, [open]);

  // ── AUTO-REMPLISSAGE ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedParcelle) {
      const p = parcelles.find((x: any) => x.id === selectedParcelle);
      if (p) {
        setSite(p.site || p.exploitationId || 'Domaine Khelifa');
        setSuperficie(`${p.areaHectares} ha`);
        setCulture(p.cropType || '');
        setVariete(p.variete || '');
      }
    }
  }, [selectedParcelle, parcelles]);

  // DAR Auto Calc
  useEffect(() => {
    if (!datePrevue || produits.every(p => !p.produit_id)) return;
    const produitsSelectionnes = produits.filter(p => p.produit_id);
    const result = calculerDAR(produitsSelectionnes, new Date(datePrevue), culture);
    setDateReentree(result.date_reentre.toLocaleDateString('fr-DZ'));
    setDar(`${result.dar_jours} jours`);
  }, [produits, datePrevue, culture]);

  const calculerQteSortir = (index: number, doseHl: string) => {
    const updated = [...produits];
    updated[index].dose_hl = doseHl;
    setProduits(updated);
  };

  // ── VALIDATION ──────────────────────────────────────────────────────────────
  const [erreurs, setErreurs] = useState<string[]>([]);

  function valider(): boolean {
    const errs: string[] = [];
    if (!selectedParcelle) errs.push('Sélectionner une parcelle');
    if (!datePrevue) errs.push('Date prévue obligatoire');
    if (!cible) errs.push('Maladie/Ravageur/Cible obligatoire');
    if (produits.filter(p => p.produit_id).length === 0) errs.push('Au moins 1 produit requis');
    setErreurs(errs);
    return errs.length === 0;
  }

  // ── SOUMISSION ──────────────────────────────────────────────────────────────
  async function soumettre() {
    if (!valider()) return;

    try {
      const p = parcelles.find((x: any) => x.id === selectedParcelle);

      // Produits détaillés pour le FOR.PR6.003
      const produitsPayload = produits
        .filter(prod => prod.produit_id)
        .map(prod => ({
          productId: prod.produit_id,
          nom_commercial: prod.nom_commercial,
          matiere_active: prod.matiere_active,
          dose_hl: prod.dose_hl,
          quantite_sortir: prod.quantite_sortir,
          dar_jours: prod.dar_jours,
        }));

      // Parse DAR
      const darMatch = dar.match(/(\d+)/);
      const darJours = darMatch ? parseInt(darMatch[1], 10) : 21;

      const res = await insertTreatment({
        parcelleName: p ? p.name : selectedParcelle,
        type: 'pulverisation',
        plannedDate: datePrevue,
        operatorName: operateur,
        areaTreatedHectares: parseFloat(superficie) || 0,
        // ── Section 1 ──
        culture,
        variete,
        cible,
        modeApplication,
        materiel,
        vitesseKmh: parseFloat(vitesse) || undefined,
        pressionBar: parseFloat(pression) || undefined,
        diametrePastillesMm: parseFloat(diametrePastilles) || undefined,
        // ── Section 2 ──
        produitsDetail: produitsPayload,
        // ── Section 3 ──
        dateReelle: dateReelle || undefined,
        heureDebut: heureDebut || undefined,
        heureFin: heureFin || undefined,
        qteProduitUtilise: qteProduitUtilise || undefined,
        bouillonParCiterne: parseFloat(bouillonParCiterne) || undefined,
        nbCiternes: parseInt(nbCiternes, 10) || undefined,
        // ── Section 4 ──
        dateReentree: dateReentree || undefined,
        darJours,
        efficacite: efficacite || undefined,
        visaRT: visaRT || undefined,
      });
      
      if (res) {
        onSave(res);
        onClose();
      }
    } catch (err) {
      setErreurs(['Erreur lors de la sauvegarde: ' + String(err)]);
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: '#fff', color: '#000',
        width: '100%', maxWidth: 900,
        maxHeight: '95vh', overflowY: 'auto',
        borderRadius: 4, padding: '24px',
        fontFamily: 'Calibri, Arial, sans-serif',
        fontSize: 13,
      }}>

        {/* EN-TÊTE FORMULAIRE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '2px solid #000', paddingBottom: 8 }}>
          <div style={{ width: 80, height: 40, border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>
            [Logo]
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>ORDRE DE TRAITEMENT</div>
          </div>
          <div style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11, textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold' }}>FOR.PR6.003</div>
            <div>Version : A</div>
            <div>Page : 1 sur 1</div>
          </div>
        </div>

        {/* SECTION 1 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={tdLabel}>Site :</td>
              <td style={tdInput}>
                <input style={inputStyle} value={site} onChange={e => setSite(e.target.value)} placeholder="Domaine Khelifa" />
              </td>
              <td style={tdLabel}>N° Traitement :</td>
              <td style={tdInput}>
                <input style={{...inputStyle, background: '#f5f5f5', color: '#666'}} value={nTraitement || 'Auto-généré'} readOnly />
              </td>
              <td style={tdLabel}>Date prévue de Traitement :</td>
              <td style={tdInput}>
                <input style={inputStyle} type="date" value={datePrevue} onChange={e => setDatePrevue(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={tdLabel}>Parcelle et superficie :</td>
              <td style={tdInput} colSpan={1}>
                <select style={inputStyle} value={selectedParcelle} onChange={e => setSelectedParcelle(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {parcelles.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.areaHectares} ha</option>
                  ))}
                </select>
              </td>
              <td style={tdLabel}>Culture :</td>
              <td style={tdInput}>
                <input style={inputStyle} value={culture} onChange={e => setCulture(e.target.value)} />
              </td>
              <td style={tdLabel}>Variété :</td>
              <td style={tdInput}>
                <input style={inputStyle} value={variete} onChange={e => setVariete(e.target.value)} />
              </td>
            </tr>
            <tr>
              <td style={tdLabel}>Maladie / Ravageur / Cible :</td>
              <td style={tdInput} colSpan={5}>
                <input style={inputStyle} value={cible} onChange={e => setCible(e.target.value)} placeholder="Ex: Boufaroua, Cochenille blanche, Mold gris..." />
              </td>
            </tr>
            <tr>
              <td style={tdLabel}>Mode d'application :</td>
              <td style={tdInput} colSpan={2}>
                <select style={inputStyle} value={modeApplication} onChange={e => setModeApplication(e.target.value)}>
                  <option>pulvérisation</option>
                  <option>injection</option>
                  <option>traitement du sol</option>
                  <option>nébulisation</option>
                </select>
              </td>
              <td style={tdLabel}>Matériel utilisé :</td>
              <td style={tdInput} colSpan={2}>
                <input style={inputStyle} value={materiel} onChange={e => setMateriel(e.target.value)} placeholder="Tracteur + pulvérisateur 1000L" />
              </td>
            </tr>
            <tr>
              <td style={tdLabel}>Vitesse d'avancement :</td>
              <td style={tdInput}>
                <input style={inputStyle} value={vitesse} onChange={e => setVitesse(e.target.value)} placeholder="km/h" />
              </td>
              <td style={tdLabel}>Pression de service :</td>
              <td style={tdInput}>
                <input style={inputStyle} value={pression} onChange={e => setPression(e.target.value)} placeholder="bar" />
              </td>
              <td style={tdLabel}>∅ des pastilles :</td>
              <td style={tdInput}>
                <input style={inputStyle} value={diametrePastilles} onChange={e => setDiametrePastilles(e.target.value)} placeholder="mm" />
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 2 : PRODUITS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={thStyle}>Produit<br/><span style={{ fontWeight: 'normal', fontSize: 11 }}>(Nom commercial)</span></th>
              <th style={thStyle}>Matière active</th>
              <th style={thStyle}>Dose (/hl)</th>
              <th style={thStyle}>Quantité du Produit à sortir</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <select style={inputStyleTable}
                    value={p.produit_id}
                    onChange={e => {
                      const prod = produitsPPP.find((x: any) => x.id === e.target.value) as any;
                      const updated = [...produits];
                      updated[i] = {
                        ...updated[i],
                        produit_id: e.target.value,
                        nom_commercial: prod?.tradeName || prod?.nom_commercial || prod?.trade_name || '',
                        matiere_active: prod?.activeSubstance || prod?.matiere_active || prod?.active_ingredient || '',
                        dar_jours: prod?.dar || 21,
                      };
                      setProduits(updated);
                    }}>
                    <option value="">—</option>
                    {produitsPPP.map((prod: any) => (
                      <option key={prod.id} value={prod.id}>{prod.tradeName || prod.nom_commercial || prod.trade_name}</option>
                    ))}
                  </select>
                </td>
                <td style={tdCell}>
                  <input style={inputStyleTable} value={p.matiere_active} readOnly placeholder="Auto-rempli" />
                </td>
                <td style={tdCell}>
                  <input style={inputStyleTable} value={p.dose_hl}
                    onChange={e => calculerQteSortir(i, e.target.value)}
                    placeholder="L/hl" type="number" step="0.01" />
                </td>
                <td style={tdCell}>
                  <input style={inputStyleTable} value={p.quantite_sortir}
                    onChange={e => { const u = [...produits]; u[i].quantite_sortir = e.target.value; setProduits(u); }}
                    placeholder="L ou Kg" type="number" step="0.1" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SECTION 3 : EXECUTION */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={thStyle}>Nom et visa de l'Opérateur</th>
              <th style={thStyle}>Date réelle d'application</th>
              <th style={thStyle}>Heure de début / Heure de fin</th>
              <th style={thStyle}>Quantité de produit utilisé</th>
              <th style={thStyle}>Bouillon par citerne</th>
              <th style={thStyle}>Nombre de citerne</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{...tdCell, minWidth: 120}}>
                <input style={inputStyleTable} value={operateur} onChange={e => setOperateur(e.target.value)} placeholder="Nom opérateur" />
              </td>
              <td style={tdCell}>
                <input style={inputStyleTable} type="date" value={dateReelle} onChange={e => setDateReelle(e.target.value)} />
              </td>
              <td style={tdCell}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input style={inputStyleTable} type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} placeholder="08:00" />
                  <span style={{ color: '#666', flexShrink: 0 }}>/</span>
                  <input style={inputStyleTable} type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} placeholder="11:30" />
                </div>
              </td>
              <td style={tdCell}>
                <input style={inputStyleTable} value={qteProduitUtilise} onChange={e => setQteProduitUtilise(e.target.value)} placeholder="L" type="number" />
              </td>
              <td style={tdCell}>
                <input style={inputStyleTable} value={bouillonParCiterne} onChange={e => setBouillonParCiterne(e.target.value)} placeholder="L" type="number" />
              </td>
              <td style={tdCell}>
                <input style={inputStyleTable} value={nbCiternes} onChange={e => setNbCiternes(e.target.value)} placeholder="0" type="number" />
              </td>
            </tr>
          </tbody>
        </table>

        {/* SECTION 4 : DAR */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={thStyle}>Date de réentrée</th>
              <th style={thStyle}>DAR</th>
              <th style={thStyle}>Efficacité du traitement ?</th>
              <th style={thStyle}>Visa Responsable technique</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}>
                <input style={{...inputStyleTable, background: '#e8f5e9', fontWeight: 'bold'}}
                  value={dateReentree} readOnly placeholder="Calculé auto" />
              </td>
              <td style={tdCell}>
                <input style={{...inputStyleTable, background: '#e8f5e9', fontWeight: 'bold'}}
                  value={dar} readOnly placeholder="Calculé auto" />
              </td>
              <td style={tdCell}>
                <input style={inputStyleTable} value={efficacite}
                  onChange={e => setEfficacite(e.target.value)}
                  placeholder="Rempli J+7 après traitement" />
              </td>
              <td style={{...tdCell, height: 48}}>
                <input style={inputStyleTable} value={visaRT}
                  onChange={e => setVisaRT(e.target.value)}
                  placeholder="Signature RT" />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ERREURS */}
        {erreurs.length > 0 && (
          <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: 4, padding: '8px 12px', marginBottom: 12 }}>
            {erreurs.map((e, i) => <div key={i} style={{ color: '#991B1B', fontSize: 12 }}>⚠ {e}</div>)}
          </div>
        )}

        {/* ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Annuler
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={soumettre}
              style={{ padding: '8px 24px', border: 'none', borderRadius: 4, background: '#203b14', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>
              Enregistrer (Brouillon)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// STYLES
const tdLabel: React.CSSProperties = {
  border: '1px solid #000', padding: '4px 6px',
  fontWeight: 'bold', fontSize: 11, whiteSpace: 'nowrap',
  background: '#fafafa', width: 1
};
const tdInput: React.CSSProperties = {
  border: '1px solid #000', padding: 2
};
const tdCell: React.CSSProperties = {
  border: '1px solid #000', padding: 2
};
const thStyle: React.CSSProperties = {
  border: '1px solid #000', padding: '5px 6px',
  fontSize: 11, fontWeight: 'bold', textAlign: 'center'
};
const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  padding: '3px 4px', fontSize: 12, background: 'transparent', fontFamily: 'Calibri, Arial'
};
const inputStyleTable: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  padding: '4px', fontSize: 12, background: 'transparent', fontFamily: 'Calibri, Arial'
};
