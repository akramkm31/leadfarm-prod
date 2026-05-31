/** Champs Supabase pour jointures parcelle / plantation / traçabilité */
export const PARCELLE_FIELDS =
  "id, nom, code_parcelle, surface_ha, type_sol, culture_actuelle, variete, date_plantation, exploitation_id, exploitations ( nom, wilaya, commune )";

export const PLANTATION_DETAIL_SELECT = `*, parcelles ( ${PARCELLE_FIELDS} ), campagnes ( nom, date_debut, date_fin, statut )`;
