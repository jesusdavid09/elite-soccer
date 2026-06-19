import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// ============== CONFIGURACIÓN DE DIRECTORIOS ==============
const UPLOAD_DIRS = {
    players: path.join(__dirname, '../../public/uploads/players'),
    trainings: path.join(__dirname, '../../public/uploads/trainings'),
    matches: path.join(__dirname, '../../public/uploads/matches'),
    announcements: path.join(__dirname, '../../public/uploads/announcements'),
    temp: path.join(__dirname, '../../public/uploads/temp')
};

// Crear directorios si no existen
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
    }
});

// ============== CONFIGURACIÓN DE STORAGE ==============
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
        // Determinar destino según el tipo de archivo
        let destDir = UPLOAD_DIRS.players;
        
        if (req.path.includes('/trainings')) {
            destDir = UPLOAD_DIRS.trainings;
        } else if (req.path.includes('/matches')) {
            destDir = UPLOAD_DIRS.matches;
        } else if (req.path.includes('/announcements')) {
            destDir = UPLOAD_DIRS.announcements;
        } else if (req.path.includes('/temp')) {
            destDir = UPLOAD_DIRS.temp;
        }
        
        cb(null, destDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        // Generar nombre único con timestamp
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

// ============== FILTRO DE ARCHIVOS ==============
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Tipos de archivo permitidos
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|bmp|avif/;
    
    // Verificar extensión
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Verificar MIME type
    const mimetype = allowedTypes.test(file.mimetype);
    
    // Verificar que sea una imagen
    const isImage = file.mimetype.startsWith('image/');
    
    if (extname && mimetype && isImage) {
        cb(null, true);
    } else {
        cb(new Error('❌ Solo se permiten archivos de imagen (JPEG, PNG, GIF, WEBP, SVG, BMP, AVIF)'));
    }
};

// ============== CONFIGURACIÓN DE MULTER ==============
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
        files: 5 // Máximo 5 archivos por petición
    },
    fileFilter: fileFilter
});

// ============== MIDDLEWARE PARA UN SOLO ARCHIVO ==============
export const uploadSingle = (fieldName: string = 'photo') => {
    return upload.single(fieldName);
};

// ============== MIDDLEWARE PARA MÚLTIPLES ARCHIVOS ==============
export const uploadMultiple = (fieldName: string = 'photos', maxCount: number = 5) => {
    return upload.array(fieldName, maxCount);
};

// ============== MIDDLEWARE PARA MÚLTIPLES CAMPOS ==============
export const uploadFields = (fields: { name: string; maxCount: number }[]) => {
    return upload.fields(fields);
};

// ============== VALIDAR ARCHIVO SUBIDO ==============
export const validateUpload = (req: Request, res: Response, next: NextFunction) => {
    const file = (req as any).file;
    const files = (req as any).files;
    
    // Verificar si hay archivo
    if (!file && !files) {
        req.flash('error', '⚠️ No se seleccionó ningún archivo');
        return res.redirect('back');
    }
    
    // Verificar tamaño
    const maxSize = 10 * 1024 * 1024; // 10MB
    const checkFile = (f: Express.Multer.File) => {
        if (f.size > maxSize) {
            req.flash('error', `❌ El archivo ${f.originalname} excede el tamaño máximo de 10MB`);
            return false;
        }
        return true;
    };
    
    if (file && !checkFile(file)) {
        return res.redirect('back');
    }
    
    if (files) {
        if (Array.isArray(files)) {
            for (const f of files) {
                if (!checkFile(f)) {
                    return res.redirect('back');
                }
            }
        } else {
            for (const key in files) {
                if (Array.isArray(files[key])) {
                    for (const f of files[key]) {
                        if (!checkFile(f)) {
                            return res.redirect('back');
                        }
                    }
                } else if (files[key] && !checkFile(files[key])) {
                    return res.redirect('back');
                }
            }
        }
    }
    
    next();
};

// ============== ELIMINAR ARCHIVO ==============
export const deleteFile = (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!filePath) {
            return resolve();
        }
        
        const fullPath = path.join(__dirname, '../../public', filePath);
        
        fs.unlink(fullPath, (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log(`⚠️ Archivo no encontrado: ${filePath}`);
                    return resolve();
                }
                console.error(`❌ Error al eliminar archivo ${filePath}:`, err);
                return reject(err);
            }
            console.log(`✅ Archivo eliminado: ${filePath}`);
            resolve();
        });
    });
};

// ============== OBTENER URL DE ARCHIVO ==============
export const getFileUrl = (filename: string, folder: string = 'players'): string => {
    return `/uploads/${folder}/${filename}`;
};

// ============== VALIDAR EXTENSIÓN DE ARCHIVO ==============
export const validateFileExtension = (filename: string): boolean => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'];
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
};

// ============== OBTENER TAMAÑO DE ARCHIVO ==============
export const getFileSize = (filePath: string): number => {
    try {
        const fullPath = path.join(__dirname, '../../public', filePath);
        const stats = fs.statSync(fullPath);
        return stats.size;
    } catch (error) {
        console.error(`❌ Error al obtener tamaño de archivo ${filePath}:`, error);
        return 0;
    }
};

// ============== LIMPIAR ARCHIVOS TEMPORALES ==============
export const cleanTempFiles = (maxAge: number = 24 * 60 * 60 * 1000): Promise<void> => {
    return new Promise((resolve, reject) => {
        const tempDir = UPLOAD_DIRS.temp;
        
        fs.readdir(tempDir, (err, files) => {
            if (err) {
                console.error('❌ Error al leer directorio temporal:', err);
                return reject(err);
            }
            
            const now = Date.now();
            let deletedCount = 0;
            
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    
                    if (now - stats.mtimeMs > maxAge) {
                        fs.unlink(filePath, (err) => {
                            if (!err) {
                                deletedCount++;
                                console.log(`🗑️ Archivo temporal eliminado: ${file}`);
                            }
                        });
                    }
                });
            });
            
            console.log(`✅ ${deletedCount} archivos temporales eliminados`);
            resolve();
        });
    });
};

// Use require to avoid TypeScript errors when sharp types are not installed
const sharp: any = require('sharp');

export const processImage = async (req: Request, res: Response, next: NextFunction) => {
    const file = (req as any).file;
    
    if (!file) {
        return next();
    }
    
    try {
        const processedPath = file.path.replace(/\.[^.]+$/, '_processed.jpg');
        await sharp(file.path)
            .resize(800, 800, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(processedPath);
        
        // Reemplazar archivo original con el procesado
        fs.unlinkSync(file.path);
        (req as any).file.path = processedPath;
        (req as any).file.filename = path.basename(processedPath);
        
        next();
    } catch (error) {
        console.error('❌ Error al procesar imagen:', error);
        next(error);
    }
};
