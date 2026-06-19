import { Request, Response } from 'express';
import pool from '../config/database';

// ============== OBTENER JUGADORES ==============
export const getPlayers = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo lista de jugadores...');
    
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                p.jersey_number,
                p.position,
                p.age,
                p.phone,
                p.photo_url,
                p.status,
                p.created_at,
                p.updated_at,
                u.full_name,
                u.email,
                u.approved
            FROM players p
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.jersey_number ASC NULLS LAST
        `);
        
        console.log(`✅ ${result.rows.length} jugadores encontrados`);
        
        res.render('coach/players', { 
            title: 'Jugadores', 
            players: result.rows, 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener jugadores:', error);
        res.render('coach/players', { 
            title: 'Jugadores', 
            players: [], 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    }
};

// ============== CREAR JUGADOR ==============
export const createPlayer = async (req: Request, res: Response) => {
    const { user_id, jersey_number, position, age, phone, full_name, email } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`📝 Creando nuevo jugador...`);
    console.log(`📝 Usuario ID: ${user_id}, Camiseta: ${jersey_number}, Posición: ${position}`);
    
    if (!user_id || !jersey_number || !position) {
        console.log('❌ Error: Campos obligatorios faltantes');
        req.flash('error', '⚠️ Todos los campos obligatorios deben ser completados');
        return res.redirect('/coach/players');
    }
    
    if (jersey_number < 1 || jersey_number > 99) {
        console.log(`❌ Error: Número de camiseta inválido: ${jersey_number}`);
        req.flash('error', '⚠️ El número de camiseta debe estar entre 1 y 99');
        return res.redirect('/coach/players');
    }
    
    try {
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [user_id]
        );
        
        if (userCheck.rows.length === 0) {
            console.log(`❌ Error: Usuario ${user_id} no encontrado`);
            req.flash('error', '❌ El usuario especificado no existe');
            return res.redirect('/coach/players');
        }
        
        const jerseyCheck = await pool.query(
            'SELECT id FROM players WHERE jersey_number = $1',
            [jersey_number]
        );
        
        if (jerseyCheck.rows.length > 0) {
            console.log(`❌ Error: Número ${jersey_number} ya está en uso`);
            req.flash('error', `⚠️ El número ${jersey_number} ya está asignado a otro jugador`);
            return res.redirect('/coach/players');
        }
        
        const result = await pool.query(
            `INSERT INTO players (user_id, jersey_number, position, age, phone, status) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [user_id, jersey_number, position, age || null, phone || null, 'approved']
        );
        
        const playerId = result.rows[0].id;
        console.log(`✅ Jugador creado con ID: ${playerId}`);
        
        await pool.query(
            `INSERT INTO statistics (player_id, season) VALUES ($1, $2)`,
            [playerId, new Date().getFullYear().toString()]
        );
        console.log(`✅ Estadísticas creadas para jugador: ${playerId}`);
        
        req.flash('success', '✅ Jugador creado correctamente');
        res.redirect('/coach/players');
    } catch (error: any) {
        console.error('❌ Error al crear jugador:', error);
        
        if (error.code === '23505') {
            req.flash('error', '⚠️ El número de camiseta ya está en uso');
        } else {
            req.flash('error', '❌ Error al crear el jugador');
        }
        res.redirect('/coach/players');
    }
};

