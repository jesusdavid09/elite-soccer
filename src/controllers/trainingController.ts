import { Request, Response } from 'express';
import pool from '../config/database';

// ============== OBTENER ENTRENAMIENTOS ==============
export const getTrainings = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo lista de entrenamientos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                t.id,
                t.title,
                t.description,
                t.date,
                t.time,
                t.location,
                t.duration,
                t.created_at,
                t.created_by,
                u.full_name as created_by_name
            FROM trainings t
            LEFT JOIN users u ON t.created_by = u.id 
            ORDER BY t.date DESC
        `);
        
        console.log(`✅ ${result.rows.length} entrenamientos encontrados`);
        
        res.render('coach/trainings', { 
            title: 'Entrenamientos', 
            trainings: result.rows, 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener entrenamientos:', error);
        res.render('coach/trainings', { 
            title: 'Entrenamientos', 
            trainings: [], 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    }
};

// ============== CREAR ENTRENAMIENTO ==============
export const createTraining = async (req: Request, res: Response) => {
    const { title, description, date, time, location, duration } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`📝 Creando nuevo entrenamiento: ${title}...`);
    console.log(`📝 Datos: ${date}, ${time}, ${location}, Duración: ${duration}min`);
    console.log(`👤 Creado por: ${userId}`);
    
    if (!title || !date || !time || !location) {
        console.log('❌ Error: Campos obligatorios faltantes');
        req.flash('error', '⚠️ Título, fecha, hora y lugar son obligatorios');
        return res.redirect('/coach/trainings');
    }
    
    if (!userId) {
        console.log('❌ Error: Usuario no autenticado');
        req.flash('error', '❌ Debes iniciar sesión para crear entrenamientos');
        return res.redirect('/coach/trainings');
    }
    
    try {
        // 🔥 SOLUCIÓN: Manejar duration correctamente
        let finalDuration: number | null = null;
        if (duration) {
            const parsedDuration = parseInt(duration);
            if (!isNaN(parsedDuration) && parsedDuration > 0) {
                finalDuration = parsedDuration;
            } else {
                console.log(`⚠️ Duración inválida: ${duration}, usando null`);
            }
        }
        
        const result = await pool.query(
            `INSERT INTO trainings (title, description, date, time, location, duration, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
            [
                title.trim(), 
                description ? description.trim() : null, 
                date, 
                time, 
                location.trim(), 
                finalDuration, // Ahora es number | null
                userId
            ]
        );
        
        console.log(`✅ Entrenamiento creado con ID: ${result.rows[0].id}`);
        req.flash('success', '✅ Entrenamiento creado correctamente');
        res.redirect('/coach/trainings');
    } catch (error) {
        console.error('❌ Error al crear entrenamiento:', error);
        req.flash('error', '❌ Error al crear el entrenamiento');
        res.redirect('/coach/trainings');
    }
};

// ============== ACTUALIZAR ENTRENAMIENTO ==============
export const updateTraining = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const { title, description, date, time, location, duration } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`✏️ Actualizando entrenamiento ID: ${id}`);
    console.log(`📝 Datos: ${title}, ${date}, ${time}, ${location}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de entrenamiento inválido');
        return res.redirect('/coach/trainings');
    }
    
    if (!title || !date || !time || !location) {
        console.log('❌ Error: Campos obligatorios faltantes');
        req.flash('error', '⚠️ Título, fecha, hora y lugar son obligatorios');
        return res.redirect('/coach/trainings');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, created_by FROM trainings WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Entrenamiento ${id} no encontrado`);
            req.flash('error', '❌ El entrenamiento no existe');
            return res.redirect('/coach/trainings');
        }
        
        const createdBy = checkResult.rows[0].created_by;
        if (createdBy !== userId && (req as any).user?.role !== 'admin') {
            console.log(`⚠️ Usuario ${userId} no tiene permiso para editar entrenamiento ${id}`);
            req.flash('error', '⚠️ No tienes permiso para editar este entrenamiento');
            return res.redirect('/coach/trainings');
        }
        
        // 🔥 SOLUCIÓN: Manejar duration correctamente
        let finalDuration: number | null = null;
        if (duration) {
            const parsedDuration = parseInt(duration);
            if (!isNaN(parsedDuration) && parsedDuration > 0) {
                finalDuration = parsedDuration;
            } else {
                console.log(`⚠️ Duración inválida: ${duration}, usando null`);
            }
        }
        
        await pool.query(
            `UPDATE trainings 
             SET title = $1, 
                 description = $2, 
                 date = $3, 
                 time = $4, 
                 location = $5, 
                 duration = $6,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7`,
            [
                title.trim(), 
                description ? description.trim() : null, 
                date, 
                time, 
                location.trim(), 
                finalDuration, // Ahora es number | null
                id
            ]
        );
        
        console.log(`✅ Entrenamiento ${id} actualizado correctamente`);
        req.flash('success', '✅ Entrenamiento actualizado correctamente');
        res.redirect('/coach/trainings');
    } catch (error) {
        console.error(`❌ Error al actualizar entrenamiento ${id}:`, error);
        req.flash('error', '❌ Error al actualizar el entrenamiento');
        res.redirect('/coach/trainings');
    }
};

