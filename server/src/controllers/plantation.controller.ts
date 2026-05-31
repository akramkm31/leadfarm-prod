import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../index';

export const getPlantations = async (req: Request, res: Response) => {
  try {
    const plantations = await prisma.plantation.findMany({
      where: { estActuel: true },
      include: {
        microZone: {
          include: {
            parcelle: {
              include: { zone: true }
            }
          }
        },
        campagne: true
      }
    });
    res.json({ success: true, data: plantations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des plantations' });
  }
};

export const createPlantation = async (req: Request, res: Response) => {
  const data = req.body;
  try {
    const plantation = await prisma.plantation.create({
      data: {
        ...data,
        estActuel: true,
        version: 1,
        actionHistorique: 'INSERT',
      }
    });
    res.json({ success: true, data: plantation });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Erreur lors de la création' });
  }
};

export const updatePlantation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const newData = req.body;
  const userId = (req as any).user?.userId;

  try {
    // 1. Get current record
    const current = await prisma.plantation.findUnique({
      where: { id: parseInt(id) }
    });

    if (!current || !current.estActuel) {
      return res.status(404).json({ success: false, error: 'Enregistrement non trouvé' });
    }

    // 2. Start a transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 3. Deactivate current record
      await tx.plantation.update({
        where: { id: current.id },
        data: {
          estActuel: false,
          dateFinValidite: new Date(),
        }
      });

      // 4. Create new version
      await tx.plantation.create({
        data: {
          ...current,
          id: undefined, // Let it autoincrement if it's a new row, OR if using a business ID, keep that. 
          // Note: In SCD2, the business ID stays the same but the PK changes or we use a composite key.
          // The schema provided uses `identifiant_plantation` as PK. 
          // Usually SCD2 has a business_id and a surrogate_pk. 
          // The provided schema has SERIAL PK. So I'll just create a new row.
          ...newData,
          version: current.version + 1,
          dateDebutValidite: new Date(),
          dateFinValidite: null,
          estActuel: true,
          actionHistorique: 'UPDATE',
          modifiePar: userId,
          dateModification: new Date(),
        }
      });
    });

    res.json({ success: true, message: 'Mise à jour SCD2 effectuée' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour SCD2' });
  }
};
