import { Router } from 'express';
import * as trainingController from '../controllers/trainingController';
import { authenticate, isCoach, isCoachOrAdmin } from '../middlewares/auth';

const router = Router();

// ============== MIDDLEWARES ==============
// Todas las rutas requieren autenticación y rol de coach o admin
router.use(authenticate);
router.use(isCoachOrAdmin);

// ============== RUTAS PRINCIPALES ==============

/**
 * @route   GET /coach/trainings
 * @desc    Obtener todos los entrenamientos
 * @access  Coach/Admin
 */
router.get('/', trainingController.getTrainings);

/**
 * @route   POST /coach/trainings
 * @desc    Crear un nuevo entrenamiento
 * @access  Coach/Admin
 * @body    { title, description, date, time, location, duration }
 */
router.post('/', trainingController.createTraining);

// ============== RUTAS DE ACCIÓN ==============

/**
 * @route   POST /coach/trainings/:id
 * @desc    Actualizar un entrenamiento existente
 * @access  Coach/Admin (solo creador o admin)
 * @param   {string} id - ID del entrenamiento
 * @body    { title, description, date, time, location, duration }
 */
router.post('/:id', trainingController.updateTraining);

/**
 * @route   GET /coach/trainings/:id/delete
 * @desc    Eliminar un entrenamiento
 * @access  Coach/Admin (solo creador o admin)
 * @param   {string} id - ID del entrenamiento
 */
router.get('/:id/delete', trainingController.deleteTraining);

// ============== RUTAS DE API ==============

/**
 * @route   GET /coach/trainings/api/:id
 * @desc    Obtener un entrenamiento por ID (formato JSON)
 * @access  Coach/Admin
 * @param   {string} id - ID del entrenamiento
 */
router.get('/api/:id', trainingController.getTrainingById);

/**
 * @route   GET /coach/trainings/upcoming
 * @desc    Obtener entrenamientos próximos
 * @access  Coach/Admin
 */
router.get('/upcoming', trainingController.getUpcomingTrainings);

/**
 * @route   GET /coach/trainings/past
 * @desc    Obtener entrenamientos pasados
 * @access  Coach/Admin
 */
router.get('/past', trainingController.getPastTrainings);

/**
 * @route   POST /coach/trainings/:id/cancel
 * @desc    Cancelar un entrenamiento
 * @access  Coach/Admin (solo creador o admin)
 * @param   {string} id - ID del entrenamiento
 */
router.post('/:id/cancel', trainingController.cancelTraining);

/**
 * @route   GET /coach/trainings/date-range
 * @desc    Obtener entrenamientos por rango de fechas
 * @access  Coach/Admin
 * @query   { startDate, endDate }
 */
router.get('/date-range', trainingController.getTrainingsByDateRange);

/**
 * @route   GET /coach/trainings/statistics
 * @desc    Obtener estadísticas de entrenamientos
 * @access  Coach/Admin
 */
router.get('/statistics', trainingController.getTrainingStatistics);

/**
 * @route   GET /coach/trainings/:id/attendance
 * @desc    Obtener asistencias de un entrenamiento
 * @access  Coach/Admin
 * @param   {string} id - ID del entrenamiento
 */
router.get('/:id/attendance', trainingController.getTrainingAttendance);

/**
 * @route   POST /coach/trainings/:id/attendance
 * @desc    Registrar asistencia a un entrenamiento
 * @access  Coach/Admin
 * @param   {string} id - ID del entrenamiento
 * @body    { player_id, status }
 */
router.post('/:id/attendance', trainingController.registerAttendance);

// ============== RUTAS PARA JUGADORES (LECTURA) ==============

/**
 * @route   GET /api/trainings/upcoming
 * @desc    Obtener entrenamientos próximos (API pública para jugadores)
 * @access  Autenticado
 */
router.get('/api/upcoming', authenticate, trainingController.getUpcomingTrainings);

/**
 * @route   GET /api/trainings/:id
 * @desc    Obtener detalles de un entrenamiento (API pública para jugadores)
 * @access  Autenticado
 * @param   {string} id - ID del entrenamiento
 */
router.get('/api/:id', authenticate, trainingController.getTrainingById);

export default router;