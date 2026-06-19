import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import webpush from 'web-push';
import authRoutes from './routes/authRoutes';
import playerRoutes from './routes/playerRoutes';
import trainingRoutes from './routes/trainingRoutes';
import matchRoutes from './routes/matchRoutes';
import announcementRoutes from './routes/announcementRoutes';
import { getCoachDashboard, getPlayerDashboard } from './controllers/dashboardController';
import { authenticate } from './middlewares/auth';
import { upload } from './middlewares/upload';
import pool from './config/database';

dotenv.config();

// Configurar VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Notificaciones push configuradas');
} else {
    console.log('⚠️ VAPID keys no configuradas');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ============== RUTA RAÍZ ==============
app.get('/', (req, res) => {
    res.render('index', { title: 'Elite Soccer Academy' });
});

// ============== RUTAS PÚBLICAS ==============
app.use('/', authRoutes);

// ============== MIDDLEWARE PARA PENDING COUNT ==============
app.use('/coach', authenticate, async (req: any, res: any, next: any) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM players WHERE status = $1',
            ['pending']
        );
        res.locals.pendingCount = parseInt(result.rows[0]?.count || '0');
        console.log(`📊 Jugadores pendientes: ${res.locals.pendingCount}`);
    } catch (error) {
        console.error('❌ Error al contar pendientes:', error);
        res.locals.pendingCount = 0;
    }
    next();
});

