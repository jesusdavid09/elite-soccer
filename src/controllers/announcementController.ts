import { Request, Response } from 'express';
import pool from '../config/database';

// ============== OBTENER ANUNCIOS ==============
export const getAnnouncements = async (req: Request, res: Response) => {
    try {
        console.log('📋 Obteniendo lista de anuncios...');
        
        const result = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.content,
                a.created_at,
                u.full_name as author_name,
                u.id as author_id
            FROM announcements a
            JOIN users u ON a.author_id = u.id 
            ORDER BY a.created_at DESC
        `);
        
        console.log(`✅ ${result.rows.length} anuncios encontrados`);
        
        res.render('coach/announcements', { 
            title: 'Anuncios', 
            announcements: result.rows, 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener anuncios:', error);
        res.render('coach/announcements', { 
            title: 'Anuncios', 
            announcements: [], 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    }
};

// ============== CREAR ANUNCIO ==============
export const createAnnouncement = async (req: Request, res: Response) => {
    const { title, content } = req.body;
    const userId = (req as any).user?.id;
    
    console.log('📝 Creando nuevo anuncio...');
    console.log('📝 Título:', title);
    console.log('📝 Autor ID:', userId);
    
    if (!title || !content) {
        console.log('❌ Error: Título o contenido vacío');
        req.flash('error', '⚠️ El título y el contenido son obligatorios');
        return res.redirect('/coach/announcements');
    }
    
    if (!userId) {
        console.log('❌ Error: Usuario no autenticado');
        req.flash('error', '❌ Debes iniciar sesión para crear anuncios');
        return res.redirect('/coach/announcements');
    }
    
    try {
        const result = await pool.query(
            `INSERT INTO announcements (title, content, author_id) 
             VALUES ($1, $2, $3) 
             RETURNING id`,
            [title.trim(), content.trim(), userId]
        );
        
        console.log(`✅ Anuncio creado con ID: ${result.rows[0].id}`);
        req.flash('success', '✅ Anuncio creado correctamente');
        res.redirect('/coach/announcements');
    } catch (error) {
        console.error('❌ Error al crear anuncio:', error);
        req.flash('error', '❌ Error al crear el anuncio');
        res.redirect('/coach/announcements');
    }
};

// ============== ELIMINAR ANUNCIO ==============
export const deleteAnnouncement = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id); // Convertir a string explícitamente
    const userId = (req as any).user?.id;
    
    console.log(`🗑️ Eliminando anuncio ID: ${id}`);
    console.log(`👤 Usuario ID: ${userId}`);
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ Error: ID inválido');
        req.flash('error', '❌ ID de anuncio inválido');
        return res.redirect('/coach/announcements');
    }
    
    try {
        // Verificar que el anuncio existe
        const checkResult = await pool.query(
            'SELECT id, author_id FROM announcements WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Anuncio ${id} no encontrado`);
            req.flash('error', '❌ El anuncio no existe');
            return res.redirect('/coach/announcements');
        }
        
        // Verificar que el usuario es el autor o es admin/coach
        const announcement = checkResult.rows[0];
        if (announcement.author_id !== userId && (req as any).user?.role !== 'admin') {
            console.log(`❌ Usuario ${userId} no es autor del anuncio ${id}`);
            req.flash('error', '❌ No tienes permiso para eliminar este anuncio');
            return res.redirect('/coach/announcements');
        }
        
        // Eliminar el anuncio
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
        
        console.log(`✅ Anuncio ${id} eliminado correctamente`);
        req.flash('success', '✅ Anuncio eliminado correctamente');
        res.redirect('/coach/announcements');
    } catch (error) {
        console.error(`❌ Error al eliminar anuncio ${id}:`, error);
        req.flash('error', '❌ Error al eliminar el anuncio');
        res.redirect('/coach/announcements');
    }
};