// ============== ACTUALIZAR JUGADOR ==============
export const updatePlayer = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const { jersey_number, position, age, phone } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`✏️ Actualizando jugador ID: ${id}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de jugador inválido');
        return res.redirect('/coach/players');
    }
    
    if (!jersey_number || !position) {
        console.log('❌ Error: Campos obligatorios faltantes');
        req.flash('error', '⚠️ El número de camiseta y la posición son obligatorios');
        return res.redirect('/coach/players');
    }
    
    if (jersey_number < 1 || jersey_number > 99) {
        console.log(`❌ Error: Número de camiseta inválido: ${jersey_number}`);
        req.flash('error', '⚠️ El número de camiseta debe estar entre 1 y 99');
        return res.redirect('/coach/players');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id FROM players WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Jugador ${id} no encontrado`);
            req.flash('error', '❌ El jugador no existe');
            return res.redirect('/coach/players');
        }
        
        const jerseyCheck = await pool.query(
            'SELECT id FROM players WHERE jersey_number = $1 AND id != $2',
            [jersey_number, id]
        );
        
        if (jerseyCheck.rows.length > 0) {
            console.log(`❌ Error: Número ${jersey_number} ya está en uso`);
            req.flash('error', `⚠️ El número ${jersey_number} ya está asignado a otro jugador`);
            return res.redirect('/coach/players');
        }
        
        await pool.query(
            `UPDATE players 
             SET jersey_number = $1, 
                 position = $2, 
                 age = $3, 
                 phone = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [jersey_number, position, age || null, phone || null, id]
        );
        
        console.log(`✅ Jugador ${id} actualizado correctamente`);
        req.flash('success', '✅ Jugador actualizado correctamente');
        res.redirect('/coach/players');
    } catch (error) {
        console.error(`❌ Error al actualizar jugador ${id}:`, error);
        req.flash('error', '❌ Error al actualizar el jugador');
        res.redirect('/coach/players');
    }
};

// ============== ELIMINAR JUGADOR ==============
export const deletePlayer = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`🗑️ Eliminando jugador ID: ${id}`);
    console.log(`👤 Usuario ID: ${userId}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de jugador inválido');
        return res.redirect('/coach/players');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, user_id FROM players WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Jugador ${id} no encontrado`);
            req.flash('error', '❌ El jugador no existe');
            return res.redirect('/coach/players');
        }
        
        const playerUserId = checkResult.rows[0].user_id;
        
        await pool.query('DELETE FROM statistics WHERE player_id = $1', [id]);
        console.log(`✅ Estadísticas eliminadas para jugador ${id}`);
        
        await pool.query('DELETE FROM players WHERE id = $1', [id]);
        console.log(`✅ Jugador ${id} eliminado correctamente`);
        
        req.flash('success', '✅ Jugador eliminado correctamente');
        res.redirect('/coach/players');
    } catch (error) {
        console.error(`❌ Error al eliminar jugador ${id}:`, error);
        req.flash('error', '❌ Error al eliminar el jugador');
        res.redirect('/coach/players');
    }
};

// ============== OBTENER JUGADOR POR ID (API) ==============
export const getPlayerById = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    
    console.log(`📋 Obteniendo jugador ID: ${id}`);
    
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                p.jersey_number,
                p.position,
                p.age,
                p.phone,
                p.photo_url,
                p.status,
                p.created_at,
                u.full_name,
                u.email,
                u.approved
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            console.log(`❌ Jugador ${id} no encontrado`);
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        
        console.log(`✅ Jugador ${id} encontrado`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Error al obtener jugador ${id}:`, error);
        res.status(500).json({ error: 'Error al obtener el jugador' });
    }
};

// ============== OBTENER USUARIOS PENDIENTES ==============
export const getPendingUsers = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo usuarios pendientes de aprobación...');
    
    try {
        const result = await pool.query(`
            SELECT 
                id,
                email,
                full_name,
                created_at
            FROM users 
            WHERE role = 'player' 
                AND approved = false
            ORDER BY created_at ASC
        `);
        
        console.log(`✅ ${result.rows.length} usuarios pendientes encontrados`);
        
        res.render('coach/pending', { 
            title: 'Aprobaciones Pendientes', 
            users: result.rows, 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener usuarios pendientes:', error);
        res.render('coach/pending', { 
            title: 'Aprobaciones Pendientes', 
            users: [], 
            user: (req as any).user,
            pendingCount: 0
        });
    }
};

// ============== APROBAR USUARIO ==============
export const approveUser = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`✅ Aprobando usuario ID: ${id}`);
    console.log(`👤 Aprobado por: ${userId}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de usuario inválido');
        return res.redirect('/coach/players/pending');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, email, full_name FROM users WHERE id = $1 AND approved = false',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Usuario ${id} no encontrado o ya aprobado`);
            req.flash('error', '❌ El usuario no existe o ya está aprobado');
            return res.redirect('/coach/players/pending');
        }
        
        await pool.query('UPDATE users SET approved = true WHERE id = $1', [id]);
        console.log(`✅ Usuario ${id} aprobado correctamente`);
        
        const playerCheck = await pool.query(
            'SELECT id FROM players WHERE user_id = $1',
            [id]
        );
        
        if (playerCheck.rows.length === 0) {
            console.log(`📝 Creando jugador automático para usuario ${id}`);
            await pool.query(
                `INSERT INTO players (user_id, status) VALUES ($1, $2)`,
                [id, 'approved']
            );
        }
        
        req.flash('success', `✅ Usuario ${checkResult.rows[0].full_name} aprobado correctamente`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        console.error(`❌ Error al aprobar usuario ${id}:`, error);
        req.flash('error', '❌ Error al aprobar el usuario');
        res.redirect('/coach/players/pending');
    }
};

