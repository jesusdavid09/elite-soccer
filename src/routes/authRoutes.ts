import { Router } from 'express';
// IMPORTANTE: Importación nombrada exacta de tus controladores
import { 
    showLogin, 
    showRegister, 
    login, 
    register, 
    logout, 
    checkAuth, 
    getProfile 
} from '../controllers/authController'; // Ajusta la ruta a tu carpeta de controladores

const router = Router();

// Rutas de Renderizado de Vistas (GET)
router.get('/login', showLogin);
router.get('/register', showRegister);

// Rutas de Procesamiento de Formularios (POST)
router.post('/login', login);
router.post('/register', register);

// Ruta de Cierre de Sesión (GET o POST, según manejes tu app)
router.get('/logout', logout);

// Rutas de API / Estado
router.get('/check', checkAuth);
router.get('/profile', getProfile);

// EXPORTACIÓN OBLIGATORIA DEL ENRUTADOR
export default router;