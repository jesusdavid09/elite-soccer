import { Router } from 'express';
import * as attendanceController from '../controllers/attendanceController';
import { authenticate, isCoach, isPlayer } from '../middlewares/auth';

const router = Router();

// ========== RUTAS PARA JUGADORES ==========

// Confirmar asistencia (jugador)
router.post('/confirm', authenticate, isPlayer, attendanceController.confirmAttendance);

// ========== RUTAS PARA ENTRENADORES ==========

// Obtener asistencias (entrenador)
router.get('/list', authenticate, isCoach, attendanceController.getAttendance);

export default router;