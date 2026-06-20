import { Router } from 'express';
import * as trainingController from '../controllers/trainingController';
import { authenticate, isCoachOrAdmin } from '../middlewares/auth';

const router = Router();

// ========================================================
// 🔓 RUTAS ACCESIBLES POR JUGADORES Y CUERPO TÉCNICO
// ========================================================
// Exigimos autenticación obligatoria, pero permitimos el flujo de lectura.
router.use(authenticate);

/**
 * @route   GET /coach/trainings/api/upcoming
 * @desc    Obtener entrenamientos próximos (API pública para jugadores)
 */
router.get('/api/upcoming', trainingController.getUpcomingTrainings);

/**
 * @route   GET /coach/trainings/api/:id
 * @desc    Obtener detalles de un entrenamiento (API pública para jugadores)
 */
router.get('/api/:id', trainingController.getTrainingById);


// ========================================================
// 🔐 MIDDLEWARE DE CONTROL: SOLO COACH O ADMIN
// ========================================================
// Filtro perimetral estricto para las funciones de gestión y cuerpo técnico.
router.use(isCoachOrAdmin);


// ========================================================
// 📋 RUTAS ESTÁTICAS Y CONSULTAS GENERALES (COACH)
// ========================================================
// Ubicadas en la parte superior para garantizar prioridad absoluta en Express.

/**
 * @route   GET /coach/trainings
 * @desc    Obtener todos los entrenamientos (Vista)
 */
router.get('/', trainingController.getTrainings);

/**
 * @route   GET /coach/trainings/upcoming
 * @desc    Obtener entrenamientos próximos (Staff)
 */
router.get('/upcoming', trainingController.getUpcomingTrainings);

/**
 * @route   GET /coach/trainings/past
 * @desc    Obtener entrenamientos pasados
 */
router.get('/past', trainingController.getPastTrainings);

/**
 * @route   GET /coach/trainings/date-range
 * @desc    Obtener entrenamientos por rango de fechas
 */
router.get('/date-range', trainingController.getTrainingsByDateRange);

/**
 * @route   GET /coach/trainings/statistics
 * @desc    Obtener estadísticas de entrenamientos
 */
router.get('/statistics', trainingController.getTrainingStatistics);

/**
 * @route   POST /coach/trainings
 * @desc    Crear un nuevo entrenamiento
 */
router.post('/', trainingController.createTraining);


// ========================================================
// ⚙️ RUTAS ESPECÍFICAS DE API INTERNA
// ========================================================

/**
 * @route   GET /coach/trainings/api-internal/:id
 * @desc    Obtener un entrenamiento por ID (JSON interno del panel)
 */
// Renombrado sutilmente para evitar colisiones con el segmento superior de lectura de jugadores
router.get('/api-internal/:id', trainingController.getTrainingById);


// ========================================================
// 🛠️ RUTAS DINÁMICAS POR ID / ACCIONES DE ESCRITURA
// ========================================================
// Actúan como comodines al final del archivo, completamente seguros de efectos colaterales.

/**
 * @route   GET /coach/trainings/:id/delete
 * @desc    Eliminar un entrenamiento
 */
router.get('/:id/delete', trainingController.deleteTraining);

/**
 * @route   GET /coach/trainings/:id/attendance
 * @desc    Obtener asistencias de un entrenamiento específico
 */
router.get('/:id/attendance', trainingController.getTrainingAttendance);

/**
 * @route   POST /coach/trainings/:id/attendance
 * @desc    Registrar o actualizar asistencia a un entrenamiento
 */
router.post('/:id/attendance', trainingController.registerAttendance);

/**
 * @route   POST /coach/trainings/:id/cancel
 * @desc    Cancelar un entrenamiento
 */
router.post('/:id/cancel', trainingController.cancelTraining);

/**
 * @route   POST /coach/trainings/:id
 * @desc    Actualizar los datos de un entrenamiento existente
 */
// 🔥 SOLUCIÓN: Movido al final absoluto para que no devore sub-rutas como /attendance o /cancel
router.post('/:id', trainingController.updateTraining);

export default router;