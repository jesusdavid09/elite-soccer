import { Request, Response } from 'express';
import pool from '../config/database';

// ============== OBTENER PARTIDOS ==============
export const getMatches = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo lista de partidos...');
    
    try {
        const result = await pool.query(`
            SELECT 
                m.id, m.opponent, m.competition, m.date, m.time, m.location, m.home_team,
                m.result_home, m.result_away, m.created_at, m.created_by,
                u.full_name as created_by_name
            FROM matches m
            LEFT JOIN users u ON m.created_by = u.id 
            ORDER BY m.date DESC
        `);
        
        console.log(`✅ ${result.rows.length} partidos encontrados`);
        
        res.render('coach/matches', { 
            title: 'Partidos', 
            matches: result.rows, 
            user: req.user, // Ya no requiere 'as any' si extiendes el tipo
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener partidos:', error);
        res.render('coach/matches', { 
            title: 'Partidos', 
            matches: [], 
            user: req.user,
            pendingCount: res.locals?.pendingCount || 0
        });
    }
};

// ============== CREAR PARTIDO ==============
export const createMatch = async (req: Request, res: Response) => {
    const { opponent, competition, date, time, location, home_team } = req.body;
    const userId = req.user?.id;
    
    console.log(`📝 Creando nuevo partido vs ${opponent}...`);
    
    if (!opponent || !competition || !date || !time || !location) {
        req.flash('error', '⚠️ Todos los campos son obligatorios');
        return res.redirect('/coach/matches');
    }
    
    if (!userId) {
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
    const { id } = req.params;
    const { opponent, competition, date, time, location, home_team, result_home, result_away } = req.body;
    const userId = req.user?.id;
    
    if (!opponent || !competition || !date || !time || !location) {
        req.flash('error', '⚠️ Todos los campos son obligatorios');
        return res.redirect('/coach/matches');
    }
    
    try {
        const checkResult = await pool.query('SELECT created_by FROM matches WHERE id = $1', [id]);
        
        if (checkResult.rows.length === 0) {
            req.flash('error', '❌ El partido no existe');
            return res.redirect('/coach/matches');
        }
        
        const createdBy = checkResult.rows[0].created_by;
        if (createdBy !== userId && req.user?.role !== 'admin') {
            req.flash('error', '⚠️ No tienes permiso para editar este partido');
            return res.redirect('/coach/matches');
        }
        
        // Sanitización limpia de los goles
        const finalResultHome = (result_home !== undefined && result_home !== '') ? parseInt(result_home, 10) : null;
        const finalResultAway = (result_away !== undefined && result_away !== '') ? parseInt(result_away, 10) : null;
        
        await pool.query(
            `UPDATE matches 
             SET opponent = $1, competition = $2, date = $3, time = $4, location = $5, 
                 home_team = $6, result_home = $7, result_away = $8, updated_at = CURRENT_TIMESTAMP
             WHERE id = $9`,
            [
                opponent.trim(), competition.trim(), date, time, location.trim(), 
                home_team === 'on', 
                isNaN(Number(finalResultHome)) ? null : finalResultHome, 
                isNaN(Number(finalResultAway)) ? null : finalResultAway, 
                id
            ]
        );
        
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
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!id || id === 'undefined' || id === 'null') {
        req.flash('error', '❌ ID de partido inválido');
        return res.redirect('/coach/matches');
    }
    
    try {
        const checkResult = await pool.query('SELECT created_by FROM matches WHERE id = $1', [id]);
        
        if (checkResult.rows.length === 0) {
            req.flash('error', '❌ El partido no existe');
            return res.redirect('/coach/matches');
        }
        
        if (checkResult.rows[0].created_by !== userId && req.user?.role !== 'admin') {
            req.flash('error', '⚠️ No tienes permiso para eliminar este partido');
            return res.redirect('/coach/matches');
        }
        
        await pool.query('DELETE FROM matches WHERE id = $1', [id]);
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
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Error al obtener partido ${id}:`, error);
        res.status(500).json({ error: 'Error al obtener el partido' });
    }
};

// ============== OBTENER PARTIDOS PRÓXIMOS ==============
export const getUpcomingMatches = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, opponent, competition, date, time, location, home_team FROM matches WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 10'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener partidos próximos:', error);
        res.status(500).json({ error: 'Error al obtener partidos próximos' });
    }
};

// ============== ACTUALIZAR RESULTADO DE PARTIDO ==============
export const updateMatchResult = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { result_home, result_away } = req.body;
    
    const homeScore = parseInt(result_home, 10);
    const awayScore = parseInt(result_away, 10);
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        return res.status(400).json({ error: 'Los resultados deben ser números válidos y positivos' });
    }
    
    try {
        const result = await pool.query(
            `UPDATE matches 
             SET result_home = $1, result_away = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING id`,
            [homeScore, awayScore, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        
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
    try {
        const result = await pool.query(`
            SELECT m.*, u.full_name as created_by_name FROM matches m
            LEFT JOIN users u ON m.created_by = u.id 
            WHERE m.date < CURRENT_DATE ORDER BY m.date DESC LIMIT 20
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener partidos pasados:', error);
        res.status(500).json({ error: 'Error al obtener partidos pasados' });
    }
};

// ============== CANCELAR (ELIMINAR) PARTIDO ==============
export const cancelMatch = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    try {
        const checkResult = await pool.query('SELECT created_by FROM matches WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado' });
        }
        
        if (checkResult.rows[0].created_by !== userId && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para cancelar este partido' });
        }
        
        await pool.query('DELETE FROM matches WHERE id = $1', [id]);
        res.json({ success: true, message: 'Partido cancelado correctamente' });
    } catch (error) {
        console.error(`❌ Error al cancelar partido ${id}:`, error);
        res.status(500).json({ error: 'Error al cancelar partido' });
    }
};

