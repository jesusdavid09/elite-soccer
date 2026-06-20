import { Request, Response, NextFunction } from 'express';

export const logger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Capturar cuando la respuesta termine
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const method = req.method;
        const url = req.url;
        const ip = req.ip || req.socket.remoteAddress;
        
        console.log(`📊 ${method} ${url} - ${status} - ${duration}ms - ${ip}`);
    });
    
    next();
};

// ========== LOG DE ERRORES ==========
export const logError = (error: any, req: Request) => {
    console.error(`❌ Error en ${req.method} ${req.url}:`);
    console.error(`📝 Mensaje: ${error.message}`);
    console.error(`📚 Stack: ${error.stack}`);
};