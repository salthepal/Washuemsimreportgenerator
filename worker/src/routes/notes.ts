import { Hono } from 'hono';
import type { Bindings } from '../types';
import { verifyAdmin, verifyTurnstile, logAudit, logError } from '../lib/helpers';

export const notesRouter = new Hono<{ Bindings: Bindings }>();

notesRouter.get('/', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);

    const { results } = await c.env.DB.prepare('SELECT * FROM session_notes ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json({
      notes: results.map((n: any) => ({
        id: n.id,
        sessionName: n.session_name,
        notes: n.notes,
        createdAt: n.created_at || new Date().toISOString(),
        participants: n.participants ? JSON.parse(n.participants) : [],
        tags: n.tags ? JSON.parse(n.tags) : [],
        metadata: n.metadata ? JSON.parse(n.metadata) : {}
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

notesRouter.post('/add', verifyTurnstile, async (c) => {
  try {
    const note = await c.req.json();
    const id = note.id || `notes_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await c.env.DB.prepare('INSERT INTO session_notes (id, session_name, notes, participants, tags, metadata) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, note.sessionName || 'Untitled Session', note.notes || '', JSON.stringify(note.participants || []), JSON.stringify(note.tags || []), JSON.stringify(note.metadata || {}))
      .run();
      
    await logAudit(c.env.DB, 'create', 'session_notes', note.sessionName || 'Untitled Session', id);
    return c.json({ success: true, notes: { ...note, id } });
  } catch (error: any) {
    await logError(c.env.DB, 'note_upload', error);
    return c.json({ error: error.message }, 500);
  }
});

notesRouter.delete('/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM session_notes WHERE id = ?').bind(id).run();
    await logAudit(c.env.DB, 'delete', 'session_notes', `Deleted note ${id}`, id);
    return c.json({ success: true });
  } catch (error: any) {
    await logError(c.env.DB, 'note_delete', error);
    return c.json({ error: error.message }, 500);
  }
});
