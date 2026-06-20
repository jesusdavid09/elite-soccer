import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// ========== RUTAS PÚBLICAS ==========
router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

// ========== RUTAS DE API ==========
router.get('/api/auth/check', authenticate, authController.checkAuth);
router.get('/api/auth/profile', authenticate, authController.getProfile);

export default router;