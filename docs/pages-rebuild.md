# Rebuild page par page

Ordre recommandé (pilotage → opérations → audit). Style : canvas blanc, typo void/graphite, CTA pill noir (`openai-style`).

| # | Route | Statut | Notes |
|---|--------|--------|-------|
| 1 | `/dashboard` | **En cours** | Carte + KPI ghost + tiroir parcelle |
| 2 | `/parcelles` | À faire | Découper `page.tsx` (~2700 lignes) |
| 3 | `/treatments` | À faire | Planning + validation |
| 4 | `/registre` | À faire | PDF FOR.PR6 |
| 5 | `/trace` | À faire | Fiche parcelle / campagnes |
| 6 | `/stock` | À faire | Lots + péremption |
| 7 | `/products` | À faire | Catalogue PPP |
| 8 | `/live` | À faire | IoT temps réel |
| 9 | `/login` | À faire | Auth achromatique |
| 10 | `/conformite` | À faire | LMR |
| 11 | `/reports` | À faire | Exports |
| 12 | Autres nav | Backlog | `maladies`, `satellite`, `vision`, … |

## Checklist par page

- [ ] Hero + fil d’Ariane cohérents (pas de doublon header/page)
- [ ] KPI / alertes en pills ghost uniquement
- [ ] CTA principal : pill noir (`Button` mono)
- [ ] Fond `#ffffff` sur le chrome UI (couleur réservée à la carte / images)
- [ ] États vide + erreur + chargement
- [ ] RBAC `FeatureGate` sur actions sensibles
- [ ] Pas de `any` sur le flux principal
- [ ] `tsc` + test manuel du parcours clé

## Dashboard (page 1)

**Parcours à valider :** KPI → clic parcelle → tiroir historique → FAB traitements → ligne tableau → centrage carte → FAB météo → exclusion mutuelle panneaux.
