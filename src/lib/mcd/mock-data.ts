import type {
  Apprentissage,
  DonneesMeteo,
  DonneesSatellite,
  EvenementMaladie,
  IaDecision,
  Maladie,
  MesureAgregee,
  MicroZone,
  PnlCampagne,
  Protocole,
  Recolte,
  Resultat,
  Revenu,
  TenantUser,
  TypeEvenement,
} from "./types";

export const MOCK_TYPE_EVENEMENTS: TypeEvenement[] = [
  { code: "pulverisation", libelle: "Pulvérisation", categorie: "traitement", requiert_validation: true, requiert_meteo: true, requiert_dar: true, actif: true },
  { code: "fertilisation", libelle: "Fertilisation", categorie: "traitement", requiert_validation: true, requiert_meteo: true, requiert_dar: false, actif: true },
  { code: "recolte", libelle: "Récolte", categorie: "recolte", requiert_validation: false, requiert_meteo: false, requiert_dar: false, actif: true },
  { code: "observation_maladie", libelle: "Observation maladie", categorie: "maladie", requiert_validation: false, requiert_meteo: false, requiert_dar: false, actif: true },
];

export const MOCK_MICRO_ZONES: MicroZone[] = [
  { id: "mz-1", parcelle_id: "p-001", nom: "Nord-A humide", humidite_pourcentage: 42, stress_hydrique: 0.2, conductivite_electrique_ds_m: 1.1, parcelle_name: "Parcelle Nord — Pommiers" },
  { id: "mz-2", parcelle_id: "p-003", nom: "Sud vignoble", humidite_pourcentage: 28, stress_hydrique: 0.55, conductivite_electrique_ds_m: 0.9, parcelle_name: "Parcelle Sud — Vigne" },
];

export const MOCK_METEO: DonneesMeteo[] = [
  { id: "m1", exploitation_id: "exp-001", zone_label: "Tlemcen", date_mesure: "2026-05-22", temperature_min_c: 14, temperature_max_c: 28, humidite_pourcentage: 52, pluviometrie_mm: 0, vitesse_vent_kmh: 12 },
  { id: "m2", exploitation_id: "exp-001", zone_label: "Tlemcen", date_mesure: "2026-05-21", temperature_min_c: 13, temperature_max_c: 26, humidite_pourcentage: 58, pluviometrie_mm: 3.2, vitesse_vent_kmh: 8 },
];

export { MOCK_SATELLITE } from "./mock-satellite";

export const MOCK_MALADIES: Maladie[] = [
  { id: "mal-1", nom: "Tavelure", type_pathogene: "fongique", cultures_cibles: ["pomme", "poire"] },
  { id: "mal-2", nom: "Oïdium", type_pathogene: "fongique", cultures_cibles: ["vigne"] },
  { id: "mal-3", nom: "Araignée rouge", type_pathogene: "acarien", cultures_cibles: ["agrume", "maraîchage"] },
];

export const MOCK_EVENEMENTS_MALADIE: EvenementMaladie[] = [
  { id: "em-1", maladie_id: "mal-1", parcelle_id: "p-001", severite: "moderee", date_observation: "2026-05-18T10:00:00Z", source: "IA", maladie_nom: "Tavelure", parcelle_name: "Parcelle Nord — Pommiers" },
];

export const MOCK_PROTOCOLES: Protocole[] = [
  {
    id: "prot-1",
    nom: "Itinéraire pommier bio",
    type_culture: "pomme",
    variete_culture: "Golden",
    description: "Calendrier J+0 à J+180",
    actif: true,
    etapes: [
      { id: "e1", protocole_id: "prot-1", ordre: 1, jours_apres_plantation: 30, type_action: "Pulvérisation préventive", type_evenement_code: "fongicide" },
      { id: "e2", protocole_id: "prot-1", ordre: 2, jours_apres_plantation: 90, type_action: "Fertilisation NPK", type_evenement_code: "fertilisation" },
    ],
  },
];

export const MOCK_RECOLTES: Recolte[] = [
  { id: "rec-1", parcelle_id: "p-001", campagne_id: "camp-2026", date_recolte: "2025-10-15", quantite: 42, unite: "t", qualite: "A", parcelle_name: "Parcelle Nord — Pommiers", campagne_nom: "Campagne 2025-2026" },
];

export const MOCK_REVENUS: Revenu[] = [
  { id: "rev-1", recolte_id: "rec-1", campagne_id: "camp-2026", montant_dzd: 840000, prix_unitaire_dzd: 20000 },
];

export const MOCK_RESULTATS: Resultat[] = [
  { id: "res-1", treatment_id: "trt-001", parcelle_id: "p-001", taux_efficacite: 0.87, rendement_observe: 42, date_evaluation: "2025-10-20", parcelle_name: "Parcelle Nord — Pommiers" },
];

export const MOCK_MESURES_AGREGEES: MesureAgregee[] = [
  { id: "agg-1", device_id: "ESP32-001", type_mesure: "debit", periode: "heure", bucket_start: "2026-05-23T08:00:00Z", valeur_moyenne: 2.4, valeur_min: 1.8, valeur_max: 3.1, nb_echantillons: 120 },
  { id: "agg-2", device_id: "ESP32-001", type_mesure: "temperature", periode: "jour", bucket_start: "2026-05-22T00:00:00Z", valeur_moyenne: 24.5, valeur_min: 14, valeur_max: 31, nb_echantillons: 288 },
];

export const MOCK_DECISIONS: IaDecision[] = [
  { id: "dec-1", recommandation: "Reporter la pulvérisation — vent > 15 km/h prévu demain", score_confiance: 0.91, type_decision: "fenetre_meteo", statut: "proposee", parcelle_id: "p-001" },
];

export const MOCK_APPRENTISSAGES: Apprentissage[] = [
  { id: "app-1", decision_id: "dec-1", resultat_id: "res-1", score_performance: 0.85, source_feedback: "operateur", version_modele: "v1.2" },
];

export const MOCK_PNL: PnlCampagne[] = [
  { campagne_id: "camp-2026", campagne_nom: "Campagne 2025-2026", revenus_dzd: 840000, depenses_dzd: 125000, marge_dzd: 715000, nb_recoltes: 1, nb_traitements: 12 },
];

export const MOCK_TENANT_USERS: TenantUser[] = [
  { id: "u-1", email: "akram@leadfarm.dz", role: "directeur", exploitation_id: "exp-001", full_name: "Akram Benali" },
  { id: "u-2", email: "tech@leadfarm.dz", role: "responsable_technique", exploitation_id: "exp-001", full_name: "Sara Technicien" },
];
