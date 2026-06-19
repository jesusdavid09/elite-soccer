import { Request, Response } from 'express';
import pool from '../config/database';

export const getCoachDashboard = async (req: Request, res: Response) => {
    try {
        const [players, trainings, matches, announcements, upcomingTrainings, upcomingMatches, latestAnnouncements, pendingCount] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM players'),
            pool.query('SELECT COUNT(*) FROM trainings'),
            pool.query('SELECT COUNT(*) FROM matches'),
            pool.query('SELECT COUNT(*) FROM announcements'),
            pool.query(`SELECT * FROM trainings WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 5`),
            pool.query(`SELECT * FROM matches WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 5`),
            pool.query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`),
            pool.query(`SELECT COUNT(*) FROM players WHERE status = $1`, ['pending'])
        ]);
        
        res.render('coach/dashboard', {
            title: 'Dashboard',
            stats: {
                players: parseInt(players.rows[0].count),
                trainings: parseInt(trainings.rows[0].count),
                matches: parseInt(matches.rows[0].count),
                announcements: parseInt(announcements.rows[0].count)
            },
            upcomingTrainings: upcomingTrainings.rows,
            upcomingMatches: upcomingMatches.rows,
            latestAnnouncements: latestAnnouncements.rows,
            pendingCount: parseInt(pendingCount.rows[0].count || '0'), // 🔥 NUEVO
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
            pendingCount: 0, // 🔥 NUEVO
            user: (req as any).user
        });
    }
};

export const getPlayerDashboard = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
    try {
        const playerResult = await pool.query(`
            SELECT p.*, u.full_name, u.email FROM players p
            JOIN users u ON p.user_id = u.id WHERE u.id = $1
        `, [userId]);
        
        const player = playerResult.rows[0];
        const [trainings, matches, announcements] = await Promise.all([
            pool.query(`SELECT * FROM trainings WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 5`),
            pool.query(`SELECT * FROM matches WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 5`),
            pool.query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`)
        ]);
        
        res.render('player/dashboard', {
            title: 'Mi Panel',
            player: player || null,
            upcomingTrainings: trainings.rows,
            upcomingMatches: matches.rows,
            latestAnnouncements: announcements.rows,
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
            user: (req as any).user
        });
    }
};