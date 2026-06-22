import type { DonneesSatellite } from "./types";

/** Indices demo Sentinel-2 — 13 stations Tenira (alignés sur mock parcelles p-001…p-013). */
export const MOCK_SATELLITE: DonneesSatellite[] = [
  { id: "s1", parcelle_id: "p-001", date_acquisition: "2026-05-28", indice_ndvi: 0.74, indice_ndwi: 0.41, parcelle_name: "LA BASE 1" },
  { id: "s2", parcelle_id: "p-002", date_acquisition: "2026-05-28", indice_ndvi: 0.68, indice_ndwi: 0.36, parcelle_name: "LA BASE 2" },
  { id: "s3", parcelle_id: "p-003", date_acquisition: "2026-05-28", indice_ndvi: 0.36, indice_ndwi: 0.09, parcelle_name: "LA BASE 3" },
  { id: "s4", parcelle_id: "p-004", date_acquisition: "2026-05-28", indice_ndvi: 0.71, indice_ndwi: 0.38, parcelle_name: "Maguer Grande" },
  { id: "s5", parcelle_id: "p-005", date_acquisition: "2026-05-28", indice_ndvi: 0.48, indice_ndwi: -0.04, parcelle_name: "25 Ha" },
  { id: "s6", parcelle_id: "p-006", date_acquisition: "2026-05-28", indice_ndvi: 0.62, indice_ndwi: 0.22, parcelle_name: "13 Ha Devil Gala" },
  { id: "s7", parcelle_id: "p-007", date_acquisition: "2026-05-28", indice_ndvi: 0.55, indice_ndwi: 0.18, parcelle_name: "2 Ha SYS V" },
  { id: "s8", parcelle_id: "p-008", date_acquisition: "2026-05-28", indice_ndvi: 0.32, indice_ndwi: 0.05, parcelle_name: "HADJA FATMA" },
  { id: "s9", parcelle_id: "p-009", date_acquisition: "2026-05-28", indice_ndvi: 0.66, indice_ndwi: 0.31, parcelle_name: "CARRIERE" },
  { id: "s10", parcelle_id: "p-010", date_acquisition: "2026-05-28", indice_ndvi: 0.58, indice_ndwi: 0.14, parcelle_name: "HJIRA PETITE" },
  { id: "s11", parcelle_id: "p-011", date_acquisition: "2026-05-28", indice_ndvi: 0.52, indice_ndwi: 0.11, parcelle_name: "Maguer Petite" },
  { id: "s12", parcelle_id: "p-012", date_acquisition: "2026-05-28", indice_ndvi: 0.69, indice_ndwi: 0.33, parcelle_name: "LYCEE" },
  { id: "s13", parcelle_id: "p-013", date_acquisition: "2026-05-28", indice_ndvi: 0.44, indice_ndwi: 0.07, parcelle_name: "HJIRA GRANDE" },
];