// ============== ELIMINAR ENTRENAMIENTO ==============
export const deleteTraining = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`🗑️ Eliminando entrenamiento ID: ${id}`);
    console.log(`👤 Usuario ID: ${userId}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de entrenamiento inválido');
        return res.redirect('/coach/trainings');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, created_by FROM trainings WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Entrenamiento ${id} no encontrado`);
            req.flash('error', '❌ El entrenamiento no existe');
            return res.redirect('/coach/trainings');
        }
        
        const createdBy = checkResult.rows[0].created_by;
        if (createdBy !== userId && (req as any).user?.role !== 'admin') {
            console.log(`⚠️ Usuario ${userId} no tiene permiso para eliminar entrenamiento ${id}`);
            req.flash('error', '⚠️ No tienes permiso para eliminar este entrenamiento');
            return res.redirect('/coach/trainings');
        }
        
        try {
            await pool.query('DELETE FROM training_attendance WHERE training_id = $1', [id]);
            console.log(`✅ Asistencias eliminadas para entrenamiento ${id}`);
        } catch (e) {
            console.log(`⚠️ No se eliminaron asistencias (tabla puede no existir)`);
        }
        
        await pool.query('DELETE FROM trainings WHERE id = $1', [id]);
        
        console.log(`✅ Entrenamiento ${id} eliminado correctamente`);
        req.flash('success', '✅ Entrenamiento eliminado correctamente');
        res.redirect('/coach/trainings');
    } catch (error) {
        console.error(`❌ Error al eliminar entrenamiento ${id}:`, error);
        req.flash('error', '❌ Error al eliminar el entrenamiento');
        res.redirect('/coach/trainings');
    }
};

// ============== OBTENER ENTRENAMIENTO POR ID (API) ==============
export const getTrainingById = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    
    console.log(`📋 Obteniendo entrenamiento ID: ${id}`);
    
    try {
        const result = await pool.query(`
            SELECT 
                id,
                title,
                description,
                date,
                time,
                location,
                duration,
                created_by,
                created_at
            FROM trainings 
            WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            console.log(`❌ Entrenamiento ${id} no encontrado`);
            return res.status(404).json({ error: 'Entrenamiento no encontrado' });
        }
        
        console.log(`✅ Entrenamiento ${id} encontrado`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Error al obtener entrenamiento ${id}:`, error);
        res.status(500).json({ error: 'Error al obtener el entrenamiento' });
    }
};

