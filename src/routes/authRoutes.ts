import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// ========================================================
// ============== RUTAS DE VISTAS (PÚBLICAS) ==============
// ========================================================

/**
 * @route   GET /login
 * @desc    Mostrar página de inicio de sesión
 */
router.get('/login', authController.showLogin);

/**
 * @route   GET /register
 * @desc    Mostrar página de registro
 */
router.get('/register', authController.showRegister);

/**
 * @route   POST /login
 * @desc    Procesar inicio de sesión
 * @body    { email, password, remember }
 */
router.post('/login', authController.login);

/**
 * @route   POST /register
 * @desc    Procesar registro de nuevo usuario
 * @body    { email, password, full_name, role, ... }
 */
router.post('/register', authController.register);

/**
 * @route   GET /logout
 * @desc    Cerrar sesión (Limpia cookies y sesión)
 * @access  Privado (Protegido)
 */
// 🔥 CORRECCIÓN: Se añade el middleware 'authenticate' para evitar que se intente desloguear un string vacío o un token inexistente
router.get('/logout', authenticate, authController.logout);


// ========================================================
// ============== RUTAS DE API (PRIVADAS) =================
// ========================================================

/**
 * @route   GET /api/auth/check
 * @desc    Verificar si el usuario está autenticado
 */
router.get('/api/auth/check', authenticate, authController.checkAuth);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 */
router.get('/api/auth/profile', authenticate, authController.getProfile);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token de autenticación
 */
router.post('/api/auth/refresh', authenticate, (authController as any).refreshToken);

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambiar contraseña
 * @body    { current_password, new_password }
 */
router.post('/api/auth/change-password', authenticate, (authController as any).changePassword);


// ========================================================
// ======== RECOVERY & VERIFICACIÓN (PÚBLICAS) ============
// ========================================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar recuperación de contraseña
 * @body    { email }
 */
router.post('/api/auth/forgot-password', (authController as any).forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Restablecer contraseña con token
 * @body    { token, new_password }
 */
router.post('/api/auth/reset-password', (authController as any).resetPassword);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verificar email del usuario
 */
router.get('/api/auth/verify-email/:token', (authController as any).verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Reenviar email de verificación
 * @body    { email }
 */
// 💡 NOTA: Si necesitas que el usuario esté logueado para reenviar el correo, considera añadirle 'authenticate'
router.post('/api/auth/resend-verification', (authController as any).resendVerification);

export default router;