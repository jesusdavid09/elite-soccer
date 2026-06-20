import { Request, Response } from 'express';
import pool from '../config/database';

// ============== OBTENER JUGADORES ==============
export const getPlayers = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo lista de jugadores...');
    
    try {
        const result = await pool.query(`
            SELECT 
                p.id, p.user_id, p.jersey_number, p.position, p.age, p.phone, 
                p.photo_url, p.status, p.created_at, p.updated_at,
                u.full_name, u.email, u.approved
            FROM players p
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.jersey_number ASC NULLS LAST
        `);
        
        console.log(`✅ ${result.rows.length} jugadores encontrados`);
        
        res.render('coach/players', { 
            title: 'Jugadores', 
            players: result.rows, 
            user: req.user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener jugadores:', error);
        res.render('coach/players', { 
            title: 'Jugadores', 
            players: [], 
            user: req.user,
            pendingCount: res.locals?.pendingCount || 0
        });
    }
};

// ============== CREAR JUGADOR JUNTOS A SUS ESTADÍSTICAS ==============
export const createPlayer = async (req: Request, res: Response) => {
    const { user_id, jersey_number, position, age, phone } = req.body;
    
    if (!user_id || !jersey_number || !position) {
        req.flash('error', '⚠️ Todos los campos obligatorios deben ser completados');
        return res.redirect('/coach/players');
    }
    
    const numCamiseta = parseInt(jersey_number, 10);
    if (isNaN(numCamiseta) || numCamiseta < 1 || numCamiseta > 99) {
        req.flash('error', '⚠️ El número de camiseta debe estar entre 1 y 99');
        return res.redirect('/coach/players');
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciamos transacción
        
        const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [user_id]);
        if (userCheck.rows.length === 0) {
            req.flash('error', '❌ El usuario especificado no existe');
            await client.query('ROLLBACK');
            return res.redirect('/coach/players');
        }
        
        const jerseyCheck = await client.query('SELECT id FROM players WHERE jersey_number = $1', [numCamiseta]);
        if (jerseyCheck.rows.length > 0) {
            req.flash('error', `⚠️ El número ${numCamiseta} ya está asignado a otro jugador`);
            await client.query('ROLLBACK');
            return res.redirect('/coach/players');
        }
        
        const result = await client.query(
            `INSERT INTO players (user_id, jersey_number, position, age, phone, status) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [user_id, numCamiseta, position.trim(), age || null, phone || null, 'approved']
        );
        
        const playerId = result.rows[0].id;
        
        await client.query(
            `INSERT INTO statistics (player_id, season) VALUES ($1, $2)`,
            [playerId, new Date().getFullYear().toString()]
        );
        
        await client.query('COMMIT'); // Todo bien, guardamos cambios
        req.flash('success', '✅ Jugador creado correctamente junto con sus estadísticas');
        res.redirect('/coach/players');
    } catch (error: any) {
        await client.query('ROLLBACK'); // Error, deshacemos todo
        console.error('❌ Error al crear jugador:', error);
        req.flash('error', error.code === '23505' ? '⚠️ El número de camiseta ya está en uso' : '❌ Error al crear el jugador');
        res.redirect('/coach/players');
    } finally {
        client.release();
    }
};

// ============== ACTUALIZAR JUGADOR ==============
export const updatePlayer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { jersey_number, position, age, phone } = req.body;
    
    if (!id || id === 'undefined' || id === 'null') {
        req.flash('error', '❌ ID de jugador inválido');
        return res.redirect('/coach/players');
    }
    
    const numCamiseta = parseInt(jersey_number, 10);
    if (isNaN(numCamiseta) || numCamiseta < 1 || numCamiseta > 99) {
        req.flash('error', '⚠️ El número de camiseta debe estar entre 1 y 99');
        return res.redirect('/coach/players');
    }
    
    try {
        const checkResult = await pool.query('SELECT id FROM players WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            req.flash('error', '❌ El jugador no existe');
            return res.redirect('/coach/players');
        }
        
        const jerseyCheck = await pool.query('SELECT id FROM players WHERE jersey_number = $1 AND id != $2', [numCamiseta, id]);
        if (jerseyCheck.rows.length > 0) {
            req.flash('error', `⚠️ El número ${numCamiseta} ya está asignado a otro jugador`);
            return res.redirect('/coach/players');
        }
        
        await pool.query(
            `UPDATE players 
             SET jersey_number = $1, position = $2, age = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [numCamiseta, position.trim(), age || null, phone || null, id]
        );
        
        req.flash('success', '✅ Jugador actualizado correctamente');
        res.redirect('/coach/players');
    } catch (error) {
        console.error(`❌ Error al actualizar jugador ${id}:`, error);
        req.flash('error', '❌ Error al actualizar el jugador');
        res.redirect('/coach/players');
    }
};

