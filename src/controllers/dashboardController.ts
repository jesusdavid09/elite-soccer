import { Request, Response } from 'express';
import pool from '../config/database';

// ============== DASHBOARD DEL ENTRENADOR ==============
export const getCoachDashboard = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    console.log(`📊 Cargando dashboard del entrenador (ID: ${userId})`);
    
    try {
        // Ejecutar todas las consultas en paralelo
        const [
            playersResult,
            trainingsResult,
            matchesResult,
            announcementsResult,
            upcomingTrainingsResult,
            upcomingMatchesResult,
            latestAnnouncementsResult,
            pendingCountResult,
            recentPlayersResult
        ] = await Promise.all([
            // Estadísticas
            pool.query('SELECT COUNT(*) as count FROM players'),
            pool.query('SELECT COUNT(*) as count FROM trainings'),
            pool.query('SELECT COUNT(*) as count FROM matches'),
            pool.query('SELECT COUNT(*) as count FROM announcements'),
            
            // Próximos eventos
            pool.query(`
                SELECT id, title, date, time, location 
                FROM trainings 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 5
            `),
            pool.query(`
                SELECT id, opponent, date, time, location, competition 
                FROM matches 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 5
            `),
            
            // Últimos anuncios
            pool.query(`
                SELECT a.id, a.title, a.content, a.created_at, u.full_name as author_name 
                FROM announcements a
                JOIN users u ON a.author_id = u.id 
                ORDER BY a.created_at DESC 
                LIMIT 5
            `),
            
            // Jugadores pendientes
            pool.query(`
                SELECT COUNT(*) as count 
                FROM players 
                WHERE status = $1
            `, ['pending']),
            
            // Últimos jugadores registrados
            pool.query(`
                SELECT 
                    p.id, 
                    p.jersey_number, 
                    p.position, 
                    p.status,
                    p.created_at,
                    u.full_name,
                    u.email
                FROM players p
                JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC 
                LIMIT 5
            `)
        ]);
        
        // Extraer datos
        const stats = {
            players: parseInt(playersResult.rows[0]?.count || '0'),
            trainings: parseInt(trainingsResult.rows[0]?.count || '0'),
            matches: parseInt(matchesResult.rows[0]?.count || '0'),
            announcements: parseInt(announcementsResult.rows[0]?.count || '0')
        };
        
        const pendingCount = parseInt(pendingCountResult.rows[0]?.count || '0');
        const upcomingTrainings = upcomingTrainingsResult.rows || [];
        const upcomingMatches = upcomingMatchesResult.rows || [];
        const latestAnnouncements = latestAnnouncementsResult.rows || [];
        const recentPlayers = recentPlayersResult.rows || [];
        
        console.log(`📊 Estadísticas: ${stats.players} jugadores, ${stats.trainings} entrenamientos, ${stats.matches} partidos`);
        console.log(`⏳ ${pendingCount} jugadores pendientes de aprobación`);
        
        res.render('coach/dashboard', {
            title: 'Dashboard',
            stats,
            upcomingTrainings,
            upcomingMatches,
            latestAnnouncements,
            recentPlayers,
            pendingCount,
            user: (req as any).user
        });
    } catch (error) {
        console.error('❌ Error en coach dashboard:', error);
        res.render('coach/dashboard', { 
            title: 'Dashboard', 
            stats: { players: 0, trainings: 0, matches: 0, announcements: 0 }, 
            upcomingTrainings: [], 
            upcomingMatches: [],
            latestAnnouncements: [],
            recentPlayers: [],
            pendingCount: 0,
            user: (req as any).user
        });
    }
};