// ============== NOTIFICACIONES PUSH ==============
app.post('/api/notifications/subscribe', authenticate, async (req: any, res: any) => {
    const subscription = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    try {
        await pool.query(
            `INSERT INTO push_subscriptions (user_id, subscription) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id) DO UPDATE SET subscription = $2`,
            [userId, JSON.stringify(subscription)]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al guardar suscripción:', error);
        res.status(500).json({ error: 'Error al guardar suscripción' });
    }
});

// ============== RUTAS PROTEGIDAS ==============
app.get('/coach/dashboard', authenticate, getCoachDashboard);
app.use('/coach/players', playerRoutes);
app.use('/coach/trainings', trainingRoutes);
app.use('/coach/matches', matchRoutes);
app.use('/coach/announcements', announcementRoutes);
app.get('/player/dashboard', authenticate, getPlayerDashboard);

// ============== APROBAR JUGADORES ==============
app.get('/coach/approve-players', authenticate, async (req: any, res: any) => {
    try {
        console.log('📋 Cargando página de aprobar jugadores...');
        const result = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                p.jersey_number,
                p.position,
                p.phone,
                p.age,
                p.status,
                p.created_at,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);
        console.log(`✅ ${result.rows.length} jugadores encontrados`);
        if (result.rows.length > 0) {
            console.log('📊 Primer jugador:', {
                id: result.rows[0].id,
                name: result.rows[0].full_name,
                status: result.rows[0].status
            });
        }
        
        res.render('coach/approve-players', {
            title: 'Aprobar Jugadores',
            pendingPlayers: result.rows,
            user: req.user,
            pendingCount: res.locals.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al cargar jugadores:', error);
        res.render('coach/approve-players', {
            title: 'Aprobar Jugadores',
            pendingPlayers: [],
            user: req.user,
            pendingCount: 0
        });
    }
});

// Aprobar jugador
app.post('/coach/players/:id/approve', authenticate, async (req: any, res: any) => {
    console.log('📝 Endpoint approve llamado');
    console.log('📝 ID del jugador:', req.params.id);
    
    try {
        const id = req.params.id;
        
        // Verificar que el jugador existe
        const checkResult = await pool.query(
            'SELECT id, status FROM players WHERE id = $1',
            [id]
        );
        console.log('📊 Jugador encontrado:', checkResult.rows[0]);
        
        if (checkResult.rows.length === 0) {
            console.log('❌ Jugador no encontrado');
            return res.status(404).json({ 
                success: false, 
                message: 'Jugador no encontrado' 
            });
        }
        
        // Actualizar estado
        const result = await pool.query(
            'UPDATE players SET status = $1 WHERE id = $2 RETURNING *',
            ['approved', id]
        );
        console.log('✅ Jugador aprobado:', result.rows[0]);
        
        res.json({ 
            success: true, 
            message: 'Jugador aprobado correctamente',
            player: result.rows[0]
        });
    } catch (error: any) {
        console.error('❌ Error al aprobar:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Rechazar jugador
app.post('/coach/players/:id/reject', authenticate, async (req: any, res: any) => {
    console.log('📝 Endpoint reject llamado');
    console.log('📝 ID del jugador:', req.params.id);
    
    try {
        const id = req.params.id;
        
        // Verificar que el jugador existe
        const checkResult = await pool.query(
            'SELECT id, status FROM players WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Jugador no encontrado' 
            });
        }
        
        const result = await pool.query(
            'UPDATE players SET status = $1 WHERE id = $2 RETURNING *',
            ['rejected', id]
        );
        console.log('✅ Jugador rechazado:', result.rows[0]);
        
        res.json({ 
            success: true, 
            message: 'Jugador rechazado',
            player: result.rows[0]
        });
    } catch (error: any) {
        console.error('❌ Error al rechazar:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Revertir estado a pendiente
app.post('/coach/players/:id/reset', authenticate, async (req: any, res: any) => {
    console.log('📝 Endpoint reset llamado');
    console.log('📝 ID del jugador:', req.params.id);
    
    try {
        const id = req.params.id;
        
        // Verificar que el jugador existe
        const checkResult = await pool.query(
            'SELECT id, status FROM players WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Jugador no encontrado' 
            });
        }
        
        const result = await pool.query(
            'UPDATE players SET status = $1 WHERE id = $2 RETURNING *',
            ['pending', id]
        );
        console.log('✅ Estado revertido:', result.rows[0]);
        
        res.json({ 
            success: true, 
            message: 'Estado revertido a pendiente',
            player: result.rows[0]
        });
    } catch (error: any) {
        console.error('❌ Error al revertir:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Obtener jugador por ID (para el modal)
app.get('/coach/players/api/:id', authenticate, async (req: any, res: any) => {
    console.log('📝 Endpoint api/:id llamado');
    console.log('📝 ID del jugador:', req.params.id);
    
    try {
        const id = req.params.id;
        const result = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                p.jersey_number,
                p.position,
                p.phone,
                p.age,
                p.status,
                p.created_at,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        console.log('✅ Jugador encontrado:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error: any) {
        console.error('❌ Error al obtener jugador:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============== PERFIL JUGADOR ==============
app.get('/player/profile', authenticate, async (req: any, res: any) => {
    try {
        const player = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE u.id = $1
        `, [req.user.id]);
        res.render('player/edit-profile', { 
            title: 'Mi Perfil', 
            player: player.rows[0] || null, 
            user: req.user 
        });
    } catch (error) {
        console.error('❌ Error al cargar perfil:', error);
        res.redirect('/player/dashboard');
    }
});

app.post('/player/profile/upload-photo', authenticate, upload.single('photo'), async (req: any, res: any) => {
    if (req.file) {
        const photoUrl = `/uploads/players/${req.file.filename}`;
        await pool.query('UPDATE players SET photo_url = $1 WHERE user_id = $2', [photoUrl, req.user.id]);
        console.log('✅ Foto actualizada:', photoUrl);
    }
    res.redirect('/player/profile');
});

// ============== CONFIRMAR ASISTENCIA ==============
app.get('/player/attendance', authenticate, async (req: any, res: any) => {
    try {
        const trainings = await pool.query(`SELECT * FROM trainings WHERE date >= CURRENT_DATE ORDER BY date ASC`);
        const matches = await pool.query(`SELECT * FROM matches WHERE date >= CURRENT_DATE ORDER BY date ASC`);
        res.render('player/confirm-attendance', {
            title: 'Confirmar Asistencia',
            upcomingTrainings: trainings.rows,
            upcomingMatches: matches.rows,
            user: req.user
        });
    } catch (error) {
        console.error('❌ Error al cargar asistencia:', error);
        res.render('player/confirm-attendance', { 
            title: 'Confirmar Asistencia', 
            upcomingTrainings: [], 
            upcomingMatches: [], 
            user: req.user 
        });
    }
});

app.post('/player/attendance/confirm', authenticate, async (req: any, res: any) => {
    const { type, id, status, justification } = req.body;
    console.log('📝 Confirmando asistencia:', { type, id, status });
    
    try {
        const player = await pool.query('SELECT id FROM players WHERE user_id = $1', [req.user.id]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        
        const table = type === 'training' ? 'training_attendance' : 'match_attendance';
        const idField = type === 'training' ? 'training_id' : 'match_id';
        
        await pool.query(
            `INSERT INTO ${table} (player_id, ${idField}, status, justification) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (player_id, ${idField}) 
             DO UPDATE SET status = $3, justification = $4`,
            [player.rows[0].id, id, status, justification || null]
        );
        console.log('✅ Asistencia confirmada');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error al confirmar asistencia:', error);
        res.status(500).json({ error: 'Error al confirmar asistencia' });
    }
});

// ============== ASISTENCIA (ENTRENADOR) ==============
app.get('/coach/attendance', authenticate, async (req: any, res: any) => {
    try {
        const trainings = await pool.query(`SELECT id, title, date FROM trainings ORDER BY date DESC LIMIT 10`);
        const matches = await pool.query(`SELECT id, opponent, date FROM matches ORDER BY date DESC LIMIT 10`);
        res.render('coach/attendance', {
            title: 'Asistencia',
            trainings: trainings.rows,
            matches: matches.rows,
            user: req.user
        });
    } catch (error) {
        console.error('❌ Error al cargar asistencia del entrenador:', error);
        res.render('coach/attendance', { 
            title: 'Asistencia', 
            trainings: [], 
            matches: [], 
            user: req.user 
        });
    }
});

app.get('/coach/attendance/list', authenticate, async (req: any, res: any) => {
    const { type, id } = req.query;
    console.log('📝 Listando asistencias:', { type, id });
    
    try {
        const table = type === 'training' ? 'training_attendance' : 'match_attendance';
        const idField = type === 'training' ? 'training_id' : 'match_id';
        const result = await pool.query(
            `SELECT a.*, p.jersey_number, u.full_name as player_name FROM ${table} a
             JOIN players p ON a.player_id = p.id
             JOIN users u ON p.user_id = u.id
             WHERE a.${idField} = $1`,
            [id]
        );
        console.log(`✅ ${result.rows.length} asistencias encontradas`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al listar asistencias:', error);
        res.status(500).json({ error: 'Error al listar asistencias' });
    }
});

// ============== ANUNCIOS JUGADOR ==============
app.get('/player/announcements', authenticate, async (req: any, res: any) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.full_name as author_name FROM announcements a
            JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC
        `);
        res.render('player/announcements', { 
            title: 'Anuncios', 
            announcements: result.rows, 
            user: req.user 
        });
    } catch (error) {
        console.error('❌ Error al cargar anuncios:', error);
        res.render('player/announcements', { 
            title: 'Anuncios', 
            announcements: [], 
            user: req.user 
        });
    }
});

// ============== ERROR 404 ==============
app.use((req: any, res: any) => {
    console.log(`❌ 404 - Página no encontrada: ${req.url}`);
    res.status(404).render('error', { 
        title: 'Error 404', 
        message: 'Página no encontrada',
        user: req.user 
    });
});

// ============== INICIAR SERVIDOR ==============
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor en http://localhost:${PORT}`);
    console.log(`📝 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Registro: http://localhost:${PORT}/register`);
    console.log(`📋 Aprobar jugadores: http://localhost:${PORT}/coach/approve-players`);
    console.log(`✅ Elite Soccer App lista para usar\n`);
});