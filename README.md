# LeadFarm

Application Next.js de gestion phytosanitaire et agricole de précision (parcelles, stock, traitements, IoT, conformité).

## Démarrage (application canonique)

À la racine du dépôt :

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Variables d'environnement : copier `.env.example` vers `.env.local` et renseigner les clés Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint |

## Dossiers dépréciés

Les répertoires `frontend/` et `server/` à la racine ne sont plus l'entrée principale du produit. Toute évolution UI et API App Router se fait sous `src/` (Next.js 16).

## Supabase

Migrations SQL : `supabase/migrations/`. Appliquer via Supabase CLI ou le tableau de bord avant d'utiliser l'IoT live (`device_readings`, migration `015_device_readings.sql`).
