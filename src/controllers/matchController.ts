import { Request, Response } from 'express';
import pool from '../config/database';

// ============== OBTENER PARTIDOS ==============
export const getMatches = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo lista de partidos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                m.id,
                m.opponent,
                m.competition,
                m.date,
                m.time,
                m.location,
                m.home_team,
                m.result_home,
                m.result_away,
                m.created_at,
                m.created_by,
                u.full_name as created_by_name
            FROM matches m
            LEFT JOIN users u ON m.created_by = u.id 
            ORDER BY m.date DESC
        `);
        
        console.log(`✅ ${result.rows.length} partidos encontrados`);
        
        res.render('coach/matches', { 
            title: 'Partidos', 
            matches: result.rows, 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener partidos:', error);
        res.render('coach/matches', { 
            title: 'Partidos', 
            matches: [], 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    }
};

// ============== CREAR PARTIDO ==============
export const createMatch = async (req: Request, res: Response) => {
    const { opponent, competition, date, time, location, home_team } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`📝 Creando nuevo partido vs ${opponent}...`);
    
    if (!opponent || !competition || !date || !time || !location) {
        console.log('❌ Error: Campos obligatorios faltantes');
        req.flash('error', '⚠️ Todos los campos son obligatorios');
        return res.redirect('/coach/matches');
    }
    
    if (!userId) {
        console.log('❌ Error: Usuario no autenticado');
        req.flash('error', '❌ Debes iniciar sesión para crear partidos');
        return res.redirect('/coach/matches');
    }
    
    try {
        const result = await pool.query(
            `INSERT INTO matches (opponent, competition, date, time, location, home_team, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id`,
            [opponent.trim(), competition.trim(), date, time, location.trim(), home_team === 'on', userId]
        );
        
        console.log(`✅ Partido creado con ID: ${result.rows[0].id}`);
        req.flash('success', '✅ Partido creado correctamente');
        res.redirect('/coach/matches');
    } catch (error) {
        console.error('❌ Error al crear partido:', error);
        req.flash('error', '❌ Error al crear el partido');
        res.redirect('/coach/matches');
    }
};

// ============== ACTUALIZAR PARTIDO ==============
export const updateMatch = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const { opponent, competition, date, time, location, home_team, result_home, result_away } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`✏️ Actualizando partido ID: ${id}`);
    
    if (!opponent || !competition || !date || !time || !location) {
        console.log('❌ Error: Campos obligatorios faltantes');
        req.flash('error', '⚠️ Todos los campos son obligatorios');
        return res.redirect('/coach/matches');
    }
    
    try {
        // Verificar que el partido existe
        const checkResult = await pool.query(
            'SELECT id, created_by FROM matches WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Partido ${id} no encontrado`);
            req.flash('error', '❌ El partido no existe');
            return res.redirect('/coach/matches');
        }
        
        // Verificar permisos
        const createdBy = checkResult.rows[0].created_by;
        if (createdBy !== userId && (req as any).user?.role !== 'admin') {
            console.log(`⚠️ Usuario ${userId} no tiene permiso para editar partido ${id}`);
            req.flash('error', '⚠️ No tienes permiso para editar este partido');
            return res.redirect('/coach/matches');
        }
        
        // Validar resultados
        let finalResultHome = result_home || null;
        let finalResultAway = result_away || null;
        
        if (result_home !== undefined && result_home !== '') {
            finalResultHome = parseInt(result_home);
            if (isNaN(finalResultHome) || finalResultHome < 0) {
                finalResultHome = null;
            }
        }
        
        if (result_away !== undefined && result_away !== '') {
            finalResultAway = parseInt(result_away);
            if (isNaN(finalResultAway) || finalResultAway < 0) {
                finalResultAway = null;
            }
        }
        
        await pool.query(
            `UPDATE matches 
             SET opponent = $1, 
                 competition = $2, 
                 date = $3, 
                 time = $4, 
                 location = $5, 
                 home_team = $6, 
                 result_home = $7, 
                 result_away = $8,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $9`,
            [opponent.trim(), competition.trim(), date, time, location.trim(), 
             home_team === 'on', finalResultHome, finalResultAway, id]
        );
        
        console.log(`✅ Partido ${id} actualizado correctamente`);
        req.flash('success', '✅ Partido actualizado correctamente');
        res.redirect('/coach/matches');
    } catch (error) {
        console.error(`❌ Error al actualizar partido ${id}:`, error);
        req.flash('error', '❌ Error al actualizar el partido');
        res.redirect('/coach/matches');
    }
};

// ============== ELIMINAR PARTIDO ==============
export const deleteMatch = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`🗑️ Eliminando partido ID: ${id}`);
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de partido inválido');
        return res.redirect('/coach/matches');
    }
    
    try {
        // Verificar que el partido existe
        const checkResult = await pool.query(
            'SELECT id, created_by FROM matches WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Partido ${id} no encontrado`);
            req.flash('error', '❌ El partido no existe');
            return res.redirect('/coach/matches');
        }
        
        // Verificar permisos
        const createdBy = checkResult.rows[0].created_by;
        if (createdBy !== userId && (req as any).user?.role !== 'admin') {
            console.log(`⚠️ Usuario ${userId} no tiene permiso para eliminar partido ${id}`);
            req.flash('error', '⚠️ No tienes permiso para eliminar este partido');
            return res.redirect('/coach/matches');
        }
        
        // Eliminar partido
        await pool.query('DELETE FROM matches WHERE id = $1', [id]);
        
        console.log(`✅ Partido ${id} eliminado correctamente`);
        req.flash('success', '✅ Partido eliminado correctamente');
        res.redirect('/coach/matches');
    } catch (error) {
        console.error(`❌ Error al eliminar partido ${id}:`, error);
        req.flash('error', '❌ Error al eliminar el partido');
        res.redirect('/coach/matches');
    }
};