// ============== OBTENER ENTRENAMIENTOS PRÓXIMOS ==============
export const getUpcomingTrainings = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo entrenamientos próximos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                id,
                title,
                date,
                time,
                location,
                duration
            FROM trainings 
            WHERE date >= CURRENT_DATE 
            ORDER BY date ASC 
            LIMIT 10
        `);
        
        console.log(`✅ ${result.rows.length} entrenamientos próximos encontrados`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener entrenamientos próximos:', error);
        res.status(500).json({ error: 'Error al obtener entrenamientos próximos' });
    }
};

// ============== OBTENER ENTRENAMIENTOS PASADOS ==============
export const getPastTrainings = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo entrenamientos pasados...');
    
    try {
        const result = await pool.query(`
            SELECT 
                t.*,
                u.full_name as created_by_name
            FROM trainings t
            LEFT JOIN users u ON t.created_by = u.id 
            WHERE t.date < CURRENT_DATE
            ORDER BY t.date DESC
            LIMIT 20
        `);
        
        console.log(`✅ ${result.rows.length} entrenamientos pasados encontrados`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener entrenamientos pasados:', error);
        res.status(500).json({ error: 'Error al obtener entrenamientos pasados' });
    }
};

// ============== CANCELAR ENTRENAMIENTO ==============
export const cancelTraining = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`🚫 Cancelando entrenamiento ID: ${id}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de entrenamiento inválido');
        return res.redirect('/coach/trainings');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, created_by FROM trainings WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Entrenamiento ${id} no encontrado`);
            req.flash('error', '❌ El entrenamiento no existe');
            return res.redirect('/coach/trainings');
        }
        
        const createdBy = checkResult.rows[0].created_by;
        if (createdBy !== userId && (req as any).user?.role !== 'admin') {
            console.log(`⚠️ Usuario ${userId} no tiene permiso para cancelar entrenamiento ${id}`);
            req.flash('error', '⚠️ No tienes permiso para cancelar este entrenamiento');
            return res.redirect('/coach/trainings');
        }
        
        await pool.query('DELETE FROM trainings WHERE id = $1', [id]);
        
        console.log(`✅ Entrenamiento ${id} cancelado correctamente`);
        req.flash('success', '✅ Entrenamiento cancelado correctamente');
        res.redirect('/coach/trainings');
    } catch (error) {
        console.error(`❌ Error al cancelar entrenamiento ${id}:`, error);
        req.flash('error', '❌ Error al cancelar el entrenamiento');
        res.redirect('/coach/trainings');
    }
};

// ============== OBTENER ENTRENAMIENTOS POR RANGO DE FECHAS ==============
export const getTrainingsByDateRange = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    console.log(`📋 Obteniendo entrenamientos entre ${startDate} y ${endDate}`);
    
    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Se requieren startDate y endDate' });
        }
        
        const result = await pool.query(`
            SELECT 
                id,
                title,
                description,
                date,
                time,
                location,
                duration
            FROM trainings 
            WHERE date >= $1 AND date <= $2
            ORDER BY date ASC
        `, [startDate, endDate]);
        
        console.log(`✅ ${result.rows.length} entrenamientos encontrados en el rango`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener entrenamientos por rango:', error);
        res.status(500).json({ error: 'Error al obtener entrenamientos' });
    }
};

// ============== OBTENER ESTADÍSTICAS DE ENTRENAMIENTOS ==============
export const getTrainingStatistics = async (req: Request, res: Response) => {
    console.log('📊 Obteniendo estadísticas de entrenamientos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_trainings,
                COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) as upcoming_trainings,
                COUNT(CASE WHEN date < CURRENT_DATE THEN 1 END) as past_trainings,
                AVG(duration) as avg_duration,
                MIN(duration) as min_duration,
                MAX(duration) as max_duration,
                (SELECT COUNT(DISTINCT player_id) FROM training_attendance WHERE status = 'yes') as confirmed_players,
                (SELECT COUNT(DISTINCT player_id) FROM training_attendance WHERE status = 'maybe') as maybe_players,
                (SELECT COUNT(DISTINCT player_id) FROM training_attendance WHERE status = 'no') as absent_players
            FROM trainings
        `);
        
        const byLocation = await pool.query(`
            SELECT 
                location,
                COUNT(*) as count
            FROM trainings
            WHERE location IS NOT NULL
            GROUP BY location
            ORDER BY count DESC
            LIMIT 10
        `);
        
        const byMonth = await pool.query(`
            SELECT 
                TO_CHAR(date, 'YYYY-MM') as month,
                COUNT(*) as count
            FROM trainings
            GROUP BY TO_CHAR(date, 'YYYY-MM')
            ORDER BY month DESC
            LIMIT 12
        `);
        
        res.json({
            general: result.rows[0] || {},
            byLocation: byLocation.rows || [],
            byMonth: byMonth.rows || []
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// ============== OBTENER ASISTENCIA DE ENTRENAMIENTO ==============
export const getTrainingAttendance = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    
    console.log(`📋 Obteniendo asistencia del entrenamiento ${id}...`);
    
    try {
        const result = await pool.query(`
            SELECT 
                a.*,
                p.jersey_number,
                u.full_name as player_name
            FROM training_attendance a
            JOIN players p ON a.player_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE a.training_id = $1
        `, [id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener asistencia:', error);
        res.status(500).json({ error: 'Error al obtener asistencia' });
    }
};

// ============== REGISTRAR ASISTENCIA ==============
export const registerAttendance = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const { player_id, status, justification } = req.body;
    
    console.log(`📝 Registrando asistencia para entrenamiento ${id}, jugador ${player_id}`);
    
    try {
        if (!player_id || !status) {
            return res.status(400).json({ error: 'Player ID y status son obligatorios' });
        }
        
        const trainingCheck = await pool.query(
            'SELECT id FROM trainings WHERE id = $1',
            [id]
        );
        
        if (trainingCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Entrenamiento no encontrado' });
        }
        
        const playerCheck = await pool.query(
            'SELECT id FROM players WHERE id = $1',
            [player_id]
        );
        
        if (playerCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        
        await pool.query(
            `INSERT INTO training_attendance (training_id, player_id, status, justification) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (training_id, player_id) 
             DO UPDATE SET status = $3, justification = $4`,
            [id, player_id, status, justification || null]
        );
        
        console.log(`✅ Asistencia registrada para entrenamiento ${id}, jugador ${player_id}`);
        res.json({ success: true, message: 'Asistencia registrada correctamente' });
    } catch (error) {
        console.error('❌ Error al registrar asistencia:', error);
        res.status(500).json({ error: 'Error al registrar asistencia' });
    }
};