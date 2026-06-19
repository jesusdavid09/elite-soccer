import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.redirect('/login');
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
    
    (req as any).user = decoded;
    next();
};

export const isCoach = (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).user?.role !== 'coach') {
        return res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos de entrenador',
            user: (req as any).user
        });
    }
    next();
};