// ============== OBTENER PARTIDOS POR RANGO DE FECHAS ==============
export const getMatchesByDateRange = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Se requieren startDate y endDate' });
    }
    
    try {
        const result = await pool.query(`
            SELECT m.*, u.full_name as created_by_name FROM matches m
            LEFT JOIN users u ON m.created_by = u.id 
            WHERE m.date >= $1 AND m.date <= $2 ORDER BY m.date ASC
        `, [startDate, endDate]);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener partidos por rango:', error);
        res.status(500).json({ error: 'Error al obtener partidos' });
    }
};

// ============== OBTENER ESTADÍSTICAS DE PARTIDOS (CORREGIDO) ==============
export const getMatchStatistics = async (req: Request, res: Response) => {
    console.log('📊 Obteniendo estadísticas globales de partidos...');
    
    try {
        // Esta query calcula victorias, derrotas y goles sin importar si eres local o visitante.
        // Asume que "nuestro equipo" es el que evalúa las estadísticas.
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_matches,
                COUNT(CASE WHEN result_home IS NOT NULL AND result_away IS NOT NULL THEN 1 END) as played_matches,
                COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) as upcoming_matches,
                
                -- Victorias: Si eres local y ganas, o si eres visitante y ganas.
                COUNT(CASE 
                    WHEN (home_team = true AND result_home > result_away) OR (home_team = false AND result_away > result_home) THEN 1 
                END) as wins,
                
                -- Derrotas: Si eres local y pierdes, o si eres visitante y pierdes.
                COUNT(CASE 
                    WHEN (home_team = true AND result_home < result_away) OR (home_team = false AND result_away < result_home) THEN 1 
                END) as losses,
                
                -- Empates
                COUNT(CASE WHEN result_home = result_away AND result_home IS NOT NULL THEN 1 END) as draws,
                
                -- Goles a favor y en contra dinámicos
                SUM(CASE WHEN home_team = true THEN result_home ELSE result_away END) as total_goals_for,
                SUM(CASE WHEN home_team = true THEN result_away ELSE result_home END) as total_goals_against
            FROM matches
        `);
        
        const stats = result.rows[0];
        res.json({
            total_matches: parseInt(stats.total_matches, 10) || 0,
            played_matches: parseInt(stats.played_matches, 10) || 0,
            upcoming_matches: parseInt(stats.upcoming_matches, 10) || 0,
            wins: parseInt(stats.wins, 10) || 0,
            losses: parseInt(stats.losses, 10) || 0,
            draws: parseInt(stats.draws, 10) || 0,
            total_goals_for: parseInt(stats.total_goals_for, 10) || 0,
            total_goals_against: parseInt(stats.total_goals_against, 10) || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};