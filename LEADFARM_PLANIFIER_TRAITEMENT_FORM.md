# LeadFarm — Tâche : Planifier un Traitement = Formulaire FOR.PR6.003

## Objectif
Dans la page `/treatments`, quand l'utilisateur clique "Planifier un traitement",
afficher un modal/drawer qui ressemble EXACTEMENT au formulaire papier FOR.PR6.003
photographié. Le formulaire digital doit être identique visuellement au papier.

Stack : Next.js 16 / React 19 / TypeScript / Tailwind CSS / Supabase

---

## Structure exacte du formulaire papier à reproduire

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Logo exploitaion]    ORDRE DE TRAITEMENT    FOR.PR6.003  Version : A  │
│                                              Page : 1 sur 1             │
├─────────────────────────┬────────────────────────┬──────────────────────┤
│ Site :                  │ N° Traitement :         │ Date prévue :        │
├─────────────────────────┼────────────────────────┴──────────────────────┤
│ Parcelle et superficie :│ Culture :               │ Variété :            │
├─────────────────────────┴─────────────────────────┴──────────────────────┤
│ Maladie / Ravageur / Cible :                                             │
├──────────────────────────────────────┬───────────────────────────────────┤
│ Mode d'application :                 │ Matériel utilisé :                │
├─────────────────────────┬────────────┴──────────────────────────────────┤
│ Vitesse d'avancement :  │ Pression de service :   │ ∅ des pastilles :   │
├─────────────────────────┴─────────────────────────┴──────────────────────┤
│ ┌──────────────────────┬───────────────────┬──────────────┬────────────┐ │
│ │ Produit              │ Matière active    │ Dose (/hl)   │ Qté sortir │ │
│ │ (Nom commercial)     │                   │              │            │ │
│ ├──────────────────────┼───────────────────┼──────────────┼────────────┤ │
│ │                      │                   │              │            │ │
│ ├──────────────────────┼───────────────────┼──────────────┼────────────┤ │
│ │                      │                   │              │            │ │
│ ├──────────────────────┼───────────────────┼──────────────┼────────────┤ │
│ │                      │                   │              │            │ │
│ └──────────────────────┴───────────────────┴──────────────┴────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┬──────────────────┬───────────────┬────────────────┐  │
│ │ Nom et visa de  │ Date réelle      │ Heure de début│ Quantité de    │  │
│ │ l'Opérateur     │ d'application    │ Heure de fin  │ produit utilisé│  │
│ ├─────────────────┼──────────────────┼───────────────┼────────────────┤  │
│ │                 │                  │               │                │  │
│ └─────────────────┴──────────────────┴───────────────┴────────────────┘  │
│ ┌──────────────────────────────┬──────────────────────────────────────┐   │
│ │ Bouillon par citerne         │ Nombre de citerne                    │   │
│ └──────────────────────────────┴──────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┬──────────┬─────────────────────────┬─────────────┐  │
│ │ Date de réentrée │ DAR      │ Efficacité du traitement?│ Visa RT     │  │
│ ├──────────────────┼──────────┼─────────────────────────┼─────────────┤  │
│ │ [calculé auto]   │[calculé] │                         │             │  │
│ └──────────────────┴──────────┴─────────────────────────┴─────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Composant React à créer

**Fichier :** `components/treatments/PlanifierTraitementModal.tsx`

```tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculerDAR } from '@/lib/metier/dar';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (traitement: any) => void;
  parcelleId?: string; // pré-sélectionné si ouvert depuis la carte
}

export default function PlanifierTraitementModal({ open, onClose, onSave, parcelleId }: Props) {
  // ── STATE ──────────────────────────────────────────────────────────────────
  const [parcelles, setParcelles] = useState([]);
  const [produitsPPP, setProduitsPPP] = useState([]);

  // Champs Section 1 — En-tête
  const [site, setSite] = useState('');
  const [nTraitement, setNTraitement] = useState(''); // auto-généré
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

  // Section 2 — Produits (max 3)
  const [produits, setProduits] = useState([
    { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '' },
    { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '' },
    { produit_id: '', nom_commercial: '', matiere_active: '', dose_hl: '', quantite_sortir: '' },
  ]);

  // Section 3 — Exécution (remplie après, pré-remplie si IoT)
  const [operateur, setOperateur] = useState('');
  const [dateReelle, setDateReelle] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [qteProduitUtilise, setQteProduitUtilise] = useState('');
  const [bouillonParCiterne, setBouillonParCiterne] = useState('');
  const [nbCiternes, setNbCiternes] = useState('');

  // Section 4 — DAR (calculé automatiquement)
  const [dateReentree, setDateReentree] = useState(''); // auto
  const [dar, setDar] = useState('');                   // auto
  const [efficacite, setEfficacite] = useState('');
  const [visaRT, setVisaRT] = useState('');

  // ── AUTO-REMPLISSAGE ────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedParcelle) {
      const p = parcelles.find((x: any) => x.id === selectedParcelle);
      if (p) {
        setSite((p as any).exploitation?.nom || '');
        setSuperficie(`${(p as any).surface_ha} ha`);
        setCulture((p as any).culture_actuelle || '');
        setVariete((p as any).variete || '');
      }
    }
  }, [selectedParcelle, parcelles]);

  // Calcul DAR automatique quand les produits changent
  useEffect(() => {
    if (!datePrevue || produits.every(p => !p.produit_id)) return;
    const produitsSelectionnes = produits.filter(p => p.produit_id);
    const result = calculerDAR(produitsSelectionnes, new Date(datePrevue), culture);
    setDateReentree(result.date_reentre.toLocaleDateString('fr-DZ'));
    setDar(`${result.dar_jours} jours`);
  }, [produits, datePrevue, culture]);

  // Calcul quantité à sortir automatique
  const calculerQteSortir = (index: number, doseHl: string) => {
    // Qté = dose (L/hl) × volume bouillie (hl)
    // volume bouillie = superficie (ha) × débit (hl/ha) selon le matériel
    // Pour l'instant on laisse le champ éditable si pas de IoT
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

    // Générer N° traitement
    const { count } = await supabase.from('traitements').select('*', { count: 'exact', head: true });
    const numero = `T-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    const payload = {
      n_traitement: numero,
      parcelle_id: selectedParcelle,
      status: 'draft',
      date_prevue: datePrevue,
      cible_maladie: cible,
      type: 'pulverisation',
      materiel: { description: materiel, vitesse_kmh: parseFloat(vitesse), pression_bar: parseFloat(pression), diam_pastilles_mm: parseFloat(diametrePastilles) },
      produits: produits.filter(p => p.produit_id).map(p => ({
        produit_id: p.produit_id,
        nom_commercial: p.nom_commercial,
        matiere_active: p.matiere_active,
        dose_hl: parseFloat(p.dose_hl),
        quantite_prevue: parseFloat(p.quantite_sortir)
      })),
      mode_application: modeApplication,
      operateur_nom: operateur,
    };

    const { data, error } = await supabase.from('traitements').insert(payload).select('id').single();
    if (!error) {
      onSave(data);
      onClose();
    }
  }

  if (!open) return null;

  // ── RENDU ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
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

        {/* ── EN-TÊTE FORMULAIRE ────────────────────────────────────── */}
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

        {/* ── SECTION 1 : INFORMATIONS GÉNÉRALES ───────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            {/* Ligne 1 */}
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
            {/* Ligne 2 */}
            <tr>
              <td style={tdLabel}>Parcelle et superficie :</td>
              <td style={tdInput} colSpan={1}>
                <select style={inputStyle} value={selectedParcelle} onChange={e => setSelectedParcelle(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {parcelles.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nom} — {p.surface_ha} ha</option>
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
            {/* Ligne 3 */}
            <tr>
              <td style={tdLabel}>Maladie / Ravageur / Cible :</td>
              <td style={tdInput} colSpan={5}>
                <input style={inputStyle} value={cible} onChange={e => setCible(e.target.value)} placeholder="Ex: Boufaroua, Cochenille blanche, Mold gris..." />
              </td>
            </tr>
            {/* Ligne 4 */}
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
            {/* Ligne 5 */}
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

        {/* ── SECTION 2 : TABLEAU PRODUITS ─────────────────────────── */}
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
                        nom_commercial: prod?.nom_commercial || '',
                        matiere_active: prod?.matiere_active || '',
                      };
                      setProduits(updated);
                    }}>
                    <option value="">—</option>
                    {produitsPPP.map((prod: any) => (
                      <option key={prod.id} value={prod.id}>{prod.nom_commercial}</option>
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

        {/* ── SECTION 3 : EXÉCUTION ─────────────────────────────────── */}
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
                <input style={inputStyleTable} placeholder="08:00 / 11:30" value={`${heureDebut}${heureFin ? ' / '+heureFin : ''}`} readOnly />
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

        {/* ── SECTION 4 : DAR + VISA RT ─────────────────────────────── */}
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

        {/* ── ERREURS ───────────────────────────────────────────────── */}
        {erreurs.length > 0 && (
          <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: 4, padding: '8px 12px', marginBottom: 12 }}>
            {erreurs.map((e, i) => <div key={i} style={{ color: '#991B1B', fontSize: 12 }}>⚠ {e}</div>)}
          </div>
        )}

        {/* ── ACTIONS ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Annuler
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => { if (valider()) { /* Générer PDF aperçu */ } }}
              style={{ padding: '8px 20px', border: '1px solid #00D4AA', borderRadius: 4, background: '#fff', color: '#00D4AA', cursor: 'pointer', fontSize: 13 }}>
              Aperçu PDF
            </button>
            <button
              onClick={soumettre}
              style={{ padding: '8px 24px', border: 'none', borderRadius: 4, background: '#00D4AA', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>
              Enregistrer (Brouillon)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
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
```

---

## Connexion Supabase — chargement des données

```typescript
// Dans le useEffect au montage du modal
useEffect(() => {
  if (!open) return;

  // Charger parcelles
  supabase.from('parcelles')
    .select('id, nom, surface_ha, culture_actuelle, variete, exploitation:exploitations(nom)')
    .then(({ data }) => setParcelles(data || []));

  // Charger produits PPP en stock
  supabase.from('produits_ppp')
    .select('id, nom_commercial, matiere_active, formulation, dar_par_culture')
    .eq('homologue_inpv', true)
    .then(({ data }) => setProduitsPPP(data || []));
}, [open]);
```

---

## Intégration dans la page `/treatments`

```tsx
// Remplacer l'actuel bouton "Planifier un traitement" par :
const [modalOpen, setModalOpen] = useState(false);

<button onClick={() => setModalOpen(true)}>
  + Planifier un traitement
</button>

<PlanifierTraitementModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  onSave={(traitement) => {
    refreshTreatments(); // recharger la liste
    setModalOpen(false);
  }}
/>
```

---

## Règles absolues

```
✅ Le formulaire visuel suit EXACTEMENT la mise en page du formulaire papier FOR.PR6.003
✅ Fond blanc, bordures noires, police Calibri — identique au papier
✅ Sections dans le même ordre : En-tête → Produits → Exécution → DAR
✅ Date de réentrée et DAR = calculés automatiquement (jamais saisis manuellement)
✅ Matière active = auto-remplie quand le produit est sélectionné (lecture seule)
✅ N° Traitement = auto-généré (T-{YYYY}-{seq}) — champ en lecture seule
✅ Parcelle sélectionnée → Site, Culture, Variété se remplissent automatiquement
✅ Max 3 lignes produits — la 4ème ligne n'existe pas
✅ Section Exécution = pré-remplie si données IoT disponibles, sinon éditable
✅ Section Efficacité = toujours vide à la création (remplie J+7)
✅ Bouton "Enregistrer" → status = 'draft' (pas encore soumis pour approbation)
✅ Bouton "Aperçu PDF" → générer PDF identique au formulaire papier
✅ Champs vides dans la section Exécution = normal à la création (avant le terrain)
```
