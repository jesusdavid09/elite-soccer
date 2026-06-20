import { Router } from 'express';
import * as announcementController from '../controllers/announcementController';
import { authenticate, isCoach } from '../middlewares/auth';

const router = Router();

// ========== MIDDLEWARES ==========
router.use(authenticate);
router.use(isCoach);

// ========== RUTAS PRINCIPALES ==========

// Obtener todos los anuncios
router.get('/', announcementController.getAnnouncements);

// Crear nuevo anuncio
router.post('/', announcementController.createAnnouncement);

// Eliminar anuncio
router.get('/:id/delete', announcementController.deleteAnnouncement);

// ========== RUTAS DE API ==========

// Obtener anuncio por ID
router.get('/api/:id', announcementController.getAnnouncementById);

// Actualizar anuncio
router.post('/:id/edit', announcementController.updateAnnouncement);

export default router;