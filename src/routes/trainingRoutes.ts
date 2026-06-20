import { Router } from 'express';
import * as trainingController from '../controllers/trainingController';
import { authenticate, isCoach } from '../middlewares/auth';

const router = Router();

// ========== MIDDLEWARES ==========
router.use(authenticate);
router.use(isCoach);

// ========== RUTAS PRINCIPALES ==========

// Obtener todos los entrenamientos
router.get('/', trainingController.getTrainings);

// Crear nuevo entrenamiento
router.post('/', trainingController.createTraining);

// Actualizar entrenamiento
router.post('/:id', trainingController.updateTraining);

// Eliminar entrenamiento
router.get('/:id/delete', trainingController.deleteTraining);

// ========== RUTAS DE API ==========

// Obtener entrenamiento por ID
router.get('/api/:id', trainingController.getTrainingById);

export default router;