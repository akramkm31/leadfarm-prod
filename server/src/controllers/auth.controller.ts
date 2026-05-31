import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.utilisateur.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Identifiants invalides' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          nom: user.nomComplet,
          role: user.role,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { email, password, nomComplet, role, telephone } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.utilisateur.create({
      data: {
        email,
        passwordHash: hashedPassword,
        nomComplet,
        role,
        telephone,
      },
    });

    res.json({ success: true, data: { id: user.id } });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Email déjà utilisé ou données invalides' });
  }
};
