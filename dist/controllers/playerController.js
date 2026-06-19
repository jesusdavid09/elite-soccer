"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectUser = exports.approveUser = exports.getPendingUsers = exports.deletePlayer = exports.updatePlayer = exports.createPlayer = exports.getPlayers = void 0;
const database_1 = __importDefault(require("../config/database"));
const getPlayers = async (req, res) => ;
exports.getPlayers = getPlayers;
try {
    const result = await database_1.default.query(` 
            SELECT p.*, u.full_name, u.email FROM players p 
            JOIN users u ON p.user_id = u.id ORDER BY p.jersey_number 
        `);
    res.render('coach/players', { title: 'Jugadores', players: result.rows, user: req.user });
}
catch (error) {
    res.render('coach/players', { title: 'Jugadores', players: [], user: req.user });
}
;
const createPlayer = async (req, res) => ;
exports.createPlayer = createPlayer;
const { user_id, jersey_number, position, age, phone } = req.body;
try {
    const result = await database_1.default.query(`INSERT INTO players (user_id, jersey_number, position, age, phone) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`, [user_id, jersey_number, position, age, phone]);
    if (result.rows[0]) {
        await database_1.default.query(`INSERT INTO statistics (player_id, season) VALUES ($1, '2024')`, [result.rows[0].id]);
    }
    res.redirect('/coach/players');
}
catch (error) {
    res.redirect('/coach/players');
}
;
const updatePlayer = async (req, res) => ;
exports.updatePlayer = updatePlayer;
const { id } = req.params;
const { jersey_number, position, age, phone } = req.body;
try {
    await database_1.default.query(`UPDATE players SET jersey_number = $1, position = $2, age = $3, phone = $4 WHERE id = $5`, [jersey_number, position, age, phone, id]);
    res.redirect('/coach/players');
}
catch (error) {
    res.redirect('/coach/players');
}
;
const deletePlayer = async (req, res) => ;
exports.deletePlayer = deletePlayer;
const { id } = req.params;
try {
    await database_1.default.query('DELETE FROM players WHERE id = $1', [id]);
    res.redirect('/coach/players');
}
catch (error) {
    res.redirect('/coach/players');
}
;
const getPendingUsers = async (req, res) => ;
exports.getPendingUsers = getPendingUsers;
try {
    const result = await database_1.default.query(`SELECT id, email, full_name, created_at FROM users 
             WHERE role = 'player' AND approved = false`);
    res.render('coach/pending', { title: 'Aprobaciones Pendientes', users: result.rows, user: req.user });
}
catch (error) {
    res.render('coach/pending', { title: 'Aprobaciones Pendientes', users: [], user: req.user });
}
;
const approveUser = async (req, res) => ;
exports.approveUser = approveUser;
const { id } = req.params;
try {
    await database_1.default.query('UPDATE users SET approved = true WHERE id = $1', [id]);
    res.redirect('/coach/players/pending');
}
catch (error) {
    res.redirect('/coach/players/pending');
}
;
const rejectUser = async (req, res) => ;
exports.rejectUser = rejectUser;
const { id } = req.params;
try {
    await database_1.default.query('DELETE FROM users WHERE id = $1 AND approved = false', [id]);
    res.redirect('/coach/players/pending');
}
catch (error) {
    res.redirect('/coach/players/pending');
}
;
