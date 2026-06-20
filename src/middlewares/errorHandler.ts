import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ Error:', err.message);
    console.error('📚 Stack:', err.stack);
    
    // Error de base de datos
    if (err.code === '23505') {
        return res.status(400).render('error', {
            title: 'Error',
            message: 'El registro ya existe en la base de datos',
            user: (req as any).user
        });
    }
    
    // Error de autenticación
    if (err.name === 'UnauthorizedError') {
        return res.status(401).redirect('/login');
    }
    
    // Error de validación
    if (err.name === 'ValidationError') {
        return res.status(400).render('error', {
            title: 'Error de Validación',
            message: err.message,
            user: (req as any).user
        });
    }
    
    // Error genérico
    res.status(500).render('error', {
        title: 'Error del Servidor',
        message: 'Ha ocurrido un error en el servidor',
        user: (req as any).user
    });
};

// ========== 404 NOT FOUND ==========
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).render('error', {
        title: 'Página no encontrada',
        message: 'La página que buscas no existe',
        user: (req as any).user
    });
};