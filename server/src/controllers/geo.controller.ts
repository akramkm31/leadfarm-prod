import { Request, Response } from 'express';
import { prisma } from '../index';

export const getZones = async (req: Request, res: Response) => {
  try {
    const zones = await prisma.zone.findMany({
      include: {
        parcelles: true,
      }
    });
    res.json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des zones' });
  }
};

export const createZone = async (req: Request, res: Response) => {
  const { nom, surfaceHectares } = req.body;
  try {
    const zone = await prisma.zone.create({
      data: { nom, surfaceHectares }
    });
    res.json({ success: true, data: zone });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Erreur lors de la création de la zone' });
  }
};

export const getParcelles = async (req: Request, res: Response) => {
  const { zoneId } = req.params;
  try {
    const parcelles = await prisma.parcelle.findMany({
      where: { zoneId: parseInt(zoneId) },
      include: { microZones: true }
    });
    res.json({ success: true, data: parcelles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des parcelles' });
  }
};
