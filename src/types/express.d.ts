import { UserSession } from './user';

declare global {
    namespace Express {
        interface Request {
            user?: UserSession;
        }
    }
}

// Declarar módulos para archivos estáticos
declare module '*.css';
declare module '*.jpg';
declare module '*.png';
declare module '*.svg';