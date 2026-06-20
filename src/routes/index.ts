import { Router } from 'express';
import authRoutes from './authRoutes';
import playerRoutes from './playerRoutes';
import trainingRoutes from './trainingRoutes';
import matchRoutes from './matchRoutes';
import announcementRoutes from './announcementRoutes';
import attendanceRoutes from './attendanceRoutes';

const router = Router();

// ========== AGRUPAR RUTAS ==========

// Autenticación
router.use('/', authRoutes);

// Jugadores
router.use('/coach/players', playerRoutes);

// Entrenamientos
router.use('/coach/trainings', trainingRoutes);

// Partidos
router.use('/coach/matches', matchRoutes);

// Anuncios
router.use('/coach/announcements', announcementRoutes);

// Asistencia
router.use('/attendance', attendanceRoutes);

export default router;