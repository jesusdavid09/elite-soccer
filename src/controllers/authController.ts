import { Request, Response } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken } from '../utils/jwt';

// ============== MOSTRAR LOGIN ==============
export const showLogin = (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user) {
        // CORRECCIÓN: Si es jugador, verificar que esté aprobado antes de mandarlo al dashboard
        if (user.role === 'coach') {
            return res.redirect('/coach/dashboard');
        } else if (user.role === 'player' && user.approved) {
            return res.redirect('/player/dashboard');
        }
        // Si no está aprobado, dejamos que vea la pantalla para que entienda su estado
    }
    
    res.render('auth/login', { 
        title: 'Iniciar Sesión', 
        error: (req as any).flash?.('error') || null, 
        success: (req as any).flash?.('success') || null 
    });
};

// ============== MOSTRAR REGISTRO ==============
export const showRegister = (req: Request, res: Response) => {
    const user = (req as any).user;
    if (user) {
        if (user.role === 'coach') {
            return res.redirect('/coach/dashboard');
        } else if (user.role === 'player' && user.approved) {
            return res.redirect('/player/dashboard');
        }
    }
    
    res.render('auth/register', { 
        title: 'Registro', 
        error: (req as any).flash?.('error') || null,
        success: (req as any).flash?.('success') || null
    });
};

