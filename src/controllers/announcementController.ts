import { Request, Response } from 'express';
import pool from '../config/database';

export const getAnnouncements = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.full_name as author_name FROM announcements a
            JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC
        `);
        res.render('coach/announcements', { title: 'Anuncios', announcements: result.rows, user: (req as any).user });
    } catch (error) {
        res.render('coach/announcements', { title: 'Anuncios', announcements: [], user: (req as any).user });
    }
};

export const createAnnouncement = async (req: Request, res: Response) => {
    const { title, content } = req.body;
    try {
        await pool.query(
            `INSERT INTO announcements (title, content, author_id) VALUES ($1, $2, $3)`,
            [title, content, (req as any).user?.id]
        );
        res.redirect('/coach/announcements');
    } catch (error) {
        res.redirect('/coach/announcements');
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
        res.redirect('/coach/announcements');
    } catch (error) {
        res.redirect('/coach/announcements');
    }
};