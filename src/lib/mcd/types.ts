/** Types domaine — couche MCD LeadFarm (app UUID) */

export type TypeEvenement = {
  code: string;
  libelle: string;
  categorie: string;
  requiert_validation: boolean;
  requiert_meteo: boolean;
  requiert_dar: boolean;
  actif: boolean;
};

export type MicroZone = {
  id: string;
  parcelle_id: string;
  nom: string;
  boundary?: unknown;
  humidite_pourcentage?: number | null;
  type_sol?: string | null;
  stress_hydrique?: number | null;
  conductivite_electrique_ds_m?: number | null;
  parcelle_name?: string;
};

export type DonneesMeteo = {
  id: string;
  exploitation_id: string;
  zone_label?: string | null;
  date_mesure: string;
  temperature_min_c?: number | null;
  temperature_max_c?: number | null;
  humidite_pourcentage?: number | null;
  pluviometrie_mm?: number | null;
  vitesse_vent_kmh?: number | null;
  source?: string;
};

export type DonneesSatellite = {
  id: string;
  parcelle_id: string;
  date_acquisition: string;
  indice_ndvi?: number | null;
  indice_ndwi?: number | null;
  indice_evi?: number | null;
  indice_savi?: number | null;
  indice_ndre?: number | null;
  ndvi_min?: number | null;
  ndvi_max?: number | null;
  cloud_cover_pct?: number | null;
  source_satellite?: string;
  parcelle_name?: string;
};

export type Maladie = {
  id: string;
  nom: string;
  description?: string | null;
  type_pathogene?: string | null;
  cultures_cibles?: string[];
  actif?: boolean;
};

export type EvenementMaladie = {
  id: string;
  maladie_id: string;
  parcelle_id?: string | null;
  plantation_id?: string | null;
  treatment_id?: string | null;
  severite: string;
  date_observation: string;
  notes?: string | null;
  source?: string;
  maladie_nom?: string;
  parcelle_name?: string;
};

export type Protocole = {
  id: string;
  exploitation_id?: string | null;
  nom: string;
  type_culture?: string | null;
  variete_culture?: string | null;
  description?: string | null;
  actif?: boolean;
  etapes?: EtapeProtocole[];
};

export type EtapeProtocole = {
  id: string;
  protocole_id: string;
  ordre: number;
  jours_apres_plantation?: number | null;
  type_action: string;
  description?: string | null;
  type_evenement_code?: string | null;
  unite_action?: string | null;
};

export type Recolte = {
  id: string;
  parcelle_id: string;
  campagne_id?: string | null;
  plantation_id?: string | null;
  treatment_id?: string | null;
  date_recolte: string;
  quantite: number;
  unite: string;
  qualite?: string | null;
  identifiant_lot?: string | null;
  notes?: string | null;
  parcelle_name?: string;
  campagne_nom?: string;
};

export type Revenu = {
  id: string;
  recolte_id?: string | null;
  campagne_id?: string | null;
  montant_dzd: number;
  prix_unitaire_dzd?: number | null;
  devise?: string;
  date_encaissement?: string | null;
};

export type Depense = {
  id: string;
  treatment_id?: string | null;
  campagne_id?: string | null;
  type_depense: string;
  montant_dzd: number;
  date_depense?: string | null;
};

export type Resultat = {
  id: string;
  treatment_id?: string | null;
  parcelle_id?: string | null;
  taux_efficacite?: number | null;
  rendement_observe?: number | null;
  unite_rendement?: string;
  date_evaluation?: string | null;
  notes?: string | null;
  parcelle_name?: string;
};

export type MesureAgregee = {
  id: string;
  device_id?: string | null;
  parcelle_id?: string | null;
  type_mesure: string;
  periode: string;
  bucket_start: string;
  valeur_moyenne?: number | null;
  valeur_min?: number | null;
  valeur_max?: number | null;
  nb_echantillons?: number;
};

export type IaDecision = {
  id: string;
  exploitation_id?: string | null;
  recommandation: string;
  score_confiance?: number | null;
  type_decision?: string | null;
  statut: string;
  parcelle_id?: string | null;
  created_at?: string;
};

export type Apprentissage = {
  id: string;
  decision_id: string;
  resultat_id?: string | null;
  score_performance?: number | null;
  source_feedback?: string | null;
  type_ajustement?: string | null;
  version_modele?: string | null;
  horodatage?: string;
};

export type PnlCampagne = {
  campagne_id: string;
  campagne_nom: string;
  revenus_dzd: number;
  depenses_dzd: number;
  marge_dzd: number;
  nb_recoltes: number;
  nb_traitements: number;
};

export type TenantUser = {
  id: string;
  email: string;
  role: string;
  exploitation_id: string | null;
  full_name?: string | null;
};
