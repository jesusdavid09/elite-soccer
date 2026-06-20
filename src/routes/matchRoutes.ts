import { Router } from 'express';
import * as matchController from '../controllers/matchController';
import { authenticate, isCoach } from '../middlewares/auth';

const router = Router();

// ========== MIDDLEWARES ==========
router.use(authenticate);
router.use(isCoach);

// ========== RUTAS PRINCIPALES ==========

// Obtener todos los partidos
router.get('/', matchController.getMatches);

// Crear nuevo partido
router.post('/', matchController.createMatch);

// Actualizar partido
router.post('/:id', matchController.updateMatch);

// Eliminar partido
router.get('/:id/delete', matchController.deleteMatch);

// ========== RUTAS DE API ==========

// Obtener partido por ID
router.get('/api/:id', matchController.getMatchById);

export default router;