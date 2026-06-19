import { Router } from 'express';
import * as playerController from '../controllers/playerController';
import { authenticate, isCoach } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);
router.use(isCoach);

router.get('/', playerController.getPlayers);
router.post('/', playerController.createPlayer);
router.post('/:id', playerController.updatePlayer);
router.get('/:id/delete', playerController.deletePlayer);
router.post('/:id/photo', upload.single('photo'), playerController.uploadPlayerPhoto);
router.get('/pending', playerController.getPendingUsers);
router.get('/pending/:id/approve', playerController.approveUser);
router.get('/pending/:id/reject', playerController.rejectUser);

export default router;