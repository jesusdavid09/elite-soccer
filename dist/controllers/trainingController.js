"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTraining = exports.updateTraining = exports.createTraining = exports.getTrainings = void 0;
const database_1 = __importDefault(require("../config/database"));
const getTrainings = async (req, res) => ;
exports.getTrainings = getTrainings;
try {
    const result = await database_1.default.query(` 
            SELECT t.*, u.full_name as created_by_name FROM trainings t 
            LEFT JOIN users u ON t.created_by = u.id ORDER BY t.date DESC 
        `);
    res.render('coach/trainings', { title: 'Entrenamientos', trainings: result.rows, user: req.user });
}
catch (error) {
    res.render('coach/trainings', { title: 'Entrenamientos', trainings: [], user: req.user });
}
;
const createTraining = async (req, res) => ;
exports.createTraining = createTraining;
const { title, description, date, time, location, duration } = req.body;
try {
    await database_1.default.query(`INSERT INTO trainings (title, description, date, time, location, duration, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [title, description, date, time, location, duration, req.user?.id]);
    res.redirect('/coach/trainings');
}
catch (error) {
    res.redirect('/coach/trainings');
}
;
const updateTraining = async (req, res) => ;
exports.updateTraining = updateTraining;
const { id } = req.params;
const { title, description, date, time, location, duration } = req.body;
try {
    await database_1.default.query(`UPDATE trainings SET title = $1, description = $2, date = $3, time = $4, 
             location = $5, duration = $6 WHERE id = $7`, [title, description, date, time, location, duration, id]);
    res.redirect('/coach/trainings');
}
catch (error) {
    res.redirect('/coach/trainings');
}
;
const deleteTraining = async (req, res) => ;
exports.deleteTraining = deleteTraining;
const { id } = req.params;
try {
    await database_1.default.query('DELETE FROM trainings WHERE id = $1', [id]);
    res.redirect('/coach/trainings');
}
catch (error) {
    res.redirect('/coach/trainings');
}
;
