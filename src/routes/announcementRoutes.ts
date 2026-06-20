import { Router } from 'express';
import * as announcementController from '../controllers/announcementController';
import { authenticate, isCoachOrAdmin } from '../middlewares/auth';

const router = Router();

// ============== MIDDLEWARES GLOBAL DE RUTA ==============
// Todas las rutas mapeadas en este archivo pasan primero por aquí
router.use(authenticate);
router.use(isCoachOrAdmin);

// ============== RUTAS ESTÁTICAS / GENERALES ==============

/**
 * @route   GET /coach/announcements
 * @desc    Obtener todos los anuncios
 * @access  Coach/Admin
 */
router.get('/', announcementController.getAnnouncements);

/**
 * @route   GET /coach/announcements/featured
 * @desc    Obtener anuncios destacados
 * @access  Coach/Admin
 */
// 🔥 SOLUCIÓN: Movido arriba para evitar colisiones semánticas con parámetros dinámicos
router.get('/featured', announcementController.getFeaturedAnnouncements);

/**
 * @route   POST /coach/announcements
 * @desc    Crear un nuevo anuncio
 * @access  Coach/Admin
 * @body    { title, content }
 */
router.post('/', announcementController.createAnnouncement);


// ============== RUTAS DE API (JSON) ==============

/**
 * @route   GET /coach/announcements/api/:id
 * @desc    Obtener un anuncio por ID (formato JSON)
 * @access  Coach/Admin
 * @param   {string} id - ID del anuncio
 */
router.get('/api/:id', announcementController.getAnnouncementById);


// ============== RUTAS DINÁMICAS POR ID (ACCIONES) ==============

/**
 * @route   GET /coach/announcements/:id/delete
 * @desc    Eliminar un anuncio por ID
 * @access  Coach/Admin (solo autor o admin)
 * @param   {string} id - ID del anuncio
 */
router.get('/:id/delete', announcementController.deleteAnnouncement);

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

export default router;