// ============== RECHAZAR USUARIO ==============
export const rejectUser = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`❌ Rechazando usuario ID: ${id}`);
    console.log(`👤 Rechazado por: ${userId}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de usuario inválido');
        return res.redirect('/coach/players/pending');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, email, full_name FROM users WHERE id = $1 AND approved = false',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Usuario ${id} no encontrado o ya aprobado`);
            req.flash('error', '❌ El usuario no existe o ya está aprobado');
            return res.redirect('/coach/players/pending');
        }
        
        await pool.query('DELETE FROM users WHERE id = $1 AND approved = false', [id]);
        console.log(`❌ Usuario ${id} rechazado y eliminado`);
        
        req.flash('success', `❌ Usuario ${checkResult.rows[0].full_name} rechazado`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        console.error(`❌ Error al rechazar usuario ${id}:`, error);
        req.flash('error', '❌ Error al rechazar el usuario');
        res.redirect('/coach/players/pending');
    }
};

// ============== SUBIR FOTO DE JUGADOR ==============
export const uploadPlayerPhoto = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const file = (req as any).file;
    
    console.log(`📷 Subiendo foto para jugador ID: ${id}`);
    
    if (!file) {
        console.log('❌ Error: No se subió ningún archivo');
        req.flash('error', '❌ No se seleccionó ninguna imagen');
        return res.redirect('/coach/players');
    }
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de jugador inválido');
        return res.redirect('/coach/players');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id FROM players WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Jugador ${id} no encontrado`);
            req.flash('error', '❌ El jugador no existe');
            return res.redirect('/coach/players');
        }
        
        const photoUrl = `/uploads/players/${file.filename}`;
        await pool.query(
            'UPDATE players SET photo_url = $1 WHERE id = $2',
            [photoUrl, id]
        );
        
        console.log(`✅ Foto actualizada para jugador ${id}: ${photoUrl}`);
        req.flash('success', '✅ Foto de perfil actualizada correctamente');
        res.redirect('/coach/players');
    } catch (error) {
        console.error(`❌ Error al subir foto para jugador ${id}:`, error);
        req.flash('error', '❌ Error al subir la foto');
        res.redirect('/coach/players');
    }
};

// ============== APROBAR TODOS LOS USUARIOS PENDIENTES ==============
export const approveAllPending = async (req: Request, res: Response) => {
    console.log('✅ Aprobando todos los usuarios pendientes...');
    
    try {
        const result = await pool.query(
            'UPDATE users SET approved = true WHERE role = $1 AND approved = false RETURNING id, full_name',
            ['player']
        );
        
        const approvedCount = result.rows.length;
        console.log(`✅ ${approvedCount} usuarios aprobados`);
        
        for (const user of result.rows) {
            const playerCheck = await pool.query(
                'SELECT id FROM players WHERE user_id = $1',
                [user.id]
            );
            
            if (playerCheck.rows.length === 0) {
                await pool.query(
                    `INSERT INTO players (user_id, status) VALUES ($1, $2)`,
                    [user.id, 'approved']
                );
                console.log(`📝 Jugador creado para usuario ${user.id}`);
            }
        }
        
        req.flash('success', `✅ ${approvedCount} usuarios aprobados correctamente`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        console.error('❌ Error al aprobar todos los usuarios:', error);
        req.flash('error', '❌ Error al aprobar los usuarios');
        res.redirect('/coach/players/pending');
    }
};

// ============== RECHAZAR TODOS LOS USUARIOS PENDIENTES ==============
export const rejectAllPending = async (req: Request, res: Response) => {
    console.log('❌ Rechazando todos los usuarios pendientes...');
    
    try {
        const result = await pool.query(
            'DELETE FROM users WHERE role = $1 AND approved = false RETURNING id, full_name',
            ['player']
        );
        
        const rejectedCount = result.rows.length;
        console.log(`❌ ${rejectedCount} usuarios rechazados`);
        
        req.flash('success', `❌ ${rejectedCount} usuarios rechazados`);
        res.redirect('/coach/players/pending');
    } catch (error) {
        console.error('❌ Error al rechazar todos los usuarios:', error);
        req.flash('error', '❌ Error al rechazar los usuarios');
        res.redirect('/coach/players/pending');
    }
};

// ============== OBTENER JUGADOR POR EMAIL ==============
export const getPlayerByEmail = async (req: Request, res: Response) => {
    const { email } = req.params;
    
    console.log(`📋 Obteniendo jugador por email: ${email}`);
    
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE u.email = $1
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

// ============== OBTENER ESTADÍSTICAS DE JUGADORES ==============
export const getPlayerStatistics = async (req: Request, res: Response) => {
    console.log('📊 Obteniendo estadísticas de jugadores...');
    
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_players,
                COUNT(DISTINCT p.position) as total_positions,
                AVG(p.age) as average_age,
                MIN(p.age) as youngest_age,
                MAX(p.age) as oldest_age,
                (SELECT COUNT(*) FROM players WHERE status = 'approved') as approved_players,
                (SELECT COUNT(*) FROM players WHERE status = 'pending') as pending_players,
                (SELECT COUNT(*) FROM players WHERE status = 'rejected') as rejected_players
            FROM players p
        `);
        
        const positions = await pool.query(`
            SELECT 
                position,
                COUNT(*) as count,
                AVG(age) as avg_age
            FROM players
            WHERE position IS NOT NULL AND position != ''
            GROUP BY position
            ORDER BY count DESC
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
    
    console.log(`🔍 Buscando jugadores: ${q}`);
    
    try {
        if (!q || typeof q !== 'string' || q.length < 2) {
            return res.status(400).json({ error: 'La búsqueda debe tener al menos 2 caracteres' });
        }
        
        const result = await pool.query(`
            SELECT 
                p.*,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE u.full_name ILIKE $1 
               OR u.email ILIKE $1
               OR p.jersey_number::text ILIKE $1
               OR p.position ILIKE $1
            ORDER BY u.full_name ASC
            LIMIT 20
        `, [`%${q}%`]);
        
        console.log(`✅ ${result.rows.length} jugadores encontrados`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al buscar jugadores:', error);
        res.status(500).json({ error: 'Error al buscar jugadores' });
    }
};

// ============== OBTENER JUGADORES POR POSICIÓN ==============
export const getPlayersByPosition = async (req: Request, res: Response) => {
    const { position } = req.params;
    
    console.log(`📋 Obteniendo jugadores por posición: ${position}`);
    
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE p.position ILIKE $1
            ORDER BY p.jersey_number ASC
        `, [`%${position}%`]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener jugadores por posición:', error);
        res.status(500).json({ error: 'Error al obtener jugadores' });
    }
};

// ============== OBTENER JUGADORES ACTIVOS ==============
export const getActivePlayers = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo jugadores activos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE p.status = 'approved'
            ORDER BY p.jersey_number ASC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener jugadores activos:', error);
        res.status(500).json({ error: 'Error al obtener jugadores activos' });
    }
};

// ============== OBTENER JUGADORES INACTIVOS ==============
export const getInactivePlayers = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo jugadores inactivos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id
            WHERE p.status != 'approved' OR p.status IS NULL
            ORDER BY p.jersey_number ASC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener jugadores inactivos:', error);
        res.status(500).json({ error: 'Error al obtener jugadores inactivos' });
    }
};