import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

export default router;