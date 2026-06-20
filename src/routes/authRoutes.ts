import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// ========== RUTAS PÚBLICAS ==========

// Mostrar login
router.get('/login', authController.showLogin);

// Mostrar registro
router.get('/register', authController.showRegister);

// Procesar login
router.post('/login', authController.login);

// Procesar registro
router.post('/register', authController.register);

// Cerrar sesión
router.get('/logout', authController.logout);

// ========== RUTAS DE API ==========

// Verificar autenticación
router.get('/api/auth/check', authenticate, authController.checkAuth);

// Obtener perfil
router.get('/api/auth/profile', authenticate, authController.getProfile);

export default router;