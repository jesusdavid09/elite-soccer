"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMatch = exports.updateMatch = exports.createMatch = exports.getMatches = void 0;
const database_1 = __importDefault(require("../config/database"));
const getMatches = async (req, res) => ;
exports.getMatches = getMatches;
try {
    const result = await database_1.default.query(` 
            SELECT m.*, u.full_name as created_by_name FROM matches m 
            LEFT JOIN users u ON m.created_by = u.id ORDER BY m.date DESC 
        `);
    res.render('coach/matches', { title: 'Partidos', matches: result.rows, user: req.user });
}
catch (error) {
    res.render('coach/matches', { title: 'Partidos', matches: [], user: req.user });
}
;
const createMatch = async (req, res) => ;
exports.createMatch = createMatch;
const { opponent, competition, date, time, location, home_team } = req.body;
try {
    await database_1.default.query(`INSERT INTO matches (opponent, competition, date, time, location, home_team, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [opponent, competition, date, time, location, home_team === 'on', req.user?.id]);
    res.redirect('/coach/matches');
}
catch (error) {
    res.redirect('/coach/matches');
}
;
const updateMatch = async (req, res) => ;
exports.updateMatch = updateMatch;
const { id } = req.params;
const { opponent, competition, date, time, location, home_team, result_home, result_away } = req.body;
try {
    await database_1.default.query(`UPDATE matches SET opponent = $1, competition = $2, date = $3, time = $4, 
             location = $5, home_team = $6, result_home = $7, result_away = $8 WHERE id = $9`);
    res.redirect('/coach/matches');
}
catch (error) {
    res.redirect('/coach/matches');
}
;
const deleteMatch = async (req, res) => ;
exports.deleteMatch = deleteMatch;
const { id } = req.params;
try {
    await database_1.default.query('DELETE FROM matches WHERE id = $1', [id]);
    res.redirect('/coach/matches');
}
catch (error) {
    res.redirect('/coach/matches');
}
;
