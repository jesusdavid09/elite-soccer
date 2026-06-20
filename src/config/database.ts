import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración para NeonDB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Requerido para NeonDB
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Eventos de conexión
pool.on('connect', () => {
    console.log('✅ Conectado a NeonDB');
});

pool.on('error', (err) => {
    console.error('❌ Error en NeonDB:', err.message);
});

// Test de conexión
pool.query('SELECT NOW()', (err, result) => {
    if (err) {
        console.error('❌ Error al conectar a NeonDB:', err.message);
        console.error('❌ Verifica que DATABASE_URL esté configurado correctamente');
        console.error('❌ Asegúrate de incluir ?sslmode=require al final de la URL');
    } else {
        console.log('✅ Conexión a NeonDB exitosa');
        console.log('📅 Hora del servidor:', result.rows[0].now);
    }
});

export default pool;