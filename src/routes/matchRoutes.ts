import { Router } from 'express';
import * as matchController from '../controllers/matchController';
import { authenticate, isCoachOrAdmin } from '../middlewares/auth';

const router = Router();

// ========================================================
// 🔓 RUTAS ACCESIBLES POR JUGADORES Y CUERPO TÉCNICO
// ========================================================
// Exigimos autenticación primero, pero NO bloqueamos por rol de coach aún.
router.use(authenticate);

/**
 * @route   GET /coach/matches/api/upcoming
 * @desc    Obtener partidos próximos (API para jugadores)
 */
router.get('/api/upcoming', matchController.getUpcomingMatches);

/**
 * @route   GET /coach/matches/api/:id
 * @desc    Obtener detalles de un partido (API para jugadores)
 */
router.get('/api/:id', matchController.getMatchById);


// ========================================================
// 🔐 MIDDLEWARE DE BLOQUEO: SOLO COACH O ADMIN
// ========================================================
// A partir de este punto, todas las rutas requieren estrictamente permisos de edición/gestión.
router.use(isCoachOrAdmin);


// ========================================================
// ⚽ RUTAS ESTÁTICAS / CONSULTAS (COACH)
// ========================================================
// Siempre deben ir arriba para evitar que Express las confunda con un :id

/**
 * @route   GET /coach/matches
 * @desc    Obtener todos los partidos
 */
router.get('/', matchController.getMatches);

/**
 * @route   GET /coach/matches/upcoming
 * @desc    Obtener partidos próximos
 */
router.get('/upcoming', matchController.getUpcomingMatches);

/**
 * @route   GET /coach/matches/past
 * @desc    Obtener partidos pasados
 */
router.get('/past', matchController.getPastMatches);

/**
 * @route   GET /coach/matches/date-range
 * @desc    Obtener partidos por rango de fechas
 */
router.get('/date-range', matchController.getMatchesByDateRange);

/**
 * @route   GET /coach/matches/statistics
 * @desc    Obtener estadísticas de partidos
 */
router.get('/statistics', matchController.getMatchStatistics);

/**
 * @route   POST /coach/matches
 * @desc    Crear un nuevo partido
 */
router.post('/', matchController.createMatch);


// ========================================================
// ⚙️ RUTAS ESPECÍFICAS DE API INTERNA
// ========================================================

/**
 * @route   GET /coach/matches/api-internal/:id
 * @desc    Obtener un partido por ID en formato JSON (Panel de administración)
 */
// Cambié ligeramente el prefijo a /api-internal/:id para que no choque con la de jugadores de arriba
router.get('/api-internal/:id', matchController.getMatchById);


// ========================================================
// 🛠️ RUTAS DINÁMICAS POR ID / ACCIONES (COACH)
// ========================================================
// Se ubican al final para que actúen como "comodines" limpios.

/**
 * @route   GET /coach/matches/:id/delete
 * @desc    Eliminar un partido
 */
router.get('/:id/delete', matchController.deleteMatch);

/**
 * @route   POST /coach/matches/:id/result
 * @desc    Actualizar resultado de un partido
 */
router.post('/:id/result', matchController.updateMatchResult);

/**
 * @route   POST /coach/matches/:id/cancel
 * @desc    Cancelar un partido
 */
router.post('/:id/cancel', matchController.cancelMatch);

/**
 * @route   POST /coach/matches/:id
 * @desc    Actualizar un partido existente (General)
 */
// 🔥 SOLUCIÓN: Movido al final absoluto. Si estuviera arriba, se comería el /result y el /cancel
router.post('/:id', matchController.updateMatch);

export default router;