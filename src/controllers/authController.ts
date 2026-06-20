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

// ========== REGISTRO ==========
export const register = async (req: Request, res: Response) => {
    console.log('📝 Iniciando registro...');
    console.log('📝 Email:', req.body.email);
    console.log('📝 Rol:', req.body.role);
    
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
                error: '⚠️ Todos los campos son obligatorios' 
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
                error: '⚠️ Email inválido' 
            });
        }
        
        // Verificar email existente
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
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
                    error: '⚠️ Número y posición son obligatorios' 
                });
            }
            
            const jerseyNum = parseInt(jersey_number);
            if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
                return res.render('auth/register', { 
                    title: 'Registro', 
                    error: '⚠️ Número de camiseta inválido (1-99)' 
                });
            }
        }
        
        // Crear usuario
        const hashedPassword = await hashPassword(password);
        
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, approved) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [email.toLowerCase(), hashedPassword, full_name, role, role === 'coach']
        );
        
        const userId = userResult.rows[0].id;
        console.log(`✅ Usuario creado con ID: ${userId}`);
        
        // Crear jugador
        if (role === 'player') {
            await pool.query(
                `INSERT INTO players (user_id, jersey_number, position, age, phone, status) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, parseInt(jersey_number), position, age || null, phone || null, 'pending']
            );
            console.log('✅ Perfil de jugador creado');
        }
        
        console.log(`✅ Registro exitoso: ${full_name} (${role})`);
        
        const successMessage = role === 'coach' 
            ? '✅ Cuenta de entrenador creada. ¡Ya puedes iniciar sesión!' 
            : '✅ Registro exitoso. Tu cuenta está pendiente de aprobación.';
        
        return res.render('auth/login', { 
            title: 'Iniciar Sesión', 
            error: null, 
            success: successMessage 
        });
        
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
            error: `❌ Error: ${error.message}` 
        });
    }
};

// ========== LOGIN ==========
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    console.log(`🔐 Login: ${email}`);
    
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
            [email.toLowerCase()]
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
                error: '⏳ Cuenta pendiente de aprobación', 
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
            maxAge: 7 * 24 * 60 * 60 * 1000 
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
            error: '❌ Error en el servidor', 
            success: null 
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