import { Request, Response } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';

// ========== MOSTRAR LOGIN ==========
export const showLogin = (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user) {
        return user.role === 'coach' 
            ? res.redirect('/coach/dashboard') 
            : res.redirect('/player/dashboard');
    }
    
    res.render('auth/login', { 
        title: 'Iniciar Sesión', 
        error: null, 
        success: null 
    });
};

// ========== MOSTRAR REGISTRO ==========
export const showRegister = (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user) {
        return user.role === 'coach' 
            ? res.redirect('/coach/dashboard') 
            : res.redirect('/player/dashboard');
    }
    
    res.render('auth/register', { 
        title: 'Registro', 
        error: null 
    });
};

// ========== LOGIN ==========
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    console.log(`🔐 Intento de login: ${email}`);
    
    if (!email || !password) {
        return res.render('auth/login', { 
            title: 'Iniciar Sesión', 
            error: '⚠️ Todos los campos son obligatorios', 
            success: null 
        });
    }
    
    try {
        const result = await pool.query(
            `SELECT id, email, password_hash, full_name, role, approved 
             FROM users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );
        
        if (result.rows.length === 0) {
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '❌ Credenciales incorrectas', 
                success: null 
            });
        }
        
        const user = result.rows[0];
        const isValid = await comparePassword(password, user.password_hash);
        
        if (!isValid) {
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '❌ Credenciales incorrectas', 
                success: null 
            });
        }
        
        if (user.role === 'player' && !user.approved) {
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '⏳ Cuenta pendiente de aprobación por el entrenador', 
                success: null 
            });
        }
        
        const token = generateToken({ 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            full_name: user.full_name 
        });
        
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        
        console.log(`✅ Login exitoso: ${user.full_name} (${user.role})`);
        
        if (user.role === 'coach') {
            return res.redirect('/coach/dashboard');
        } else {
            return res.redirect('/player/dashboard');
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        return res.render('auth/login', { 
            title: 'Iniciar Sesión', 
            error: '❌ Error en el servidor. Intenta nuevamente.', 
            success: null 
        });
    }
};

// ========== REGISTRO ==========
export const register = async (req: Request, res: Response) => {
    console.log('📝 Iniciando registro...');
    console.log('📝 Datos recibidos:', {
        email: req.body.email,
        full_name: req.body.full_name,
        role: req.body.role
    });
    
    const { 
        email, 
        password, 
        full_name, 
        role, 
        coach_key, 
        jersey_number, 
        position, 
        age, 
        phone 
    } = req.body;
    
    try {
        // Validaciones
        if (!email || !password || !full_name) {
            return res.render('auth/register', { 
                title: 'Registro', 
                error: '⚠️ Todos los campos obligatorios deben ser completados' 
            });
        }
        
        if (password.length < 6) {
            return res.render('auth/register', { 
                title: 'Registro', 
                error: '⚠️ La contraseña debe tener al menos 6 caracteres' 
            });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('auth/register', { 
                title: 'Registro', 
                error: '⚠️ El correo electrónico no es válido' 
            });
        }
        
        // Verificar email existente
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );
        
        if (existingUser.rows.length > 0) {
            return res.render('auth/register', { 
                title: 'Registro', 
                error: '⚠️ El email ya está registrado' 
            });
        }
        
        // Validar coach
        if (role === 'coach') {
            const secretKey = process.env.COACH_SECRET_KEY || 'elite_soccer_2024';
            if (!coach_key || coach_key !== secretKey) {
                return res.render('auth/register', { 
                    title: 'Registro', 
                    error: '⚠️ Clave de entrenador incorrecta' 
                });
            }
        }
        
        // Validar jugador
        if (role === 'player') {
            if (!jersey_number || !position) {
                return res.render('auth/register', { 
                    title: 'Registro', 
                    error: '⚠️ Número y posición son obligatorios para jugadores' 
                });
            }
            
            const jerseyNum = parseInt(jersey_number);
            if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
                return res.render('auth/register', { 
                    title: 'Registro', 
                    error: '⚠️ El número de camiseta debe estar entre 1 y 99' 
                });
            }
        }
        
        // Crear usuario
        const hashedPassword = await hashPassword(password);
        
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, approved) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [email.toLowerCase().trim(), hashedPassword, full_name.trim(), role, role === 'coach']
        );
        
        const userId = userResult.rows[0].id;
        console.log(`✅ Usuario creado con ID: ${userId}`);
        
        // Crear jugador
        if (role === 'player') {
            const playerResult = await pool.query(
                `INSERT INTO players (user_id, jersey_number, position, age, phone, status) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id`,
                [userId, parseInt(jersey_number), position, age ? parseInt(age) : null, phone || null, 'pending']
            );
            
            const playerId = playerResult.rows[0].id;
            console.log(`✅ Jugador creado con ID: ${playerId}`);
            
            await pool.query(
                `INSERT INTO statistics (player_id, season) VALUES ($1, $2)`,
                [playerId, new Date().getFullYear().toString()]
            );
            console.log(`✅ Estadísticas creadas`);
        }
        
        console.log(`✅ Registro exitoso: ${full_name} (${role})`);
        
        if (role === 'coach') {
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: null, 
                success: '✅ Cuenta de entrenador creada exitosamente. ¡Ya puedes iniciar sesión!' 
            });
        } else {
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: null, 
                success: '✅ Registro exitoso. Tu cuenta está pendiente de aprobación por el entrenador.' 
            });
        }
    } catch (error: any) {
        console.error('❌ Error en registro:', error.message);
        
        if (error.code === '23505') {
            return res.render('auth/register', { 
                title: 'Registro', 
                error: '⚠️ El email ya está registrado' 
            });
        }
        
        return res.render('auth/register', { 
            title: 'Registro', 
            error: '❌ Error en el servidor. Por favor, intenta nuevamente.' 
        });
    }
};

// ========== LOGOUT ==========
export const logout = (req: Request, res: Response) => {
    console.log(`👋 Cerrando sesión`);
    res.clearCookie('token');
    res.redirect('/login');
};

// ========== VERIFICAR AUTENTICACIÓN (API) ==========
export const checkAuth = (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user) {
        return res.json({ 
            authenticated: true, 
            user: { 
                id: user.id, 
                full_name: user.full_name, 
                email: user.email, 
                role: user.role 
            } 
        });
    }
    res.json({ authenticated: false });
};

// ========== OBTENER PERFIL (API) ==========
export const getProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    
    try {
        const result = await pool.query(
            `SELECT id, full_name, email, role, approved, created_at 
             FROM users WHERE id = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};