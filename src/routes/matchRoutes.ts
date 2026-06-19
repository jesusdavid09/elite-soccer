import { Router } from 'express';
import * as matchController from '../controllers/matchController';
import { authenticate, isCoach } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(isCoach);

router.get('/', matchController.getMatches);
router.post('/', matchController.createMatch);
router.post('/:id', matchController.updateMatch);
router.get('/:id/delete', matchController.deleteMatch);

export default router;