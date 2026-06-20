import { Router } from 'express';
import * as playerController from '../controllers/playerController';
import { authenticate, isCoach } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

// ========== MIDDLEWARES ==========
router.use(authenticate);
router.use(isCoach);

// ========== RUTAS PRINCIPALES ==========

// Obtener todos los jugadores
router.get('/', playerController.getPlayers);

// Crear nuevo jugador
router.post('/', playerController.createPlayer);

// Actualizar jugador
router.post('/:id', playerController.updatePlayer);

// Eliminar jugador
router.get('/:id/delete', playerController.deletePlayer);

// Subir foto de jugador
router.post('/:id/photo', upload.single('photo'), playerController.uploadPlayerPhoto);

// ========== RUTAS DE APROBACIÓN ==========

// Usuarios pendientes
router.get('/pending', playerController.getPendingUsers);

// Aprobar usuario
router.get('/pending/:id/approve', playerController.approveUser);

// Rechazar usuario
router.get('/pending/:id/reject', playerController.rejectUser);

// ========== RUTAS DE API ==========

// Obtener jugador por ID
router.get('/api/:id', playerController.getPlayerById);

export default router;