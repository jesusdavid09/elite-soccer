"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const playerRoutes_1 = __importDefault(require("./routes/playerRoutes"));
const trainingRoutes_1 = __importDefault(require("./routes/trainingRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const announcementRoutes_1 = __importDefault(require("./routes/announcementRoutes"));
const dashboardController_1 = require("./controllers/dashboardController");
const auth_1 = require("./middlewares/auth");
const upload_1 = require("./middlewares/upload");
const database_1 = __importDefault(require("./config/database"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
app.set('view engine', 'ejs');
app.set('views', path_1.default.join(__dirname, '../views'));
app.get('/', (req, res) =
    res.render('index', { title: 'Elite Soccer Academy' }));
;
app.use('/', authRoutes_1.default);
app.get('/coach/dashboard', auth_1.authenticate, dashboardController_1.getCoachDashboard);
app.use('/coach/players', playerRoutes_1.default);
app.use('/coach/trainings', trainingRoutes_1.default);
app.use('/coach/matches', matchRoutes_1.default);
app.use('/coach/announcements', announcementRoutes_1.default);
app.get('/player/dashboard', auth_1.authenticate, dashboardController_1.getPlayerDashboard);
app.get('/player/profile', auth_1.authenticate, async (req, res) => );
try {
    const player = await database_1.default.query(` 
            SELECT p.*, u.full_name, u.email FROM players p 
            JOIN users u ON p.user_id = u.id WHERE u.id = $1 
        `, [req.user.id]);
}
catch (error) {
    res.redirect('/player/dashboard');
}
;
app.post('/player/profile/upload-photo', auth_1.authenticate, upload_1.upload.single('photo'), async (req, res) => );
if (req.file) {
    const photoUrl = `/uploads/players/${req.file.filename}`;
    await database_1.default.query('UPDATE players SET photo_url = $1 WHERE user_id = $2', [photoUrl, req.user.id]);
}
res.redirect('/player/profile');
;
app.get('/player/attendance', auth_1.authenticate, async (req, res) => );
try {
    const trainings = await database_1.default.query(`SELECT * FROM trainings WHERE date  ORDER BY date ASC`);
    const matches = await database_1.default.query(`SELECT * FROM matches WHERE date  ORDER BY date ASC`);
    res.render('player/confirm-attendance', {
        title: 'Confirmar Asistencia',
        upcomingTrainings: trainings.rows,
        upcomingMatches: matches.rows,
        user: req.user
    });
}
catch (error) {
    res.render('player/confirm-attendance', { title: 'Confirmar Asistencia', upcomingTrainings: [], upcomingMatches: [], user: req.user });
}
;
app.post('/player/attendance/confirm', auth_1.authenticate, async (req, res) => );
const { type, id, status, justification } = req.body;
const player = await database_1.default.query('SELECT id FROM players WHERE user_id = $1', [req.user.id]);
if (player.rows.length === 0)
    return res.status(404).json({ error: 'Jugador no encontrado' });
const table = type === 'training' ? 'training_attendance' : 'match_attendance';
const idField = type === 'training' ? 'training_id' : 'match_id';
await database_1.default.query(`INSERT INTO ${table} (player_id, ${idField}, status, justification) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (player_id, ${idField}) 
         DO UPDATE SET status = $3, justification = $4`);
res.json({ success: true });
;
app.get('/player/announcements', auth_1.authenticate, async (req, res) => );
try {
    const result = await database_1.default.query(` 
            SELECT a.*, u.full_name as author_name FROM announcements a 
            JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC 
        `);
    res.render('player/announcements', { title: 'Anuncios', announcements: result.rows, user: req.user });
}
catch (error) {
    res.render('player/announcements', { title: 'Anuncios', announcements: [], user: req.user });
}
;
app.use((req, res) =
    res.status(404).render('error', { title: 'Error 404', message: 'Página no encontrada', user: req.user }));
;
app.listen(PORT, () =
    console.log(`🚀 Servidor en http://localhost:${PORT}`));
console.log(`📝 Login: http://localhost:${PORT}/login`);
console.log(`📝 Registro: http://localhost:${PORT}/register`);
;
