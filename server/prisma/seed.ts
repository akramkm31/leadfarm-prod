import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create User
  const user = await prisma.utilisateur.upsert({
    where: { email: 'imad@leadfarm.dz' },
    update: {},
    create: {
      email: 'imad@leadfarm.dz',
      nomComplet: 'Imad Agronome',
      passwordHash,
      role: 'AGRONOME',
      telephone: '+213 555 12 34 56',
    },
  });

  // 2. Create Zone
  const zone = await prisma.zone.create({
    data: {
      nom: 'Sefyoun',
      surfaceHectares: 45.0,
    },
  });

  // 3. Create Parcelle
  const parcelle = await prisma.parcelle.create({
    data: {
      zoneId: zone.id,
      nom: 'Parcelle A3',
      superficieHectares: 8.2,
      typeSol: 'Argilo-calcaire',
    },
  });

  // 4. Create Micro-Zone
  const microZone = await prisma.microZone.create({
    data: {
      parcelleId: parcelle.id,
      humiditePourcentage: 62.0,
      stressHydrique: 0.3,
      conductiviteElectrique: 1.4,
    },
  });

  // 5. Create Campagne
  const campagne = await prisma.campagne.create({
    data: {
      zoneId: zone.id,
      nom: 'Campagne 2025-2026',
      statut: 'EN_COURS',
      dateDebut: new Date('2025-01-01'),
    },
  });

  // 6. Create Plantation
  const plantation = await prisma.plantation.create({
    data: {
      microZoneId: microZone.id,
      campagneId: campagne.id,
      typeCulture: 'Pommier',
      varieteCulture: 'Golden Delicious',
      nombrePlants: 340,
      datePlantation: new Date('2024-11-15'),
      estActuel: true,
      version: 1,
      actionHistorique: 'INSERT',
    },
  });

  console.log({ user, zone, plantation });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
