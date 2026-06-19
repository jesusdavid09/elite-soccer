import { Request, Response } from 'express';
import pool from '../config/database';

export const getTrainings = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT t.*, u.full_name as created_by_name FROM trainings t
            LEFT JOIN users u ON t.created_by = u.id ORDER BY t.date DESC
        `);
        res.render('coach/trainings', { title: 'Entrenamientos', trainings: result.rows, user: (req as any).user });
    } catch (error) {
        res.render('coach/trainings', { title: 'Entrenamientos', trainings: [], user: (req as any).user });
    }
};

export const createTraining = async (req: Request, res: Response) => {
    const { title, description, date, time, location, duration } = req.body;
    try {
        await pool.query(
            `INSERT INTO trainings (title, description, date, time, location, duration, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [title, description, date, time, location, duration, (req as any).user?.id]
        );
        res.redirect('/coach/trainings');
    } catch (error) {
        res.redirect('/coach/trainings');
    }
};

export const updateTraining = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, date, time, location, duration } = req.body;
    try {
        await pool.query(
            `UPDATE trainings SET title = $1, description = $2, date = $3, time = $4, location = $5, duration = $6 WHERE id = $7`,
            [title, description, date, time, location, duration, id]
        );
        res.redirect('/coach/trainings');
    } catch (error) {
        res.redirect('/coach/trainings');
    }
};

export const deleteTraining = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM trainings WHERE id = $1', [id]);
        res.redirect('/coach/trainings');
    } catch (error) {
        res.redirect('/coach/trainings');
    }
};