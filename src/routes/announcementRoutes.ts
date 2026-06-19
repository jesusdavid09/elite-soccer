import { Router } from 'express';
import * as announcementController from '../controllers/announcementController';
import { authenticate, isCoach } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(isCoach);

router.get('/', announcementController.getAnnouncements);
router.post('/', announcementController.createAnnouncement);
router.get('/:id/delete', announcementController.deleteAnnouncement);

export default router;