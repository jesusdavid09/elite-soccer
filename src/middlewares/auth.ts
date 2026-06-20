import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// ========== VERIFICAR AUTENTICACIÓN ==========
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token;
    
    if (!token) {
        // Si es una petición API, devolver 401
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        return res.redirect('/login');
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        res.clearCookie('token');
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        return res.redirect('/login');
    }
    
    (req as any).user = decoded;
    next();
};

// ========== VERIFICAR ROL DE ENTRENADOR ==========
export const isCoach = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
        return res.redirect('/login');
    }
    
    if (user.role !== 'coach') {
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos de entrenador',
            user: user
        });
    }
    next();
};

// ========== VERIFICAR ROL DE JUGADOR ==========
export const isPlayer = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
        return res.redirect('/login');
    }
    
    if (user.role !== 'player') {
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos de jugador',
            user: user
        });
    }
    next();
};

// ========== VERIFICAR ROL DE ADMIN ==========
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
        return res.redirect('/login');
    }
    
    if (user.role !== 'admin') {
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos de administrador',
            user: user
        });
    }
    next();
};

// ========== VERIFICAR COACH O ADMIN ==========
export const isCoachOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
        return res.redirect('/login');
    }
    
    if (user.role !== 'coach' && user.role !== 'admin') {
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos para acceder a esta sección',
            user: user
        });
    }
    next();
};