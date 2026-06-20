import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import webpush from 'web-push';
import flash from 'express-flash';
import session from 'express-session';
import pool from './config/database';
import { authenticate } from './middlewares/auth';

// ============== IMPORTACIÓN DE ENRUTADORES ==============
import authRoutes from './routes/authRoutes';
import playerRoutes from './routes/playerRoutes';
import trainingRoutes from './routes/trainingRoutes';
import matchRoutes from './routes/matchRoutes';
import announcementRoutes from './routes/announcementRoutes';

dotenv.config();

// ============== CONFIGURACIÓN VAPID ==============
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Notificaciones push configuradas');
} else {
    console.log('⚠️ VAPID keys no configuradas en el entorno');
}

// ============== INICIALIZAR APP ==============
const app = express();
const PORT = process.env.PORT || 3000;

// ============== MIDDLEWARES DE PARSEO Y SESIÓN ==============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET || 'elite_soccer_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 Horas
    }
}));

app.use(flash());

// ============== CONFIGURACIÓN DE VISTAS Y ESTÁTICOS ==============
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ============== MIDDLEWARE GLOBAL: CONTADOR JUGADORES PENDIENTES ==============
app.use('/coach', authenticate, async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM players WHERE status = $1',
            ['pending']
        );
        res.locals.pendingCount = parseInt(result.rows[0]?.count || '0', 10);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📊 Dashboard Coach - Jugadores pendientes: ${res.locals.pendingCount}`);
        }
    } catch (error) {
        console.error('❌ Error al contar solicitudes de jugadores pendientes:', error);
        res.locals.pendingCount = 0;
    }
    next();
});

// ============== RUTA RAÍZ ==============
app.get('/', (req, res) => {
    res.render('index', { title: 'Elite Soccer Academy' });
});

// ============== CONFIGURACIÓN DE SUSCRIPCIÓN PUSH ==============
app.post('/api/notifications/subscribe', authenticate, async (req, res) => {
    const subscription = req.body;
    const userId = req.user?.id;
    
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    
    try {
        await pool.query(
            `INSERT INTO push_subscriptions (user_id, subscription) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id) DO UPDATE SET subscription = $2`,
            [userId, JSON.stringify(subscription)]
        );
        return res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al guardar la suscripción push:', error);
        return res.status(500).json({ error: 'Error interno al guardar suscripción' });
    }
});

// ============== ENDPOINTS AUXILIARES DE ASISTENCIA DINÁMICA ==============
// 🔥 SOLUCIÓN: Eliminación de consultas con templates dinámicos inseguros
app.get('/coach/attendance/list', authenticate, async (req, res) => {
    const { type, id } = req.query;
    console.log('📋 Solicitando listado de asistencia:', { type, id });
    
    if (type !== 'training' && type !== 'match') {
        return res.status(400).json({ error: 'Tipo de asistencia inválido' });
    }

    try {
        // Ejecución de sentencias explícitas fijas según el contexto para blindar la base de datos
        const queryTraining = `
            SELECT a.*, p.jersey_number, u.full_name as player_name 
            FROM training_attendance a
            JOIN players p ON a.player_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE a.training_id = $1`;

        const queryMatch = `
            SELECT a.*, p.jersey_number, u.full_name as player_name 
            FROM match_attendance a
            JOIN players p ON a.player_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE a.match_id = $1`;

        const targetQuery = type === 'training' ? queryTraining : queryMatch;
        const result = await pool.query(targetQuery, [id]);
        
        return res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al listar asistencias en lote:', error);
        return res.status(500).json({ error: 'Error del servidor al obtener las asistencias' });
    }
});

// ============== MONTADO DE ENRUTADORES MODULARES ==============
// 🚀 Toda la lógica repetida se delegó limpiamente a sus respectivos archivos de ruta
app.use('/', authRoutes);
app.use('/', playerRoutes);
app.use('/', trainingRoutes);
app.use('/', matchRoutes);
app.use('/', announcementRoutes);

// ============== MANEJO DE ERROR 404 ==============
app.use((req, res) => {
    console.log(`⚠️ Error 404 - Ruta no localizada: ${req.originalUrl}`);
    res.status(404).render('error', { 
        title: 'Error 404', 
        message: 'La página que buscas no existe en el sistema.',
        user: req.user 
    });
});

// ============== INICIAR SERVIDOR ==============
app.listen(PORT, () => {
    console.log(`\n⚽ =================================================== ⚽`);
    console.log(`🚀 Elite Soccer Academy corriendo en http://localhost:${PORT}`);
    console.log(`🔐 Acceso Autenticación: http://localhost:${PORT}/login`);
    console.log(`📋 Gestión de Plantilla: http://localhost:${PORT}/coach/players`);
    console.log(`⚽ =================================================== ⚽\n`);
});