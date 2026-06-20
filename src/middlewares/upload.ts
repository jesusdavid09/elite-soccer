import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Aseguramos el tipado correcto extendiendo Express si no lo has hecho globalmente
declare global {
    namespace Express {
        interface Request {
            file?: Multer.File;
            files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
        }
    }
}

// ============== CONFIGURACIÓN DE DIRECTORIOS ==============
const UPLOAD_DIRS = {
    players: path.join(__dirname, '../../public/uploads/players'),
    trainings: path.join(__dirname, '../../public/uploads/trainings'),
    matches: path.join(__dirname, '../../public/uploads/matches'),
    announcements: path.join(__dirname, '../../public/uploads/announcements'),
    temp: path.join(__dirname, '../../public/uploads/temp')
};

// Crear directorios de forma síncrona al levantar la app
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
    }
});

// ============== CONFIGURACIÓN DE STORAGE ==============
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
        let destDir = UPLOAD_DIRS.players;
        
        // Match defensivo de rutas
        if (req.originalUrl.includes('/trainings')) {
            destDir = UPLOAD_DIRS.trainings;
        } else if (req.originalUrl.includes('/matches')) {
            destDir = UPLOAD_DIRS.matches;
        } else if (req.originalUrl.includes('/announcements')) {
            destDir = UPLOAD_DIRS.announcements;
        } else if (req.originalUrl.includes('/temp')) {
            destDir = UPLOAD_DIRS.temp;
        }
        
        cb(null, destDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const name = path.basename(file.originalname, ext);
        
        const sanitizedName = name
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Elimina acentos/tildes
            .replace(/[^a-z0-9]/g, '-')
            .substring(0, 30);
        
        cb(null, `${sanitizedName}-${timestamp}-${random}${ext}`);
    }
});

// ============== FILTRO DE ARCHIVOS ==============
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|bmp|avif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
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
        files: 5 
    },
    fileFilter: fileFilter
});

// Helper para limpiar archivos si la validación posterior falla (Evita basura en disco)
const deletePhysicalFiles = async (filesToDelete: Express.Multer.File[]) => {
    for (const file of filesToDelete) {
        try {
            if (fs.existsSync(file.path)) {
                await fs.promises.unlink(file.path);
                console.log(`🗑️ Basura eliminada por fallo de validación: ${file.filename}`);
            }
        } catch (err) {
            console.error(`Error limpiando archivo abortado:`, err);
        }
    }
};

// ============== VALIDAR ARCHIVO SUBIDO ==============
export const validateUpload = async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    const files = req.files;
    const isApi = req.originalUrl.includes('/api/');
    
    // Recolectar todos los archivos subidos para analizarlos o borrarlos si es necesario
    let allFiles: Express.Multer.File[] = [];
    if (file) allFiles.push(file);
    if (files) {
        if (Array.isArray(files)) {
            allFiles = allFiles.concat(files);
        } else {
            Object.values(files).forEach(fileArray => {
                allFiles = allFiles.concat(fileArray);
            });
        }
    }

    if (allFiles.length === 0) {
        const errorMsg = '⚠️ No se seleccionó ningún archivo';
        if (isApi) return res.status(400).json({ error: errorMsg });
        if ((req as any).flash) (req as any).flash('error', errorMsg);
        return res.redirect('back');
    }
    
    // Verificar tamaño (10MB)
    const maxSize = 10 * 1024 * 1024;
    for (const f of allFiles) {
        if (f.size > maxSize) {
            await deletePhysicalFiles(allFiles); // 🔥 Limpieza inmediata
            const errorMsg = `❌ El archivo ${f.originalname} excede el tamaño máximo de 10MB`;
            if (isApi) return res.status(400).json({ error: errorMsg });
            if ((req as any).flash) (req as any).flash('error', errorMsg);
            return res.redirect('back');
        }
    }
    
    next();
};

// ============== LIMPIAR ARCHIVOS TEMPORALES CORREGIDO ==============
export const cleanTempFiles = async (maxAge: number = 24 * 60 * 60 * 1000): Promise<void> => {
    const tempDir = UPLOAD_DIRS.temp;
    try {
        const files = await fs.promises.readdir(tempDir);
        const now = Date.now();
        let deletedCount = 0;
        
        // Usamos for...of para esperar secuencialmente las consultas asíncronas
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.promises.stat(filePath);
            
            if (now - stats.mtimeMs > maxAge) {
                await fs.promises.unlink(filePath);
                deletedCount++;
                console.log(`🗑️ Archivo temporal eliminado: ${file}`);
            }
        }
        console.log(`✅ Ciclo de limpieza completado. ${deletedCount} archivos temporales eliminados.`);
    } catch (err) {
        console.error('❌ Error en el ciclo de limpieza temporal:', err);
        throw err;
    }
};

// ============== PROCESAMIENTO DE IMÁGENES CON SHARP ==============
const sharp = require('sharp');

export const processImage = async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    if (!file) return next();
    
    try {
        const ext = path.extname(file.path);
        const processedPath = file.path.replace(new RegExp(`${ext}$`), '_processed.jpg');
        
        await sharp(file.path)
            .resize(800, 800, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(processedPath);
        
        // Reemplazar de forma segura usando la API de promesas nativa
        await fs.promises.unlink(file.path);
        
        file.path = processedPath;
        file.filename = path.basename(processedPath);
        
        next();
    } catch (error) {
        console.error('❌ Error al procesar imagen con Sharp:', error);
        next(error);
    }
};

// Envolturas de métodos Multer estándar
export const uploadSingle = (fieldName: string = 'photo') => upload.single(fieldName);
export const uploadMultiple = (fieldName: string = 'photos', maxCount: number = 5) => upload.array(fieldName, maxCount);
export const uploadFields = (fields: { name: string; maxCount: number }[]) => upload.fields(fields);