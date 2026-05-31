import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import * as geo from '../controllers/geo.controller';
import * as plantation from '../controllers/plantation.controller';
import * as trace from '../controllers/trace.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Auth
router.post('/auth/login', auth.login);
router.post('/auth/register', auth.register);

// Geo
router.get('/zones', authMiddleware, geo.getZones);
router.post('/zones', authMiddleware, geo.createZone);
router.get('/zones/:zoneId/parcelles', authMiddleware, geo.getParcelles);

// Plantations
router.get('/plantations', authMiddleware, plantation.getPlantations);
router.post('/plantations', authMiddleware, plantation.createPlantation);
router.put('/plantations/:id', authMiddleware, plantation.updatePlantation);

// Traceability
router.get('/trace/:id', authMiddleware, trace.getTraceability);
router.get('/trace/:id/historique', authMiddleware, trace.getHistory);

export default router;