// ============== INICIAR SESIÓN ==============
export const login = async (req: Request, res: Response) => {
    const { email, password, remember } = req.body;
    
    console.log(`🔐 Intento de login: ${email}`);
    
    if (!email || !password) {
        console.log('❌ Email o contraseña vacíos');
        return res.render('auth/login', { 
            title: 'Iniciar Sesión', 
            error: '⚠️ Todos los campos son obligatorios', 
            success: null 
        });
    }
    
    try {
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
        
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            console.log(`❌ Contraseña incorrecta para: ${email}`);
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '❌ Credenciales incorrectas', 
                success: null 
            });
        }
        
        // CORRECCIÓN: Si no está aprobado, se corta el flujo aquí de forma segura
        if (user.role === 'player' && !user.approved) {
            console.log(`⏳ Usuario pendiente de aprobación: ${email}`);
            return res.render('auth/login', { 
                title: 'Iniciar Sesión', 
                error: '⏳ Cuenta pendiente de aprobación por el entrenador', 
                success: null 
            });
        }
        
        // El token ahora guarda también el estado 'approved' para consistencia del middleware
        const token = generateToken({ 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            full_name: user.full_name,
            approved: user.approved 
        });
        
        const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        res.cookie('token', token, { 
            httpOnly: true, 
            maxAge: maxAge,
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

// ============== REGISTRAR USUARIO ==============
export const register = async (req: Request, res: Response) => {
    console.log('📝 ===== INICIO DE REGISTRO =====');
    
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
    
    // Función interna para ahorrar código repetitivo al renderizar errores en el registro
    const renderRegisterError = (msg: string) => {
        return res.render('auth/register', { 
            title: 'Registro', 
            error: msg,
            success: null
        });
    };
    
    try {
        // ========== VALIDACIONES ==========
        if (!email || !password || !full_name || !role) {
            console.log('❌ Campos obligatorios faltantes');
            return renderRegisterError('⚠️ Todos los campos obligatorios deben ser completados');
        }
        
        if (!terms) {
            console.log('❌ Términos no aceptados');
            return renderRegisterError('⚠️ Debes aceptar los términos y condiciones');
        }
        
        if (password.length < 6) {
            console.log('❌ Contraseña demasiado corta');
            return renderRegisterError('⚠️ La contraseña debe tener al menos 6 caracteres');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Email inválido');
            return renderRegisterError('⚠️ El correo electrónico no es válido');
        }
        
        // ========== VERIFICAR EMAIL EXISTENTE ==========
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );
        
        if (existingUser.rows.length > 0) {
            console.log(`❌ Email ya registrado: ${email}`);
            return renderRegisterError('⚠️ El email ya está registrado. Inicia sesión o usa otro email.');
        }
        
        // ========== VERIFICAR CLAVE DE ENTRENADOR ==========
        if (role === 'coach') {
            const secretKey = process.env.COACH_SECRET_KEY || 'elite_soccer_2024';
            
            if (!coach_key) {
                console.log('❌ Clave de entrenador no proporcionada');
                return renderRegisterError('⚠️ Debes ingresar la clave de entrenador');
            }
            
            if (coach_key !== secretKey) {
                console.log(`❌ Clave de entrenador incorrecta`);
                return renderRegisterError('⚠️ Clave de entrenador incorrecta');
            }
        }
        
        // ========== VALIDAR CAMPOS DE JUGADOR ==========
        if (role === 'player') {
            if (!jersey_number) {
                return renderRegisterError('⚠️ El número de camiseta es obligatorio');
            }
            
            const jerseyNum = parseInt(jersey_number);
            if (isNaN(jerseyNum) || jerseyNum < 1 || jerseyNum > 99) {
                return renderRegisterError('⚠️ El número de camiseta debe estar entre 1 y 99');
            }
            
            if (!position) {
                return renderRegisterError('⚠️ La posición es obligatoria');
            }
        }
        
        // ========== CREAR USUARIO ==========
        const hashedPassword = await hashPassword(password);
        
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, approved) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [email.toLowerCase().trim(), hashedPassword, full_name.trim(), role, role === 'coach']
        );
        
        const userId = userResult.rows[0].id;
        
        // ========== CREAR JUGADOR PERFIL Y ESTADÍSTICAS ==========
        if (role === 'player') {
            const playerResult = await pool.query(
                `INSERT INTO players (user_id, jersey_number, position, age, phone, status) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id`,
                [userId, parseInt(jersey_number), position, age ? parseInt(age) : null, phone || null, 'pending']
            );
            
            const playerId = playerResult.rows[0].id;
            
            await pool.query(
                `INSERT INTO statistics (player_id, season) VALUES ($1, $2)`,
                [playerId, new Date().getFullYear().toString()]
            );
        }
        
        console.log(`✅ Registro exitoso: ${full_name} (${role})`);
        console.log('📝 ===== FIN DE REGISTRO =====');
        
        // ========== REDIRECCIÓN CON ÉXITO ==========
        return res.render('auth/login', { 
            title: 'Iniciar Sesión', 
            error: null, 
            success: role === 'coach' 
                ? '✅ Cuenta de entrenador creada exitosamente. ¡Ya puedes iniciar sesión!' 
                : '✅ Registro exitoso. Tu cuenta está pendiente de aprobación por el entrenador.'
        });
        
    } catch (error: any) {
        console.error('❌ ===== ERROR EN REGISTRO =====', error.message);
        
        if (error.code === '23505') {
            return renderRegisterError('⚠️ El email ya está registrado. Por favor, usa otro email o inicia sesión.');
        }
        if (error.code === '23503' || error.code === '42P01') {
            return renderRegisterError('⚠️ Error de estructura en la base de datos. Contacta al administrador.');
        }
        
        return renderRegisterError('❌ Error en el servidor. Por favor, intenta nuevamente más tarde.');
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
                role: user.role,
                approved: user.approved
            } 
        });
    }
    res.json({ authenticated: false });
};

// ============== OBTENER PERFIL DE USUARIO ==============
export const getProfile = async (req: Request, res: Response) => {
    // CORRECCIÓN: Castear id a número para evitar roturas de tipos con Postgres
    const userId = Number((req as any).user?.id);
    
    if (isNaN(userId)) {
        return res.status(401).json({ error: 'Usuario no autenticado o ID inválido' });
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

// ============== VERIFICAR CONEXIÓN A BASE DE DATOS ==============
export const testDatabase = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW() as time');
        res.json({ 
            success: true, 
            message: 'Conexión a base de datos exitosa',
            time: result.rows[0].time
        });
    } catch (error) {
        console.error('❌ Error de conexión a BD:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error de conexión a la base de datos' 
        });
    }
};