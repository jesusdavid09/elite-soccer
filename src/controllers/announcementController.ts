import { Request, Response } from 'express';
import pool from '../config/database';

// ========== OBTENER ANUNCIOS ==========
export const getAnnouncements = async (req: Request, res: Response) => {
    try {
        console.log('📋 Obteniendo anuncios...');
        
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
            pendingCount: 0
        });
    }
};

// ========== CREAR ANUNCIO ==========
export const createAnnouncement = async (req: Request, res: Response) => {
    const { title, content } = req.body;
    const userId = (req as any).user?.id;
    
    console.log('📝 Creando nuevo anuncio...');
    
    if (!title || !content) {
        console.log('❌ Título o contenido vacío');
        return res.redirect('/coach/announcements');
    }
    
    if (!userId) {
        console.log('❌ Usuario no autenticado');
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
        res.redirect('/coach/announcements');
    } catch (error) {
        console.error('❌ Error al crear anuncio:', error);
        res.redirect('/coach/announcements');
    }
};

// ========== ELIMINAR ANUNCIO ==========
export const deleteAnnouncement = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const userId = (req as any).user?.id;
    
    console.log(`🗑️ Eliminando anuncio ID: ${id}`);
    
    if (!id || id === 'undefined' || id === 'null') {
        console.log('❌ ID inválido');
        return res.redirect('/coach/announcements');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, author_id FROM announcements WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            console.log(`❌ Anuncio ${id} no encontrado`);
            return res.redirect('/coach/announcements');
        }
        
        const announcement = checkResult.rows[0];
        if (announcement.author_id !== userId && (req as any).user?.role !== 'admin') {
            console.log(`❌ Usuario ${userId} no tiene permiso`);
            return res.redirect('/coach/announcements');
        }
        
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
        
        console.log(`✅ Anuncio ${id} eliminado correctamente`);
        res.redirect('/coach/announcements');
    } catch (error) {
        console.error(`❌ Error al eliminar anuncio ${id}:`, error);
        res.redirect('/coach/announcements');
    }
};

// ========== OBTENER ANUNCIO POR ID (API) ==========
export const getAnnouncementById = async (req: Request, res: Response) => {
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

// ========== ACTUALIZAR ANUNCIO ==========
export const updateAnnouncement = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { title, content } = req.body;
    const userId = (req as any).user?.id;
    
    console.log(`✏️ Actualizando anuncio ID: ${id}`);
    
    if (!title || !content) {
        return res.redirect('/coach/announcements');
    }
    
    try {
        const checkResult = await pool.query(
            'SELECT id, author_id FROM announcements WHERE id = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.redirect('/coach/announcements');
        }
        
        const announcement = checkResult.rows[0];
        if (announcement.author_id !== userId && (req as any).user?.role !== 'admin') {
            return res.redirect('/coach/announcements');
        }
        
        await pool.query(
            `UPDATE announcements 
             SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [title.trim(), content.trim(), id]
        );
        
        console.log(`✅ Anuncio ${id} actualizado`);
        res.redirect('/coach/announcements');
    } catch (error) {
        console.error(`❌ Error al actualizar anuncio ${id}:`, error);
        res.redirect('/coach/announcements');
    }
};