-- ═══════════════════════════════════════════════════════════════
-- LeadFarm — Complete Seed Script v1.0
-- Run this in your Supabase SQL Editor to see the platform alive.
-- ═══════════════════════════════════════════════════════════════

-- 1. CLEANUP (Optional)
-- DELETE FROM MESURE_IOT; DELETE FROM EVENEMENT_AGRONOMIQUE; DELETE FROM PLANTATION;

-- 2. INFRASTRUCTURE
INSERT INTO ZONE (nom_zone, surface_hectares) 
VALUES ('Sefyoun Nord', 45.0), ('Sefyoun Sud', 32.5);

INSERT INTO PARCELLE (identifiant_zone, nom_parcelle, superficie_hectares, type_sol) 
VALUES 
  (1, 'Parcelle A3', 8.2, 'Argilo-calcaire'),
  (1, 'Parcelle A4', 12.5, 'Sabloneux'),
  (2, 'Verger B1', 5.0, 'Limoneux');

INSERT INTO MICRO_ZONE (identifiant_parcelle, humidite_pourcentage, stress_hydrique, conductivite_electrique_ds_metre)
VALUES 
  (1, 62.5, 0.2, 1.4),
  (1, 58.0, 0.4, 1.2),
  (3, 70.2, 0.1, 1.6);

-- 3. USERS
INSERT INTO UTILISATEUR (nom_complet, adresse_email, role_utilisateur, numero_telephone)
VALUES ('Dr. Meziane', 'meziane@leadfarm.dz', 'AGRONOME', '+213 550 11 22 33');

-- 4. CAMPAIGNS
INSERT INTO CAMPAGNE (identifiant_zone, nom_campagne, date_debut, statut_campagne)
VALUES (1, 'Campagne Pommiers 2025', '2025-01-01', 'EN_COURS');

-- 5. PLANTATIONS (SCD2 Version 1)
INSERT INTO PLANTATION (identifiant_micro_zone, identifiant_campagne, type_culture, variete_culture, nombre_plants, date_plantation, action_historique)
VALUES (1, 1, 'Pommier', 'Golden Delicious', 340, '2024-11-15', 'INSERT');

-- 6. PRODUCTS & DISEASES
INSERT INTO PRODUIT_PHYTOSANITAIRE (nom_produit, type_produit, matiere_active)
VALUES ('Captane 80%', 'Fongicide', 'Captane'), ('Confidor', 'Insecticide', 'Imidaclopride');

INSERT INTO MALADIE (nom_maladie, type_pathogene)
VALUES ('Tavelure', 'Champignon'), ('Puceron Lanigère', 'Insecte');

-- 7. EVENTS (Timeline)
-- Event 1: Treatment
INSERT INTO EVENEMENT_AGRONOMIQUE (identifiant_plantation, identifiant_utilisateur, date_evenement, source_evenement, type_evenement, action_historique)
VALUES (1, 1, NOW() - INTERVAL '10 days', 'MANUEL', 'Traitement Fongique', 'INSERT');

INSERT INTO EVENEMENT_PRODUIT (identifiant_evenement, identifiant_produit, dose_appliquee, unite_dose)
VALUES (1, 1, 2.5, 'kg/ha');

-- Event 2: Disease Alert (AI)
INSERT INTO EVENEMENT_AGRONOMIQUE (identifiant_plantation, identifiant_utilisateur, date_evenement, source_evenement, type_evenement, action_historique)
VALUES (1, 1, NOW() - INTERVAL '5 days', 'IA', 'Alerte Sanitaire', 'INSERT');

INSERT INTO EVENEMENT_MALADIE (identifiant_evenement, identifiant_maladie, severite_maladie)
VALUES (2, 1, 'MODÉRÉ');

-- 8. IOT SENSORS & DATA
INSERT INTO CAPTEUR (identifiant_micro_zone, type_capteur, modele_capteur, statut_capteur)
VALUES (1, 'Humidité Sol', 'ESP32-S3-V2', 'ACTIF');

INSERT INTO MESURE_IOT (identifiant_capteur, horodatage, valeur_mesuree, unite_mesure)
VALUES 
  (1, NOW() - INTERVAL '1 hour', 62.5, '%'),
  (1, NOW() - INTERVAL '2 hours', 60.1, '%'),
  (1, NOW() - INTERVAL '3 hours', 58.4, '%');

-- 9. SATELLITE
INSERT INTO DONNEES_SATELLITE (identifiant_parcelle, date_acquisition, indice_vegetation_ndvi, indice_eau_ndwi, source_satellite)
VALUES 
  (1, '2025-03-01', 0.68, 0.38, 'Sentinel-2'),
  (1, '2025-03-15', 0.74, 0.42, 'Sentinel-2');
