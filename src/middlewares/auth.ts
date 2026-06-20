import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import pool from '../config/database';

// Opcional: Extendemos la interfaz Request de Express localmente para tener autocompletado nativo
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                full_name: string;
                role: string;
                approved: boolean;
            };
        }
    }
}

// ============== AUTENTICACIÓN PRINCIPAL ==============
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔐 Verificando autenticación para: ${req.url}`);
    
    // Obtener token de cookies o header Authorization
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        console.log('❌ Token no encontrado, redirigiendo a login');
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        return res.redirect('/login');
    }
    
    try {
        // Verificar token
        const decoded = verifyToken(token);
        if (!decoded) {
            console.log('❌ Token inválido o expirado');
            res.clearCookie('token');
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ error: 'Token inválido' });
            }
            return res.redirect('/login');
        }
        
        // Verificar que el usuario existe en la base de datos
        try {
            const userResult = await pool.query(
                `SELECT id, email, full_name, role, approved FROM users WHERE id = $1`,
                [decoded.id]
            );
            
            if (userResult.rows.length === 0) {
                console.log(`❌ Usuario ${decoded.id} no encontrado en BD`);
                res.clearCookie('token');
                if (req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Usuario no encontrado' });
                }
                return res.redirect('/login');
            }
            
            const user = userResult.rows[0];
            
            // Verificar que el usuario esté aprobado (solo para jugadores)
            if (user.role === 'player' && !user.approved) {
                console.log(`⏳ Usuario ${user.email} pendiente de aprobación`);
                res.clearCookie('token');
                if (req.path.startsWith('/api/')) {
                    return res.status(403).json({ error: 'Cuenta pendiente de aprobación' });
                }
                // Asegúrate de que req.flash esté inicializado en tu app.ts si usas esta línea
                if ((req as any).flash) (req as any).flash('error', '⏳ Tu cuenta está pendiente de aprobación');
                return res.redirect('/login');
            }
            
            // ✅ ASIGNACIÓN CORRECTA: Guardar usuario en req ANTES de cualquier otra validación o paso al siguiente middleware
            req.user = {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                approved: user.approved
            };
            
            console.log(`✅ Usuario autenticado: ${user.full_name} (${user.role})`);
            next();
        } catch (dbError) {
            console.error('❌ Error al verificar usuario en BD:', dbError);
            if (req.path.startsWith('/api/')) {
                return res.status(500).json({ error: 'Error en el servidor' });
            }
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('❌ Error en autenticación:', error);
        res.clearCookie('token');
        if (req.path.startsWith('/api/')) {
            return res.status(500).json({ error: 'Error en autenticación' });
        }
        return res.redirect('/login');
    }
};

// ============== VERIFICAR SI ES ENTRENADOR ==============
export const isCoach = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
        console.log('❌ Intento de acceso sin autenticación');
        return res.redirect('/login');
    }
    
    if (user.role !== 'coach') {
        console.log(`❌ Usuario ${user.email} no es entrenador (rol: ${user.role})`);
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Se requieren permisos de entrenador' });
        }
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos de entrenador',
            user: user
        });
    }
    
    console.log(`✅ Acceso de entrenador confirmado: ${user.full_name}`);
    next();
};

// ============== VERIFICAR SI ES JUGADOR ==============
export const isPlayer = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
        console.log('❌ Intento de acceso sin autenticación');
        return res.redirect('/login');
    }
    
    if (user.role !== 'player') {
        console.log(`❌ Usuario ${user.email} no es jugador (rol: ${user.role})`);
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Se requieren permisos de jugador' });
        }
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos de jugador',
            user: user
        });
    }
    
    console.log(`✅ Acceso de jugador confirmado: ${user.full_name}`);
    next();
};

// ============== VERIFICAR SI ES ADMIN ==============
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
        console.log('❌ Intento de acceso sin autenticación');
        return res.redirect('/login');
    }
    
    if (user.role !== 'admin') {
        console.log(`❌ Usuario ${user.email} no es administrador (rol: ${user.role})`);
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Se requieren permisos de administrador' });
        }
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos de administrador',
            user: user
        });
    }
    
    console.log(`✅ Acceso de administrador confirmado: ${user.full_name}`);
    next();
};

// ============== VERIFICAR SI ES COACH O ADMIN ==============
export const isCoachOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
        console.log('❌ Intento de acceso sin autenticación');
        return res.redirect('/login');
    }
    
    if (user.role !== 'coach' && user.role !== 'admin') {
        console.log(`❌ Usuario ${user.email} no es coach ni admin (rol: ${user.role})`);
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Se requieren permisos de entrenador o administrador' });
        }
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos para acceder a esta sección',
            user: user
        });
    }
    
    console.log(`✅ Acceso de coach/admin confirmado: ${user.full_name}`);
    next();
};

// ============== OBTENER USUARIO ACTUAL (API) ==============
export const getCurrentUser = async (req: Request, res: Response) => {
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    
    try {
        const result = await pool.query(
            `SELECT id, email, full_name, role, approved FROM users WHERE id = $1`,
            [user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error al obtener usuario actual:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

// ============== OBTENER USUARIO POR ID (API) ==============
export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    console.log(`📋 Obteniendo usuario ID: ${id}`);
    
    try {
        const result = await pool.query(
            `SELECT id, email, full_name, role, approved, created_at FROM users WHERE id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Error al obtener usuario ${id}:`, error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};