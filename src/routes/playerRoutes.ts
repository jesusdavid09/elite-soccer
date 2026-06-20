import { Router } from 'express';
import * as playerController from '../controllers/playerController';
import { authenticate, isCoachOrAdmin } from '../middlewares/auth';
import { validateUpload, uploadSingle } from '../middlewares/upload';

const router = Router();

// ========================================================
// 🔓 RUTAS ACCESIBLES POR JUGADORES Y CUERPO TÉCNICO
// ========================================================
// Requerimos autenticación general, pero no restringimos rol todavía.
router.use(authenticate);

/**
 * @route   GET /coach/players/api/public/:id
 * @desc    Obtener detalles de un jugador (API pública para la app de jugadores)
 */
router.get('/api/public/:id', playerController.getPlayerById);


// ========================================================
// 🔐 MIDDLEWARE DE CONTROL: SOLO COACH O ADMIN
// ========================================================
// A partir de aquí, el acceso queda restringido únicamente al staff técnico.
router.use(isCoachOrAdmin);


// ========================================================
// 📊 RUTAS ESTÁTICAS, BÚSQUEDAS Y REPORTES (COACH)
// ========================================================
// Ubicadas arriba para que Express las resuelva de inmediato sin confundirse con IDs.

/**
 * @route   GET /coach/players
 * @desc    Obtener todos los jugadores
 */
router.get('/', playerController.getPlayers);

/**
 * @route   GET /coach/players/pending
 * @desc    Obtener usuarios pendientes de aprobación
 */
router.get('/pending', playerController.getPendingUsers);

/**
 * @route   GET /coach/players/statistics
 * @desc    Obtener estadísticas generales de la plantilla
 */
router.get('/statistics', playerController.getPlayerStatistics);

/**
 * @route   GET /coach/players/export
 * @desc    Exportar listado de jugadores
 */
router.get('/export', playerController.getPlayers);

/**
 * @route   GET /coach/players/search
 * @desc    Buscar jugadores por nombre o número de camiseta
 */
router.get('/search', playerController.searchPlayers);

/**
 * @route   GET /coach/players/active
 * @desc    Obtener jugadores con estado activo
 */
router.get('/active', playerController.getActivePlayers);

/**
 * @route   GET /coach/players/inactive
 * @desc    Obtener jugadores con estado inactivo
 */
router.get('/inactive', playerController.getInactivePlayers);

/**
 * @route   POST /coach/players
 * @desc    Crear un nuevo jugador desde el panel
 */
router.post('/', playerController.createPlayer);


// ========================================================
// ⏳ ACCIONES DE APROBACIÓN MASIVA (PENDIENTES)
// ========================================================

/**
 * @route   POST /coach/players/pending/approve-all
 * @desc    Aprobar todos los usuarios en lista de espera
 */
router.post('/pending/approve-all', playerController.approveAllPending);

/**
 * @route   POST /coach/players/pending/reject-all
 * @desc    Rechazar todos los usuarios en lista de espera
 */
router.post('/pending/reject-all', playerController.rejectAllPending);


// ========================================================
// ⚙️ RUTAS CON PARÁMETROS ESPECÍFICOS / API INTERNA
// ========================================================

/**
 * @route   GET /coach/players/api/:id
 * @desc    Obtener un jugador por ID (JSON interno)
 */
router.get('/api/:id', playerController.getPlayerById);

/**
 * @route   GET /coach/players/api/email/:email
 * @desc    Obtener un jugador por su correo electrónico
 */
router.get('/api/email/:email', playerController.getPlayerByEmail);

/**
 * @route   GET /coach/players/position/:position
 * @desc    Filtrar jugadores por su demarcación técnica
 */
router.get('/position/:position', playerController.getPlayersByPosition);


// ========================================================
// 🛠️ RUTAS DINÁMICAS POR ID / ACCIONES DE ESCRITURA
// ========================================================
// Se desplazan al fondo del archivo como comodines seguros.

/**
 * @route   GET /coach/players/pending/:id/approve
 * @desc    Aprobar un usuario individual por ID
 */
router.get('/pending/:id/approve', playerController.approveUser);

/**
 * @route   GET /coach/players/pending/:id/reject
 * @desc    Rechazar un usuario individual por ID
 */
router.get('/pending/:id/reject', playerController.rejectUser);

/**
 * @route   GET /coach/players/:id/delete
 * @desc    Eliminar un jugador de la plantilla
 */
router.get('/:id/delete', playerController.deletePlayer);

/**
 * @route   POST /coach/players/:id/photo
 * @desc    Subir o actualizar foto de perfil del jugador (Multer)
 */
// 🔥 SOLUCIÓN: Movido antes de /:id para que la subida multimedia no falle
router.post(
    '/:id/photo', 
    uploadSingle('photo'),
    validateUpload,
    playerController.uploadPlayerPhoto
);

/**
 * @route   POST /coach/players/:id
 * @desc    Actualizar datos de un jugador existente
 */
// 🔥 SOLUCIÓN: Al final absoluto para no absorber peticiones como /:id/photo
router.post('/:id', playerController.updatePlayer);

export default router;