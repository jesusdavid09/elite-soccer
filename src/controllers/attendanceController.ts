import { Request, Response } from 'express';
import pool from '../config/database';

// Confirmar asistencia (jugador)
export const confirmAttendance = async (req: Request, res: Response) => {
    const { type, id, status, justification } = req.body;
    try {
        const player = await pool.query('SELECT id FROM players WHERE user_id = $1', [(req as any).user?.id]);
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
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al confirmar asistencia' });
    }
};

// Obtener asistencias (entrenador)
export const getAttendance = async (req: Request, res: Response) => {
    const { type, id } = req.query;
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
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener asistencias' });
    }
};