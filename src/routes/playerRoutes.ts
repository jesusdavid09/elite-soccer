import { Router } from 'express';
import * as playerController from '../controllers/playerController';
import { authenticate, isCoach, isCoachOrAdmin } from '../middlewares/auth';
import { upload, validateUpload, uploadSingle } from '../middlewares/upload';

const router = Router();

// ============== MIDDLEWARES ==============
// Todas las rutas requieren autenticación y rol de coach o admin
router.use(authenticate);
router.use(isCoachOrAdmin);

// ============== RUTAS PRINCIPALES ==============

/**
 * @route   GET /coach/players
 * @desc    Obtener todos los jugadores
 * @access  Coach/Admin
 */
router.get('/', playerController.getPlayers);

/**
 * @route   POST /coach/players
 * @desc    Crear un nuevo jugador
 * @access  Coach/Admin
 * @body    { user_id, jersey_number, position, age, phone, full_name, email }
 */
router.post('/', playerController.createPlayer);

// ============== RUTAS DE ACCIÓN ==============

/**
 * @route   POST /coach/players/:id
 * @desc    Actualizar un jugador existente
 * @access  Coach/Admin
 * @param   {string} id - ID del jugador
 * @body    { jersey_number, position, age, phone }
 */
router.post('/:id', playerController.updatePlayer);

/**
 * @route   GET /coach/players/:id/delete
 * @desc    Eliminar un jugador
 * @access  Coach/Admin
 * @param   {string} id - ID del jugador
 */
router.get('/:id/delete', playerController.deletePlayer);

/**
 * @route   POST /coach/players/:id/photo
 * @desc    Subir foto de perfil del jugador
 * @access  Coach/Admin
 * @param   {string} id - ID del jugador
 * @body    { photo: File }
 */
router.post(
    '/:id/photo', 
    uploadSingle('photo'),
    validateUpload,
    playerController.uploadPlayerPhoto
);

// ============== RUTAS DE APROBACIONES ==============

/**
 * @route   GET /coach/players/pending
 * @desc    Obtener usuarios pendientes de aprobación
 * @access  Coach/Admin
 */
router.get('/pending', playerController.getPendingUsers);

/**
 * @route   GET /coach/players/pending/:id/approve
 * @desc    Aprobar un usuario pendiente
 * @access  Coach/Admin
 * @param   {string} id - ID del usuario
 */
router.get('/pending/:id/approve', playerController.approveUser);

/**
 * @route   GET /coach/players/pending/:id/reject
 * @desc    Rechazar un usuario pendiente
 * @access  Coach/Admin
 * @param   {string} id - ID del usuario
 */
router.get('/pending/:id/reject', playerController.rejectUser);

/**
 * @route   POST /coach/players/pending/approve-all
 * @desc    Aprobar todos los usuarios pendientes
 * @access  Coach/Admin
 */
router.post('/pending/approve-all', playerController.approveAllPending);

/**
 * @route   POST /coach/players/pending/reject-all
 * @desc    Rechazar todos los usuarios pendientes
 * @access  Coach/Admin
 */
router.post('/pending/reject-all', playerController.rejectAllPending);

// ============== RUTAS DE API ==============

/**
 * @route   GET /coach/players/api/:id
 * @desc    Obtener un jugador por ID (formato JSON)
 * @access  Coach/Admin
 * @param   {string} id - ID del jugador
 */
router.get('/api/:id', playerController.getPlayerById);

/**
 * @route   GET /coach/players/api/email/:email
 * @desc    Obtener un jugador por email (formato JSON)
 * @access  Coach/Admin
 * @param   {string} email - Email del jugador
 */
router.get('/api/email/:email', playerController.getPlayerByEmail);

/**
 * @route   GET /coach/players/statistics
 * @desc    Obtener estadísticas de jugadores
 * @access  Coach/Admin
 */
router.get('/statistics', playerController.getPlayerStatistics);

/**
 * @route   GET /coach/players/export
 * @desc    Obtener todos los jugadores
 * @access  Coach/Admin
 */
router.get('/export', playerController.getPlayers);

// ============== RUTAS DE BÚSQUEDA ==============

/**
 * @route   GET /coach/players/search
 * @desc    Buscar jugadores por nombre o número
 * @access  Coach/Admin
 * @query   { q: string }
 */
router.get('/search', playerController.searchPlayers);

/**
 * @route   GET /coach/players/position/:position
 * @desc    Obtener jugadores por posición
 * @access  Coach/Admin
 * @param   {string} position - Posición del jugador
 */
router.get('/position/:position', playerController.getPlayersByPosition);

/**
 * @route   GET /coach/players/active
 * @desc    Obtener jugadores activos
 * @access  Coach/Admin
 */
router.get('/active', playerController.getActivePlayers);

/**
 * @route   GET /coach/players/inactive
 * @desc    Obtener jugadores inactivos
 * @access  Coach/Admin
 */
router.get('/inactive', playerController.getInactivePlayers);

// ============== RUTAS DE API PARA JUGADORES (LECTURA) ==============

/**
 * @route   GET /api/players/:id
 * @desc    Obtener detalles de un jugador (API pública)
 * @access  Autenticado
 * @param   {string} id - ID del jugador
 */
router.get('/api/public/:id', authenticate, playerController.getPlayerById);

export default router;