// ============== OBTENER PARTIDO POR ID (API) ==============
export const getMatchById = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    
    console.log(`📋 Obteniendo partido ID: ${id}`);
    
    try {
        const result = await pool.query(`
            SELECT 
                id,
                opponent,
                competition,
                date,
                time,
                location,
                home_team,
                result_home,
                result_away,
                created_by,
                created_at
            FROM matches 
            WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            console.log(`❌ Partido ${id} no encontrado`);
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        
        console.log(`✅ Partido ${id} encontrado`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Error al obtener partido ${id}:`, error);
        res.status(500).json({ error: 'Error al obtener el partido' });
    }
};

// ============== OBTENER PARTIDOS PRÓXIMOS ==============
export const getUpcomingMatches = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo partidos próximos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                id,
                opponent,
                competition,
                date,
                time,
                location,
                home_team
            FROM matches 
            WHERE date >= CURRENT_DATE 
            ORDER BY date ASC 
            LIMIT 10
        `);
        
        console.log(`✅ ${result.rows.length} partidos próximos encontrados`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener partidos próximos:', error);
        res.status(500).json({ error: 'Error al obtener partidos próximos' });
    }
};

// ============== ACTUALIZAR RESULTADO DE PARTIDO ==============
export const updateMatchResult = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const { result_home, result_away } = req.body;
    
    console.log(`📝 Actualizando resultado del partido ID: ${id}`);
    console.log(`📊 Resultado: ${result_home} - ${result_away}`);
    
    if (result_home === undefined || result_away === undefined) {
        console.log('❌ Error: Resultados faltantes');
        return res.status(400).json({ error: 'Los resultados son obligatorios' });
    }
    
    const homeScore = parseInt(result_home);
    const awayScore = parseInt(result_away);
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        console.log('❌ Error: Resultados inválidos');
        return res.status(400).json({ error: 'Los resultados deben ser números válidos' });
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id FROM matches WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Partido ${id} no encontrado`);
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        
        await pool.query(
            `UPDATE matches 
             SET result_home = $1, 
                 result_away = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [homeScore, awayScore, id]
        );
        
        console.log(`✅ Resultado del partido ${id} actualizado: ${homeScore} - ${awayScore}`);
        res.json({ 
            success: true, 
            message: 'Resultado actualizado correctamente',
            result: { home: homeScore, away: awayScore }
        });
    } catch (error) {
        console.error(`❌ Error al actualizar resultado ${id}:`, error);
        res.status(500).json({ error: 'Error al actualizar el resultado' });
    }
};

// ============== OBTENER PARTIDOS PASADOS ==============
export const getPastMatches = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo partidos pasados...');
    
    try {
        const result = await pool.query(`
            SELECT 
                m.*,
                u.full_name as created_by_name
            FROM matches m
            LEFT JOIN users u ON m.created_by = u.id 
            WHERE m.date < CURRENT_DATE
            ORDER BY m.date DESC
            LIMIT 20
        `);
        
        console.log(`✅ ${result.rows.length} partidos pasados encontrados`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener partidos pasados:', error);
        res.status(500).json({ error: 'Error al obtener partidos pasados' });
    }
};

// ============== CANCELAR PARTIDO ==============
export const cancelMatch = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`🚫 Cancelando partido ID: ${id}`);
    
    try {
        const checkResult = await pool.query(
            'SELECT id, created_by FROM matches WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        
        const match = checkResult.rows[0];
        if (match.created_by !== userId && (req as any).user?.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para cancelar este partido' });
        }
        
        await pool.query('DELETE FROM matches WHERE id = $1', [id]);
        
        console.log(`✅ Partido ${id} cancelado`);
        res.json({ success: true, message: 'Partido cancelado correctamente' });
    } catch (error) {
        console.error(`❌ Error al cancelar partido ${id}:`, error);
        res.status(500).json({ error: 'Error al cancelar partido' });
    }
};

// ============== OBTENER PARTIDOS POR RANGO DE FECHAS ==============
export const getMatchesByDateRange = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    console.log(`📋 Obteniendo partidos entre ${startDate} y ${endDate}`);
    
    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Se requieren startDate y endDate' });
        }
        
        const result = await pool.query(`
            SELECT 
                m.*,
                u.full_name as created_by_name
            FROM matches m
            LEFT JOIN users u ON m.created_by = u.id 
            WHERE m.date >= $1 AND m.date <= $2
            ORDER BY m.date ASC
        `, [startDate, endDate]);
        
        console.log(`✅ ${result.rows.length} partidos encontrados en el rango`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener partidos por rango:', error);
        res.status(500).json({ error: 'Error al obtener partidos' });
    }
};

// ============== OBTENER ESTADÍSTICAS DE PARTIDOS ==============
export const getMatchStatistics = async (req: Request, res: Response) => {
    console.log('📊 Obteniendo estadísticas de partidos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_matches,
                COUNT(CASE WHEN result_home IS NOT NULL THEN 1 END) as played_matches,
                COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) as upcoming_matches,
                COUNT(CASE WHEN result_home > result_away THEN 1 END) as wins,
                COUNT(CASE WHEN result_home < result_away THEN 1 END) as losses,
                COUNT(CASE WHEN result_home = result_away AND result_home IS NOT NULL THEN 1 END) as draws,
                COALESCE(SUM(result_home), 0) as total_goals_for,
                COALESCE(SUM(result_away), 0) as total_goals_against
            FROM matches
            WHERE home_team = true
        `);
        
        res.json(result.rows[0] || { 
            total_matches: 0, 
            played_matches: 0, 
            upcoming_matches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            total_goals_for: 0,
            total_goals_against: 0
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};