// ============== ELIMINAR JUGADOR COMPLETO ==============
export const deletePlayer = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id || id === 'undefined' || id === 'null') {
        req.flash('error', '❌ ID de jugador inválido');
        return res.redirect('/coach/players');
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const checkResult = await client.query('SELECT user_id FROM players WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            req.flash('error', '❌ El jugador no existe');
            await client.query('ROLLBACK');
            return res.redirect('/coach/players');
        }
        
        const { user_id } = checkResult.rows[0];
        
        // Limpiamos dependencias de estadísticas e hijo
        await client.query('DELETE FROM statistics WHERE player_id = $1', [id]);
        await client.query('DELETE FROM players WHERE id = $1', [id]);
        
        // Opcional: Cambiamos el estado del usuario base para que no intente ingresar como aprobado sin perfil
        await client.query('UPDATE users SET approved = false WHERE id = $1', [user_id]);
        
        await client.query('COMMIT');
        req.flash('success', '✅ Perfil de jugador y estadísticas eliminados con éxito');
        res.redirect('/coach/players');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error al eliminar jugador ${id}:`, error);
        req.flash('error', '❌ Error al eliminar el jugador');
        res.redirect('/coach/players');
    } finally {
        client.release();
    }
};

// ============== OBTENER JUGADOR POR ID (API) ==============
export const getPlayerById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email, u.approved FROM players p
            JOIN users u ON p.user_id = u.id WHERE p.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Error al obtener jugador ${id}:`, error);
        res.status(500).json({ error: 'Error al obtener el jugador' });
    }
};

// ============== OBTENER USUARIOS PENDIENTES ==============
export const getPendingUsers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            "SELECT id, email, full_name, created_at FROM users WHERE role = 'player' AND approved = false ORDER BY created_at ASC"
        );
        res.render('coach/pending', { 
            title: 'Aprobaciones Pendientes', 
            users: result.rows, 
            user: req.user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener usuarios pendientes:', error);
        res.render('coach/pending', { title: 'Aprobaciones Pendientes', users: [], user: req.user, pendingCount: 0 });
    }
};

