import { Request, Response } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';

// ============== MOSTRAR LOGIN ==============
export const showLogin = (req: Request, res: Response) => {
    // Si ya está autenticado, redirigir al dashboard correspondiente
    const user = (req as any).user;
    if (user) {
        if (user.role === 'coach') {
            return res.redirect('/coach/dashboard');
        } else {
            return res.redirect('/player/dashboard');
        }
    }
    
    res.render('auth/login', { 
        title: 'Iniciar Sesión', 
        error: req.flash?.('error') || null, 
        success: req.flash?.('success') || null 
    });
};

// ============== MOSTRAR REGISTRO ==============
export const showRegister = (req: Request, res: Response) => {
    // Si ya está autenticado, redirigir al dashboard correspondiente
    const user = (req as any).user;
    if (user) {
        if (user.role === 'coach') {
            return res.redirect('/coach/dashboard');
        } else {
            return res.redirect('/player/dashboard');
        }
    }
    
    res.render('auth/register', { 
        title: 'Registro', 
        error: req.flash?.('error') || null,
        success: req.flash?.('success') || null
    });
};

// ============== INICIAR SESIÓN ==============
export const login = async (req: Request, res: Response) => {
    const { email, password, remember } = req.body;
    
    console.log(`🔐 Intento de login: ${email}`);
    
    // Validar campos
    if (!email || !password) {
        console.log('❌ Email o contraseña vacíos');
        return res.render('auth/login', { 
            title: 'Iniciar Sesión', 
            error: '⚠️ Todos los campos son obligatorios', 
            success: null 
        });
    }
    
    try {
        // Buscar usuario por email
        const result = await pool.query(
            `SELECT id, email, password_hash, full_name, role, approved, created_at 
             FROM users WHERE email = $1`,
            [email.toLowerCase().trim()]
        );
        
        if (result.rows.length === 0) {
            console.log(`❌ Usuario no encontrado: ${email}`);
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '❌ Credenciales incorrectas', 
                success: null 
            });
        }
        
        const user = result.rows[0];
        console.log(`👤 Usuario encontrado: ${user.full_name} (${user.role})`);
        
        // Verificar contraseña
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            console.log(`❌ Contraseña incorrecta para: ${email}`);
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '❌ Credenciales incorrectas', 
                success: null 
            });
        }
        
        // Verificar aprobación (solo para jugadores)
        if (user.role === 'player' && !user.approved) {
            console.log(`⏳ Usuario pendiente de aprobación: ${email}`);
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '⏳ Cuenta pendiente de aprobación por el entrenador', 
                success: null 
            });
        }
        
        // Generar token
        const token = generateToken({ 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            full_name: user.full_name 
        });
        
        // Configurar cookie
        const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 días o 7 días
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: maxAge,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        
        console.log(`✅ Login exitoso: ${user.full_name} (${user.role})`);
        
        // Redirigir según rol
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

// ============== REGISTRAR USUARIO ==============
export const register = async (req: Request, res: Response) => {
    const { 
        email, 
        password, 
        full_name, 
        role, 
        coach_key, 
        jersey_number, 
        position, 
        age, 
        phone,
        terms 
    } = req.body;
    
    console.log(`📝 Nuevo registro: ${email} (${role})`);
    
    // Validaciones
    if (!email || !password || !full_name || !role) {
        console.log('❌ Campos obligatorios faltantes');
        return res.render('auth/register', { 
            title: 'Registro', 
            error: '⚠️ Todos los campos obligatorios deben ser completados' 
        });
    }
    
    if (!terms) {
        console.log('❌ Términos no aceptados');
        return res.render('auth/register', { 
            title: 'Registro', 
            error: '⚠️ Debes aceptar los términos y condiciones' 
        });
    }
    
    if (password.length < 6) {
        console.log('❌ Contraseña demasiado corta');
        return res.render('auth/register', { 
            title: 'Registro', 
            error: '⚠️ La contraseña debe tener al menos 6 caracteres' 
        });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Email inválido');
        return res.render('auth/register', { 
            title: 'Registro', 
            error: '⚠️ El correo electrónico no es válido' 
        });
    }
    
    try {
        // Verificar si el email ya existe
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );
        
        if (existingUser.rows.length > 0) {
            console.log(`❌ Email ya registrado: ${email}`);
            return res.render('auth/register', { 
                title: 'Registro', 
                error: '⚠️ El email ya está registrado. Inicia sesión o usa otro email.' 
            });
        }
        
        // Verificar clave de entrenador
        if (role === 'coach') {
            const secretKey = process.env.COACH_SECRET_KEY || 'default_secret_key';
            if (!coach_key || coach_key !== secretKey) {
                console.log(`❌ Clave de entrenador incorrecta para: ${email}`);
                return res.render('auth/register', { 
                    title: 'Registro', 
                    error: '⚠️ Clave de entrenador incorrecta' 
                });
            }
            console.log(`✅ Clave de entrenador verificada para: ${email}`);
        }
        
        // Hash de la contraseña
        const hashedPassword = await hashPassword(password);
        
        // Insertar usuario
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, approved) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [email.toLowerCase().trim(), hashedPassword, full_name.trim(), role, role === 'coach']
        );
        
        const userId = userResult.rows[0].id;
        console.log(`✅ Usuario creado con ID: ${userId}`);
        
        // Si es jugador, insertar en players
        if (role === 'player') {
            // Validar campos de jugador
            if (!jersey_number || !position) {
                console.log('❌ Datos de jugador incompletos');
                // Eliminar el usuario creado
                await pool.query('DELETE FROM users WHERE id = $1', [userId]);
                return res.render('auth/register', { 
                    title: 'Registro', 
                    error: '⚠️ Todos los datos deportivos son obligatorios para jugadores' 
                });
            }
            
            const playerResult = await pool.query(
                `INSERT INTO players (user_id, jersey_number, position, age, phone, status) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [userId, jersey_number, position, age || null, phone || null, 'pending']
            );
            
            const playerId = playerResult.rows[0].id;
            console.log(`✅ Jugador creado con ID: ${playerId}`);
            
            // Crear estadísticas iniciales
            await pool.query(
                `INSERT INTO statistics (player_id, season) VALUES ($1, $2)`,
                [playerId, new Date().getFullYear().toString()]
            );
            console.log(`✅ Estadísticas creadas para jugador: ${playerId}`);
        }
        
        console.log(`✅ Registro exitoso: ${full_name} (${role})`);
        
        // Mensaje según rol
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
        console.error('❌ Error en registro:', error);
        
        if (error.code === '23505') {
            return res.render('auth/register', { 
                title: 'Registro', 
                error: '⚠️ El email ya está registrado' 
            });
        }
        
        return res.render('auth/register', { 
            title: 'Registro', 
            error: '❌ Error en el servidor. Intenta nuevamente.' 
        });
    }
};

// ============== CERRAR SESIÓN ==============
export const logout = (req: Request, res: Response) => {
    console.log(`👋 Cerrando sesión: ${(req as any).user?.full_name || 'usuario'}`);
    res.clearCookie('token');
    res.redirect('/login');
};

// ============== VERIFICAR AUTENTICACIÓN ==============
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

// ============== OBTENER PERFIL DE USUARIO ==============
export const getProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
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