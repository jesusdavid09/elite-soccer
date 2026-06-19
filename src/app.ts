import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.get('/', (req, res) => {
    res.render('index', { title: 'Elite Soccer Academy' });
});

app.use('/', authRoutes);

app.get('/coach/dashboard', authenticate, getCoachDashboard);
app.use('/coach/players', playerRoutes);
app.use('/coach/trainings', trainingRoutes);
app.use('/coach/matches', matchRoutes);
app.use('/coach/announcements', announcementRoutes);
app.get('/player/dashboard', authenticate, getPlayerDashboard);

app.get('/player/profile', authenticate, async (req: any, res: any) => {
    try {
        const player = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE u.id = $1
        `, [req.user.id]);
        res.render('player/edit-profile', { title: 'Mi Perfil', player: player.rows[0] || null, user: req.user });
    } catch (error) {
        res.redirect('/player/dashboard');
    }
});

app.post('/player/profile/upload-photo', authenticate, upload.single('photo'), async (req: any, res: any) => {
    if (req.file) {
        const photoUrl = `/uploads/players/${req.file.filename}`;
        await pool.query('UPDATE players SET photo_url = $1 WHERE user_id = $2', [photoUrl, req.user.id]);
    }
    res.redirect('/player/profile');
});

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
        res.render('player/confirm-attendance', { title: 'Confirmar Asistencia', upcomingTrainings: [], upcomingMatches: [], user: req.user });
    }
});

app.post('/player/attendance/confirm', authenticate, async (req: any, res: any) => {
    const { type, id, status, justification } = req.body;
    const player = await pool.query('SELECT id FROM players WHERE user_id = $1', [req.user.id]);
    if (player.rows.length === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    const table = type === 'training' ? 'training_attendance' : 'match_attendance';
    const idField = type === 'training' ? 'training_id' : 'match_id';
    await pool.query(
        `INSERT INTO ${table} (player_id, ${idField}, status, justification) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (player_id, ${idField}) 
         DO UPDATE SET status = $3, justification = $4`,
        [player.rows[0].id, id, status, justification || null]
    );
    res.json({ success: true });
});

app.get('/player/announcements', authenticate, async (req: any, res: any) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.full_name as author_name FROM announcements a
            JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC
        `);
        res.render('player/announcements', { title: 'Anuncios', announcements: result.rows, user: req.user });
    } catch (error) {
        res.render('player/announcements', { title: 'Anuncios', announcements: [], user: req.user });
    }
});

app.use((req: any, res: any) => {
    res.status(404).render('error', { title: 'Error 404', message: 'Página no encontrada', user: req.user });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
    console.log(`📝 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Registro: http://localhost:${PORT}/register`);
});