// ============== APROBAR USUARIO SEGURO ==============
export const approveUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id || id === 'undefined' || id === 'null') {
        req.flash('error', '❌ ID de usuario inválido');
        return res.redirect('/coach/players/pending');
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const checkResult = await client.query('SELECT full_name FROM users WHERE id = $1 AND approved = false', [id]);
        if (checkResult.rows.length === 0) {
            req.flash('error', '❌ El usuario no existe o ya está aprobado');
            await client.query('ROLLBACK');
            return res.redirect('/coach/players/pending');
        }
        
        await client.query('UPDATE users SET approved = true WHERE id = $1', [id]);
        
        // Evitamos duplicados usando una inserción limpia condicional
        await client.query(`
            INSERT INTO players (user_id, status) 
            VALUES ($1, 'approved')
            ON CONFLICT (user_id) DO NOTHING
        `, [id]);
        
        await client.query('COMMIT');
        req.flash('success', `✅ Usuario ${checkResult.rows[0].full_name} aprobado correctamente`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error al aprobar usuario ${id}:`, error);
        req.flash('error', '❌ Error al aprobar el usuario');
        res.redirect('/coach/players/pending');
    } finally {
        client.release();
    }
};

// ============== RECHAZAR USUARIO ==============
export const rejectUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
        req.flash('error', '❌ ID de usuario inválido');
        return res.redirect('/coach/players/pending');
    }
    
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 AND approved = false RETURNING full_name', [id]);
        if (result.rows.length === 0) {
            req.flash('error', '❌ El usuario no existe o ya está aprobado');
            return res.redirect('/coach/players/pending');
        }
        req.flash('success', `❌ Usuario ${result.rows[0].full_name} rechazado de la plataforma`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        console.error(`❌ Error al rechazar usuario ${id}:`, error);
        req.flash('error', '❌ Error al rechazar el usuario');
        res.redirect('/coach/players/pending');
    }
};

// ============== APROBAR TODOS LOS USUARIOS (TRANSACCIONAL) ==============
export const approveAllPending = async (req: Request, res: Response) => {
    console.log('✅ Aprobando todos los usuarios pendientes de forma masiva...');
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Actualizamos todos los usuarios en lote y traemos sus IDs
        const result = await client.query(
            "UPDATE users SET approved = true WHERE role = 'player' AND approved = false RETURNING id"
        );
        
        const approvedCount = result.rows.length;
        if (approvedCount === 0) {
            req.flash('info', 'ℹ️ No hay usuarios pendientes por aprobar');
            await client.query('COMMIT');
            return res.redirect('/coach/players/pending');
        }
        
        // 2. Insertamos los perfiles en bloque evitando duplicar si ya existían usando la potencia de PostgreSQL
        for (const user of result.rows) {
            await client.query(`
                INSERT INTO players (user_id, status) 
                VALUES ($1, 'approved') 
                ON CONFLICT (user_id) DO NOTHING
            `, [user.id]);
        }
        
        await client.query('COMMIT');
        req.flash('success', `✅ ${approvedCount} usuarios aprobados masivamente con éxito`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al aprobar todos los usuarios:', error);
        req.flash('error', '❌ Error crítico al procesar la aprobación en lote');
        res.redirect('/coach/players/pending');
    } finally {
        client.release();
    }
};

// ============== RECHAZAR TODOS LOS USUARIOS PENDIENTES ==============
export const rejectAllPending = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("DELETE FROM users WHERE role = 'player' AND approved = false RETURNING id");
        req.flash('success', `❌ Se han rechazado y eliminado ${result.rows.length} solicitudes`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        console.error('❌ Error al rechazar todos los usuarios:', error);
        req.flash('error', '❌ Error al rechazar los usuarios masivamente');
        res.redirect('/coach/players/pending');
    }
};

// ============== SUBIR FOTO DE JUGADOR ==============
export const uploadPlayerPhoto = async (req: Request, res: Response) => {
    const { id } = req.params;
    const file = (req as any).file; // Cambiar por tu tipo Multer.File si es necesario
    
    if (!file) {
        req.flash('error', '❌ No se seleccionó ninguna imagen');
        return res.redirect('/coach/players');
    }
    
    try {
        const photoUrl = `/uploads/players/${file.filename}`;
        const result = await pool.query('UPDATE players SET photo_url = $1 WHERE id = $2 RETURNING id', [photoUrl, id]);
        
        if (result.rows.length === 0) {
            req.flash('error', '❌ El jugador no existe');
            return res.redirect('/coach/players');
        }
        
        req.flash('success', '✅ Foto de perfil actualizada correctamente');
        res.redirect('/coach/players');
    } catch (error) {
        console.error(`❌ Error al subir foto para jugador ${id}:`, error);
        req.flash('error', '❌ Error al guardar la ruta de la foto');
        res.redirect('/coach/players');
    }
};

// ============== OBTENER JUGADOR POR EMAIL ==============
export const getPlayerByEmail = async (req: Request, res: Response) => {
    const { email } = req.params;
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE u.email = $1
        `, [email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error al obtener jugador por email:', error);
        res.status(500).json({ error: 'Error al obtener jugador' });
    }
};

// ============== OBTENER ESTADÍSTICAS GLOBALES ==============
export const getPlayerStatistics = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_players,
                COUNT(DISTINCT NULLIF(p.position, '')) as total_positions,
                ROUND(AVG(p.age)::numeric, 1) as average_age,
                MIN(p.age) as youngest_age,
                MAX(p.age) as oldest_age,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_players,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_players,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_players
            FROM players p
        `);
        
        const positions = await pool.query(`
            SELECT position, COUNT(*) as count, ROUND(AVG(age)::numeric, 1) as avg_age
            FROM players WHERE position IS NOT NULL AND position != ''
            GROUP BY position ORDER BY count DESC
        `);
        
        res.json({
            general: result.rows[0] || {},
            positions: positions.rows || []
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// ============== BUSCAR JUGADORES ==============
export const searchPlayers = async (req: Request, res: Response) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({ error: 'La búsqueda debe tener al menos 2 caracteres' });
    }
    
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE u.full_name ILIKE $1 
               OR u.email ILIKE $1
               OR p.jersey_number::text ILIKE $1
               OR p.position ILIKE $1
            ORDER BY u.full_name ASC LIMIT 20
        `, [`%${q}%`]);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al buscar jugadores:', error);
        res.status(500).json({ error: 'Error al buscar jugadores' });
    }
};

// ============== OBTENER JUGADORES POR POSICIÓN ==============
export const getPlayersByPosition = async (req: Request, res: Response) => {
    const { position } = req.params;
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE p.position ILIKE $1 ORDER BY p.jersey_number ASC
        `, [`%${position}%`]);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener jugadores por posición:', error);
        res.status(500).json({ error: 'Error al obtener jugadores' });
    }
};

// ============== OBTENER JUGADORES ACTIVOS ==============
export const getActivePlayers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE p.status = 'approved' ORDER BY p.jersey_number ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener jugadores activos:', error);
        res.status(500).json({ error: 'Error al obtener jugadores activos' });
    }
};

// ============== OBTENER JUGADORES INACTIVOS ==============
export const getInactivePlayers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE p.status != 'approved' OR p.status IS NULL ORDER BY p.jersey_number ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener jugadores inactivos:', error);
        res.status(500).json({ error: 'Error al obtener jugadores inactivos' });
    }
};