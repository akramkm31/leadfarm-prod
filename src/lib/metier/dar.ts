export function calculerDAR(
  produits: { produit_id: string; nom_commercial: string; matiere_active: string; dar_jours?: number }[],
  datePrevue: Date,
  culture: string
) {
  if (!produits || produits.length === 0) {
    return { date_reentre: datePrevue, dar_jours: 0 };
  }

  // Determine the maximum DAR among selected products
  let maxDar = 0;
  for (const p of produits) {
    // If we have actual DAR from DB we use it, otherwise fallback to standard 21 days
    const dar = p.dar_jours ?? 21; 
    if (dar > maxDar) maxDar = dar;
  }

  const dateReentree = new Date(datePrevue);
  dateReentree.setDate(dateReentree.getDate() + maxDar);

  return { date_reentre: dateReentree, dar_jours: maxDar };
}