// ============== DASHBOARD DEL JUGADOR ==============
export const getPlayerDashboard = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    console.log(`📊 Cargando dashboard del jugador (ID: ${userId})`);
    
    try {
        // Obtener información del jugador
        const playerResult = await pool.query(`
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
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id 
            WHERE u.id = $1
        `, [userId]);
        
        const player = playerResult.rows[0] || null;
        
        if (player) {
            console.log(`👤 Jugador encontrado: ${player.full_name} (${player.position})`);
        } else {
            console.log(`⚠️ No se encontró información de jugador para el usuario ${userId}`);
        }
        
        // Obtener eventos y anuncios en paralelo
        const [trainingsResult, matchesResult, announcementsResult, statisticsResult] = await Promise.all([
            pool.query(`
                SELECT id, title, date, time, location 
                FROM trainings 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 5
            `),
            pool.query(`
                SELECT id, opponent, date, time, location, competition 
                FROM matches 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 5
            `),
            pool.query(`
                SELECT a.id, a.title, a.content, a.created_at, u.full_name as author_name 
                FROM announcements a
                JOIN users u ON a.author_id = u.id 
                ORDER BY a.created_at DESC 
                LIMIT 5
            `),
            // Estadísticas del jugador
            player ? pool.query(`
                SELECT 
                    goals,
                    assists,
                    matches_played,
                    yellow_cards,
                    red_cards,
                    season
                FROM statistics 
                WHERE player_id = $1 
                ORDER BY season DESC 
                LIMIT 1
            `, [player.id]) : Promise.resolve({ rows: [] })
        ]);
        
        const upcomingTrainings = trainingsResult.rows || [];
        const upcomingMatches = matchesResult.rows || [];
        const latestAnnouncements = announcementsResult.rows || [];
        const statistics = statisticsResult.rows[0] || null;
        
        console.log(`📊 Eventos: ${upcomingTrainings.length} entrenamientos, ${upcomingMatches.length} partidos`);
        
        res.render('player/dashboard', {
            title: 'Mi Panel',
            player: player,
            upcomingTrainings,
            upcomingMatches,
            latestAnnouncements,
            statistics,
            user: (req as any).user
        });
    } catch (error) {
        console.error('❌ Error en player dashboard:', error);
        res.render('player/dashboard', {
            title: 'Mi Panel',
            player: null,
            upcomingTrainings: [],
            upcomingMatches: [],
            latestAnnouncements: [],
            statistics: null,
            user: (req as any).user
        });
    }
};

// ============== DASHBOARD DEL ENTRENADOR (API) ==============
export const getCoachDashboardData = async (req: Request, res: Response) => {
    try {
        const [statsResult, pendingResult, recentResult] = await Promise.all([
            pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM players) as players,
                    (SELECT COUNT(*) FROM trainings) as trainings,
                    (SELECT COUNT(*) FROM matches) as matches,
                    (SELECT COUNT(*) FROM announcements) as announcements
            `),
            pool.query('SELECT COUNT(*) as count FROM players WHERE status = $1', ['pending']),
            pool.query(`
                SELECT 
                    p.id, 
                    p.jersey_number, 
                    p.position, 
                    p.status,
                    u.full_name,
                    u.email
                FROM players p
                JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC 
                LIMIT 10
            `)
        ]);
        
        res.json({
            stats: statsResult.rows[0] || { players: 0, trainings: 0, matches: 0, announcements: 0 },
            pending: parseInt(pendingResult.rows[0]?.count || '0'),
            recentPlayers: recentResult.rows || []
        });
    } catch (error) {
        console.error('❌ Error en API de dashboard:', error);
        res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
};

// ============== DASHBOARD DEL JUGADOR (API) ==============
export const getPlayerDashboardData = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
    try {
        const playerResult = await pool.query(`
            SELECT 
                p.id,
                p.jersey_number,
                p.position,
                p.photo_url,
                u.full_name,
                u.email
            FROM players p
            JOIN users u ON p.user_id = u.id 
            WHERE u.id = $1
        `, [userId]);
        
        const player = playerResult.rows[0] || null;
        
        if (!player) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        
        const [trainings, matches, stats] = await Promise.all([
            pool.query(`
                SELECT id, title, date, time, location 
                FROM trainings 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 5
            `),
            pool.query(`
                SELECT id, opponent, date, time, location, competition 
                FROM matches 
                WHERE date >= CURRENT_DATE 
                ORDER BY date ASC 
                LIMIT 5
            `),
            pool.query(`
                SELECT 
                    goals,
                    assists,
                    matches_played,
                    season
                FROM statistics 
                WHERE player_id = $1 
                ORDER BY season DESC 
                LIMIT 1
            `, [player.id])
        ]);
        
        res.json({
            player,
            upcomingTrainings: trainings.rows || [],
            upcomingMatches: matches.rows || [],
            statistics: stats.rows[0] || null
        });
    } catch (error) {
        console.error('❌ Error en API de dashboard de jugador:', error);
        res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
};