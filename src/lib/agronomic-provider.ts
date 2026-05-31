import { supabase } from "./supabase";

export async function fetchAgronomicTraceability(id: string) {
  const { data, error } = await supabase
    .from('plantation')
    .select(`
      *,
      micro_zone (
        *,
        parcelle (
          *,
          zone (*)
        )
      ),
      evenement_agronomique (
        *,
        evenement_produit (
          *,
          produit_phytosanitaire (*)
        ),
        evenement_maladie (
          *,
          maladie (*)
        )
      )
    `)
    .eq('identifiant_plantation', id)
    .single();

  if (error) throw error;

  // Adapt snake_case to camelCase for the UI if needed, or use directly
  return data;
}

export async function fetchPlantations() {
  const { data, error } = await supabase
    .from('plantation')
    .select(`
      *,
      micro_zone (
        parcelle (
          nom_parcelle
        )
      )
    `)
    .eq('est_actuel', true)
    .order('date_plantation', { ascending: false });

  if (error) throw error;
  return data;
}
