import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// ============== RUTAS DE AUTENTICACIÓN ==============

/**
 * @route   GET /login
 * @desc    Mostrar página de inicio de sesión
 * @access  Público
 */
router.get('/login', authController.showLogin);

/**
 * @route   GET /register
 * @desc    Mostrar página de registro
 * @access  Público
 */
router.get('/register', authController.showRegister);

/**
 * @route   POST /login
 * @desc    Procesar inicio de sesión
 * @access  Público
 * @body    { email, password, remember }
 */
router.post('/login', authController.login);

/**
 * @route   POST /register
 * @desc    Procesar registro de nuevo usuario
 * @access  Público
 * @body    { email, password, full_name, role, ... }
 */
router.post('/register', authController.register);

/**
 * @route   GET /logout
 * @desc    Cerrar sesión
 * @access  Público (requiere autenticación)
 */
router.get('/logout', authController.logout);

// ============== RUTAS DE API (AUTH) ==============

/**
 * @route   GET /api/auth/check
 * @desc    Verificar si el usuario está autenticado
 * @access  Privado
 * @returns { authenticated: boolean, user: object }
 */
router.get('/api/auth/check', authenticate, authController.checkAuth);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Privado
 * @returns { id, email, full_name, role, approved, created_at }
 */
router.get('/api/auth/profile', authenticate, authController.getProfile);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token de autenticación
 * @access  Privado
 * @returns { token: string }
 */
router.post('/api/auth/refresh', authenticate, (authController as any).refreshToken);

/**
 * @route   POST /api/auth/change-password
 * @desc    Cambiar contraseña
 * @access  Privado
 * @body    { current_password, new_password }
 */
router.post('/api/auth/change-password', authenticate, (authController as any).changePassword);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar recuperación de contraseña
 * @access  Público
 * @body    { email }
 */
router.post('/api/auth/forgot-password', (authController as any).forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Restablecer contraseña con token
 * @access  Público
 * @body    { token, new_password }
 */
router.post('/api/auth/reset-password', (authController as any).resetPassword);

// ============== RUTAS DE VERIFICACIÓN DE EMAIL ==============

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verificar email del usuario
 * @access  Público
 * @param   {string} token - Token de verificación
 */
router.get('/api/auth/verify-email/:token', (authController as any).verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Reenviar email de verificación
 * @access  Privado
 * @body    { email }
 */
router.post('/api/auth/resend-verification', (authController as any).resendVerification);

export default router;