import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// ========== VALIDAR REGISTRO ==========
export const validateRegister = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('full_name').notEmpty().withMessage('El nombre es obligatorio'),
];

// ========== VALIDAR LOGIN ==========
export const validateLogin = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
];

// ========== VALIDAR ANUNCIO ==========
export const validateAnnouncement = [
    body('title').notEmpty().withMessage('El título es obligatorio'),
    body('content').notEmpty().withMessage('El contenido es obligatorio'),
];

// ========== VALIDAR ENTRENAMIENTO ==========
export const validateTraining = [
    body('title').notEmpty().withMessage('El título es obligatorio'),
    body('date').isDate().withMessage('Fecha inválida'),
    body('time').notEmpty().withMessage('La hora es obligatoria'),
    body('location').notEmpty().withMessage('La ubicación es obligatoria'),
];

// ========== VALIDAR PARTIDO ==========
export const validateMatch = [
    body('opponent').notEmpty().withMessage('El rival es obligatorio'),
    body('competition').notEmpty().withMessage('La competición es obligatoria'),
    body('date').isDate().withMessage('Fecha inválida'),
    body('time').notEmpty().withMessage('La hora es obligatoria'),
    body('location').notEmpty().withMessage('La ubicación es obligatoria'),
];

// ========== MIDDLEWARE DE VALIDACIÓN ==========
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return res.status(400).render('error', {
            title: 'Error de Validación',
            message: errorMessages.join(', '),
            user: (req as any).user
        });
    }
    next();
};