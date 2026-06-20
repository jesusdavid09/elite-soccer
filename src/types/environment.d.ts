declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // Servidor
            PORT: string;
            NODE_ENV: 'development' | 'production' | 'test';
            
            // Base de datos
            DB_HOST: string;
            DB_PORT: string;
            DB_NAME: string;
            DB_USER: string;
            DB_PASSWORD: string;
            
            // Seguridad
            JWT_SECRET: string;
            SESSION_SECRET: string;
            COACH_SECRET_KEY: string;
            
            // VAPID (notificaciones push)
            VAPID_PUBLIC_KEY?: string;
            VAPID_PRIVATE_KEY?: string;
            VAPID_SUBJECT?: string;
        }
    }
}

export {};