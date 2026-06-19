import { Request, Response } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';

export const showLogin = (req: Request, res: Response) => {
    res.render('auth/login', { title: 'Iniciar Sesión', error: null, success: null });
};

export const showRegister = (req: Request, res: Response) => {
    res.render('auth/register', { title: 'Registro', error: null });
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.render('auth/login', { title: 'Iniciar Sesión', error: 'Credenciales incorrectas', success: null });
        }
        
        const user = result.rows[0];
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.render('auth/login', { title: 'Iniciar Sesión', error: 'Credenciales incorrectas', success: null });
        }
        
        if (!user.approved) {
            return res.render('auth/login', { title: 'Iniciar Sesión', error: 'Cuenta pendiente de aprobación', success: null });
        }
        
        const token = generateToken({ id: user.id, email: user.email, role: user.role, full_name: user.full_name });
        res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        
        if (user.role === 'coach') {
            res.redirect('/coach/dashboard');
        } else {
            res.redirect('/player/dashboard');
        }
    } catch (error) {
        console.error(error);
        res.render('auth/login', { title: 'Iniciar Sesión', error: 'Error en el servidor', success: null });
    }
};

export const register = async (req: Request, res: Response) => {
    const { email, password, full_name, role, coach_key, jersey_number, position, age, phone } = req.body;
    
    try {
        if (role === 'coach' && coach_key !== process.env.COACH_SECRET_KEY) {
            return res.render('auth/register', { title: 'Registro', error: 'Clave de entrenador incorrecta' });
        }
        
        const hashedPassword = await hashPassword(password);
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, approved) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [email, hashedPassword, full_name, role, role === 'coach']
        );
        
        const userId = userResult.rows[0].id;
        
        if (role === 'player' && jersey_number && position && age) {
            const playerResult = await pool.query(
                `INSERT INTO players (user_id, jersey_number, position, age, phone) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [userId, jersey_number, position, age, phone || null]
            );
            if (playerResult.rows[0]) {
                await pool.query(`INSERT INTO statistics (player_id, season) VALUES ($1, '2024')`, [playerResult.rows[0].id]);
            }
        }
        
        if (role === 'coach') {
            res.render('auth/login', { title: 'Iniciar Sesión', error: null, success: '✅ Cuenta de entrenador creada' });
        } else {
            res.render('auth/login', { title: 'Iniciar Sesión', error: null, success: '✅ Registro exitoso. Espera aprobación.' });
        }
    } catch (error: any) {
        if (error.code === '23505') {
            res.render('auth/register', { title: 'Registro', error: 'El email ya está registrado' });
        } else {
            console.error(error);
            res.render('auth/register', { title: 'Registro', error: 'Error en el servidor' });
        }
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('token');
    res.redirect('/login');
};