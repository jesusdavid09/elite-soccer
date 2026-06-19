import { Router } from 'express';
import * as matchController from '../controllers/matchController';
import { authenticate, isCoach, isCoachOrAdmin } from '../middlewares/auth';

const router = Router();

// ============== MIDDLEWARES ==============
// Todas las rutas requieren autenticación y rol de coach o admin
router.use(authenticate);
router.use(isCoachOrAdmin);

// ============== RUTAS PRINCIPALES ==============

/**
 * @route   GET /coach/matches
 * @desc    Obtener todos los partidos
 * @access  Coach/Admin
 */
router.get('/', matchController.getMatches);

/**
 * @route   POST /coach/matches
 * @desc    Crear un nuevo partido
 * @access  Coach/Admin
 * @body    { opponent, competition, date, time, location, home_team }
 */
router.post('/', matchController.createMatch);

// ============== RUTAS DE ACCIÓN ==============

/**
 * @route   POST /coach/matches/:id
 * @desc    Actualizar un partido existente
 * @access  Coach/Admin (solo creador o admin)
 * @param   {string} id - ID del partido
 * @body    { opponent, competition, date, time, location, home_team, result_home, result_away }
 */
router.post('/:id', matchController.updateMatch);

/**
 * @route   GET /coach/matches/:id/delete
 * @desc    Eliminar un partido
 * @access  Coach/Admin (solo creador o admin)
 * @param   {string} id - ID del partido
 */
router.get('/:id/delete', matchController.deleteMatch);

// ============== RUTAS DE API ==============

/**
 * @route   GET /coach/matches/api/:id
 * @desc    Obtener un partido por ID (formato JSON)
 * @access  Coach/Admin
 * @param   {string} id - ID del partido
 */
router.get('/api/:id', matchController.getMatchById);

/**
 * @route   GET /coach/matches/upcoming
 * @desc    Obtener partidos próximos
 * @access  Coach/Admin
 */
router.get('/upcoming', matchController.getUpcomingMatches);

/**
 * @route   GET /coach/matches/past
 * @desc    Obtener partidos pasados
 * @access  Coach/Admin
 */
router.get('/past', matchController.getPastMatches);

/**
 * @route   POST /coach/matches/:id/result
 * @desc    Actualizar resultado de un partido
 * @access  Coach/Admin
 * @param   {string} id - ID del partido
 * @body    { result_home, result_away }
 */
router.post('/:id/result', matchController.updateMatchResult);

/**
 * @route   POST /coach/matches/:id/cancel
 * @desc    Cancelar un partido
 * @access  Coach/Admin (solo creador o admin)
 * @param   {string} id - ID del partido
 */
router.post('/:id/cancel', matchController.cancelMatch);

/**
 * @route   GET /coach/matches/date-range
 * @desc    Obtener partidos por rango de fechas
 * @access  Coach/Admin
 * @query   { startDate, endDate }
 */
router.get('/date-range', matchController.getMatchesByDateRange);

/**
 * @route   GET /coach/matches/statistics
 * @desc    Obtener estadísticas de partidos
 * @access  Coach/Admin
 */
router.get('/statistics', matchController.getMatchStatistics);

// ============== RUTAS PARA JUGADORES (LECTURA) ==============

/**
 * @route   GET /api/matches/upcoming
 * @desc    Obtener partidos próximos (API pública para jugadores)
 * @access  Autenticado
 */
router.get('/api/upcoming', authenticate, matchController.getUpcomingMatches);

/**
 * @route   GET /api/matches/:id
 * @desc    Obtener detalles de un partido (API pública para jugadores)
 * @access  Autenticado
 * @param   {string} id - ID del partido
 */
router.get('/api/:id', authenticate, matchController.getMatchById);

export default router;