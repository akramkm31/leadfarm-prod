-- ═══════════════════════════════════════════════════════════════
-- LeadFarm — IoT Measurement Types Seed
-- ═══════════════════════════════════════════════════════════════

INSERT INTO TYPE_MESURE (identifiant_type_mesure, code_mesure, libelle_mesure, unite_par_defaut) VALUES
(1, 'TEMP_AIR', 'Température de l''air', '°C'),
(2, 'HUM_AIR', 'Humidité de l''air', '%'),
(3, 'HUM_SOL', 'Humidité du sol', '%'),
(4, 'BATT_LVL', 'Niveau batterie capteur', '%'),
(5, 'NPK_N', 'Azote (N)', 'mg/kg'),
(6, 'NPK_P', 'Phosphore (P)', 'mg/kg'),
(7, 'NPK_K', 'Potassium (K)', 'mg/kg'),
(99, 'OTHER', 'Autre mesure', 'N/A')
ON CONFLICT (identifiant_type_mesure) DO UPDATE SET 
  code_mesure = EXCLUDED.code_mesure,
  libelle_mesure = EXCLUDED.libelle_mesure,
  unite_par_defaut = EXCLUDED.unite_par_defaut;
