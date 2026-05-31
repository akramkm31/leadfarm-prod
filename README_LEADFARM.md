# LeadFarm Platform Implementation

Cette plateforme est construite selon le Master System Prompt fourni, avec une architecture découplée (Frontend React/Vite + Backend Express/Prisma).

## Structure du Projet
- `/frontend`: React 18 + Vite + Tailwind CSS + Leaflet + Recharts
- `/server`: Node.js 20 + Express + Prisma ORM + PostgreSQL/PostGIS

## Installation

### 1. Configuration de la Base de Données
Assurez-vous d'avoir PostgreSQL 15+ avec l'extension PostGIS installée.
Créez une base de données et mettez à jour le fichier `.env` dans le dossier `/server`.

### 2. Backend (Server)
```bash
cd server
npm install
# Configurez DATABASE_URL dans .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### 3. Frontend (Client)
```bash
cd frontend
npm install
npm run dev
```

## Fonctionnalités Clés Implémentées
- **Architecture SCD2**: Toutes les tables critiques incluent les colonnes d'audit (date_debut_validite, est_actuel, version, etc.).
- **Traceability Master Page**: Vue complète de l'historique d'une plantation avec graphes IoT et journal d'audit.
- **Design Premium**: Palette de couleurs "Forest Green" et "Harvest Gold" avec effets de flou (Glassmorphism).
- **Cartographie PostGIS**: Intégration Leaflet pour la visualisation des zones et parcelles.
- **Support 11 Pages**: Dashboard, Zones, Plantations, Événements, Traçabilité, IoT, Satellite, Décisions, Protocoles, Finances, Admin.
