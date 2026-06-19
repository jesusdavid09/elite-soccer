import { Router } from 'express';
import * as announcementController from '../controllers/announcementController';
import { authenticate, isCoach, isCoachOrAdmin } from '../middlewares/auth';

const router = Router();

// ============== MIDDLEWARES ==============
// Todas las rutas requieren autenticación y rol de coach o admin
router.use(authenticate);
router.use(isCoachOrAdmin);

// ============== RUTAS PRINCIPALES ==============
/**
 * @route   GET /coach/announcements
 * @desc    Obtener todos los anuncios
 * @access  Coach/Admin
 */
router.get('/', announcementController.getAnnouncements);

/**
 * @route   POST /coach/announcements
 * @desc    Crear un nuevo anuncio
 * @access  Coach/Admin
 * @body    { title, content }
 */
router.post('/', announcementController.createAnnouncement);

// ============== RUTAS DE ACCIÓN ==============
/**
 * @route   GET /coach/announcements/:id/delete
 * @desc    Eliminar un anuncio por ID
 * @access  Coach/Admin (solo autor o admin)
 * @param   {string} id - ID del anuncio
 */
router.get('/:id/delete', announcementController.deleteAnnouncement);

// ============== RUTAS DE API ==============
/**
 * @route   GET /coach/announcements/api/:id
 * @desc    Obtener un anuncio por ID (formato JSON)
 * @access  Coach/Admin
 * @param   {string} id - ID del anuncio
 */
router.get('/api/:id', announcementController.getAnnouncementById);

/**
 * @route   POST /coach/announcements/:id/edit
 * @desc    Editar un anuncio existente
 * @access  Coach/Admin (solo autor o admin)
 * @param   {string} id - ID del anuncio
 * @body    { title, content }
 */
router.post('/:id/edit', announcementController.updateAnnouncement);

/**
 * @route   POST /coach/announcements/:id/publish
 * @desc    Publicar/Despublicar un anuncio
 * @access  Coach/Admin
 * @param   {string} id - ID del anuncio
 * @body    { published: boolean }
 */
router.post('/:id/publish', announcementController.togglePublish);

// ============== RUTA PARA ANUNCIOS DESTACADOS ==============
/**
 * @route   GET /coach/announcements/featured
 * @desc    Obtener anuncios destacados
 * @access  Coach/Admin
 */
router.get('/featured', announcementController.getFeaturedAnnouncements);

export default router;