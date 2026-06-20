import { Request, Response } from 'express';
import pool from '../config/database';

// ========== OBTENER JUGADORES ==========
export const getPlayers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id ORDER BY p.jersey_number
        `);
        res.render('coach/players', { title: 'Jugadores', players: result.rows, user: (req as any).user });
    } catch (error) {
        res.render('coach/players', { title: 'Jugadores', players: [], user: (req as any).user });
    }
};

// ========== CREAR JUGADOR ==========
export const createPlayer = async (req: Request, res: Response) => {
    const { user_id, jersey_number, position, age, phone } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO players (user_id, jersey_number, position, age, phone) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [user_id, jersey_number, position, age, phone]
        );
        if (result.rows[0]) {
            await pool.query(`INSERT INTO statistics (player_id, season) VALUES ($1, '2024')`, [result.rows[0].id]);
        }
        res.redirect('/coach/players');
    } catch (error) {
        res.redirect('/coach/players');
    }
};

// ========== ACTUALIZAR JUGADOR ==========
export const updatePlayer = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { jersey_number, position, age, phone } = req.body;
    try {
        await pool.query(
            `UPDATE players SET jersey_number = $1, position = $2, age = $3, phone = $4 WHERE id = $5`,
            [jersey_number, position, age, phone, id]
        );
        res.redirect('/coach/players');
    } catch (error) {
        res.redirect('/coach/players');
    }
};

// ========== ELIMINAR JUGADOR ==========
export const deletePlayer = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
        await pool.query('DELETE FROM players WHERE id = $1', [id]);
        res.redirect('/coach/players');
    } catch (error) {
        res.redirect('/coach/players');
    }
};

// ========== OBTENER JUGADOR POR ID (API) ==========
export const getPlayerById = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE p.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener jugador' });
    }
};

// ========== SUBIR FOTO DE JUGADOR ==========
export const uploadPlayerPhoto = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const file = (req as any).file;
    
    console.log(`📷 Subiendo foto para jugador ID: ${id}`);
    
    if (!file) {
        console.log('❌ Error: No se subió ningún archivo');
        return res.redirect('/coach/players');
    }
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        return res.redirect('/coach/players');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id FROM players WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Jugador ${id} no encontrado`);
            return res.redirect('/coach/players');
        }
        
        const photoUrl = `/uploads/players/${file.filename}`;
        await pool.query(
            'UPDATE players SET photo_url = $1 WHERE id = $2',
            [photoUrl, id]
        );
        
        console.log(`✅ Foto actualizada para jugador ${id}: ${photoUrl}`);
        res.redirect('/coach/players');
    } catch (error) {
        console.error(`❌ Error al subir foto para jugador ${id}:`, error);
        res.redirect('/coach/players');
    }
};

// ========== USUARIOS PENDIENTES ==========
export const getPendingUsers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, email, full_name, created_at FROM users WHERE role = 'player' AND approved = false`
        );
        res.render('coach/pending', { title: 'Aprobaciones Pendientes', users: result.rows, user: (req as any).user });
    } catch (error) {
        res.render('coach/pending', { title: 'Aprobaciones Pendientes', users: [], user: (req as any).user });
    }
};

// ========== APROBAR USUARIO ==========
export const approveUser = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
        await pool.query('UPDATE users SET approved = true WHERE id = $1', [id]);
        res.redirect('/coach/players/pending');
    } catch (error) {
        res.redirect('/coach/players/pending');
    }
};

// ========== RECHAZAR USUARIO ==========
export const rejectUser = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    try {
        await pool.query('DELETE FROM users WHERE id = $1 AND approved = false', [id]);
        res.redirect('/coach/players/pending');
    } catch (error) {
        res.redirect('/coach/players/pending');
    }
};