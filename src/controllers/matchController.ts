import { Request, Response } from 'express';
import pool from '../config/database';

// Obtener todos los partidos
export const getMatches = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT m.*, u.full_name as created_by_name FROM matches m
            LEFT JOIN users u ON m.created_by = u.id ORDER BY m.date DESC
        `);
        res.render('coach/matches', { title: 'Partidos', matches: result.rows, user: (req as any).user });
    } catch (error) {
        res.render('coach/matches', { title: 'Partidos', matches: [], user: (req as any).user });
    }
};

// Crear partido
export const createMatch = async (req: Request, res: Response) => {
    const { opponent, competition, date, time, location, home_team } = req.body;
    try {
        await pool.query(
            `INSERT INTO matches (opponent, competition, date, time, location, home_team, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [opponent, competition, date, time, location, home_team === 'on', (req as any).user?.id]
        );
        res.redirect('/coach/matches');
    } catch (error) {
        res.redirect('/coach/matches');
    }
};

// Actualizar partido
export const updateMatch = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { opponent, competition, date, time, location, home_team, result_home, result_away } = req.body;
    try {
        await pool.query(
            `UPDATE matches SET opponent = $1, competition = $2, date = $3, time = $4, 
                location = $5, home_team = $6, result_home = $7, result_away = $8 WHERE id = $9`,
            [opponent, competition, date, time, location, home_team === 'on', result_home || null, result_away || null, id]
        );
        res.redirect('/coach/matches');
    } catch (error) {
        res.redirect('/coach/matches');
    }
};

// Eliminar partido
export const deleteMatch = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM matches WHERE id = $1', [id]);
        res.redirect('/coach/matches');
    } catch (error) {
        res.redirect('/coach/matches');
    }
};

// Obtener partido por ID (API)
export const getMatchById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener partido' });
    }
};