// ============== OBTENER ANUNCIO POR ID (API) ==============
export const getAnnouncementById = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    
    console.log(`📋 Obteniendo anuncio ID: ${id}`);
    
    try {
        const result = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.content,
                a.created_at,
                u.full_name as author_name,
                u.id as author_id
            FROM announcements a
            JOIN users u ON a.author_id = u.id
            WHERE a.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            console.log(`❌ Anuncio ${id} no encontrado`);
            return res.status(404).json({ error: 'Anuncio no encontrado' });
        }
        
        console.log(`✅ Anuncio ${id} encontrado`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(`❌ Error al obtener anuncio ${id}:`, error);
        res.status(500).json({ error: 'Error al obtener el anuncio' });
    }
};

// ============== ACTUALIZAR ANUNCIO ==============
export const updateAnnouncement = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const { title, content } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`✏️ Actualizando anuncio ID: ${id}`);
    
    if (!title || !content) {
        req.flash('error', '⚠️ El título y el contenido son obligatorios');
        return res.redirect('/coach/announcements');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, author_id FROM announcements WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            req.flash('error', '❌ El anuncio no existe');
            return res.redirect('/coach/announcements');
        }
        
        const announcement = checkResult.rows[0];
        if (announcement.author_id !== userId && (req as any).user?.role !== 'admin') {
            req.flash('error', '⚠️ No tienes permiso para editar este anuncio');
            return res.redirect('/coach/announcements');
        }
        
        await pool.query(
            `UPDATE announcements 
             SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [title.trim(), content.trim(), id]
        );
        
        console.log(`✅ Anuncio ${id} actualizado`);
        req.flash('success', '✅ Anuncio actualizado correctamente');
        res.redirect('/coach/announcements');
    } catch (error) {
        console.error(`❌ Error al actualizar anuncio ${id}:`, error);
        req.flash('error', '❌ Error al actualizar el anuncio');
        res.redirect('/coach/announcements');
    }
};

// ============== PUBLICAR/DESPUBLICAR ANUNCIO ==============
export const togglePublish = async (req: Request, res: Response) => {
    // 🔥 SOLUCIÓN: Convertir id a string
    const id = String(req.params.id);
    const { published } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`📝 Cambiando estado de publicación del anuncio ${id} a: ${published}`);
    
    try {
        const checkResult = await pool.query(
            'SELECT id, author_id FROM announcements WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Anuncio no encontrado' });
        }
        
        const announcement = checkResult.rows[0];
        if (announcement.author_id !== userId && (req as any).user?.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso' });
        }
        
        await pool.query(
            `UPDATE announcements SET published = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [published, id]
        );
        
        console.log(`✅ Estado del anuncio ${id} actualizado a: ${published}`);
        res.json({ success: true, published });
    } catch (error) {
        console.error(`❌ Error al cambiar estado del anuncio ${id}:`, error);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

// ============== OBTENER ANUNCIOS DESTACADOS ==============
export const getFeaturedAnnouncements = async (req: Request, res: Response) => {
    console.log('📋 Obteniendo anuncios destacados...');
    
    try {
        const result = await pool.query(`
            SELECT a.*, u.full_name as author_name 
            FROM announcements a
            JOIN users u ON a.author_id = u.id 
            WHERE a.featured = true 
            ORDER BY a.created_at DESC 
            LIMIT 5
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error al obtener anuncios destacados:', error);
        res.status(500).json({ error: 'Error al obtener anuncios destacados' });
    }
};

// ============== OBTENER ANUNCIOS PARA JUGADORES ==============
export const getPlayerAnnouncements = async (req: Request, res: Response) => {
    try {
        console.log('📋 Obteniendo anuncios para jugador...');
        
        const result = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.content,
                a.created_at,
                u.full_name as author_name
            FROM announcements a
            JOIN users u ON a.author_id = u.id 
            WHERE a.published = true OR a.published IS NULL
            ORDER BY a.created_at DESC
            LIMIT 20
        `);
        
        console.log(`✅ ${result.rows.length} anuncios encontrados para jugador`);
        
        res.render('player/announcements', { 
            title: 'Anuncios', 
            announcements: result.rows, 
            user: (req as any).user,
            pendingCount: res.locals?.pendingCount || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener anuncios para jugador:', error);
        res.render('player/announcements', { 
            title: 'Anuncios', 
            announcements: [], 
            user: (req as any).user,
            pendingCount: 0
        });
    }
};