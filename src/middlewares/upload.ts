import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// ========== DIRECTORIOS ==========
const UPLOAD_DIRS = {
    players: path.join(__dirname, '../../public/uploads/players'),
    trainings: path.join(__dirname, '../../public/uploads/trainings'),
    matches: path.join(__dirname, '../../public/uploads/matches'),
    announcements: path.join(__dirname, '../../public/uploads/announcements'),
};

// Crear directorios si no existen
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
    }
});

// ========== CONFIGURACIÓN DE STORAGE ==========
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
        let destDir = UPLOAD_DIRS.players;
        
        if (req.path.includes('/trainings')) {
            destDir = UPLOAD_DIRS.trainings;
        } else if (req.path.includes('/matches')) {
            destDir = UPLOAD_DIRS.matches;
        } else if (req.path.includes('/announcements')) {
            destDir = UPLOAD_DIRS.announcements;
        }
        
        cb(null, destDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const sanitizedName = name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 30);
        
        cb(null, `${sanitizedName}-${timestamp}-${random}${ext}`);
    }
});

// ========== FILTRO DE ARCHIVOS ==========
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('❌ Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
    }
};

// ========== CONFIGURACIÓN DE MULTER ==========
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: fileFilter
});

// ========== SUBIR UN SOLO ARCHIVO ==========
export const uploadSingle = (fieldName: string = 'photo') => {
    return upload.single(fieldName);
};

// ========== SUBIR MÚLTIPLES ARCHIVOS ==========
export const uploadMultiple = (fieldName: string = 'photos', maxCount: number = 5) => {
    return upload.array(fieldName, maxCount);
};

// ========== VALIDAR ARCHIVO SUBIDO ==========
export const validateUpload = (req: Request, res: Response, next: NextFunction) => {
    const file = (req as any).file;
    
    if (!file) {
        return res.redirect('back');
    }
    
    // Verificar tamaño
    if (file.size > 5 * 1024 * 1024) {
        return res.redirect('back');
    }
    
    next();
};