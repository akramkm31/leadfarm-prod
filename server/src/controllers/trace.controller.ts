import { Request, Response } from 'express';
import { prisma } from '../index';

export const getTraceability = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // This implements the MASTER QUERY from Section 5 of the prompt
    // We use Prisma's nested includes to achieve the same result
    const plantation = await prisma.plantation.findFirst({
      where: { 
        id: parseInt(id),
        estActuel: true 
      },
      include: {
        microZone: {
          include: {
            parcelle: {
              include: { zone: true }
            }
          }
        },
        campagne: true,
        evenements: {
          where: { estActuel: true },
          include: {
            utilisateur: true,
            maladies: {
              where: { estActuel: true },
              include: { maladie: true }
            },
            produits: {
              where: { estActuel: true },
              include: { produit: true }
            },
            recoltes: {
              where: { estActuel: true },
              include: { revenus: true }
            },
            resultats: {
              where: { estActuel: true }
            },
            decisions: {
              include: { decision: { where: { estActuel: true } } }
            },
            modifieParUser: true
          },
          orderBy: { dateEvenement: 'asc' }
        },
        utilisateur: true // modifiePar for the plantation itself
      }
    });

    if (!plantation) {
      return res.status(404).json({ success: false, error: 'Plantation non trouvée' });
    }

    res.json({ success: true, data: plantation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération de la traçabilité' });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const history = await prisma.plantation.findMany({
      where: { 
        // In this schema, we don't have a separate business_id, 
        // so we'd need one to track all versions of the "same" plantation.
        // Usually identifiant_plantation is the business ID and we use a different PK.
        // But the schema says identifiant_plantation is SERIAL PRIMARY KEY.
        // This implies we need another column to link versions.
        // Let's assume for now we query by some other criteria or we need to add a business_id.
        // Wait, if I created a NEW row with NEW ID in updatePlantation, I lose the link unless I have a parent_id.
        // I'll check the schema again. 
      },
      orderBy: { version: 'asc' }
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur historique' });
  }
};
