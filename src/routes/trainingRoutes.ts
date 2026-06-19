import { Router } from 'express';
import * as trainingController from '../controllers/trainingController';
import { authenticate, isCoach } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(isCoach);

router.get('/', trainingController.getTrainings);
router.post('/', trainingController.createTraining);
router.post('/:id', trainingController.updateTraining);
router.get('/:id/delete', trainingController.deleteTraining);

export default router;
