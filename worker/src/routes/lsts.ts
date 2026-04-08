import { Hono } from 'hono';
import type { Bindings } from '../types';
import { verifyAdmin, verifyTurnstile, logAudit } from '../lib/helpers';

export const lstsRouter = new Hono<{ Bindings: Bindings }>();

// LST Extraction Tracker
lstsRouter.get('/', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);
    
    const { results } = await c.env.DB.prepare('SELECT * FROM lsts ORDER BY CASE WHEN status = "Resolved" THEN 1 ELSE 0 END, CASE WHEN severity = "High" THEN 0 WHEN severity = "Medium" THEN 1 ELSE 2 END, last_seen_date DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json({ 
      lsts: results.map((l: any) => ({
        ...l,
        identifiedDate: l.identified_date,
        lastSeenDate: l.last_seen_date,
        resolvedDate: l.resolved_date,
        createdAt: l.created_at,
        relatedReportId: l.related_report_id,
        resolutionNote: l.resolution_note,
        recurrenceCount: l.recurrence_count || 1,
        parentIssueId: l.parent_issue_id,
        locationStatuses: l.location_statuses ? JSON.parse(l.location_statuses) : {}
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

lstsRouter.put('/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    const lst = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE lsts SET 
        title = ?, description = ?, recommendation = ?, 
        severity = ?, status = ?, category = ?, 
        location = ?, resolution_note = ?, 
        resolved_date = ?, assignee = ?,
        parent_issue_id = ?, location_statuses = ?
      WHERE id = ?
    `)
    .bind(
      lst.title, lst.description, lst.recommendation, 
      lst.severity, lst.status, lst.category, 
      lst.location, lst.resolutionNote || null,
      lst.resolvedDate || null, lst.assignee || null,
      lst.parentIssueId || null, lst.locationStatuses ? JSON.stringify(lst.locationStatuses) : null,
      id
    ).run();
    
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

lstsRouter.post('/add', verifyTurnstile, async (c) => {
  try {
    const lst = await c.req.json();
    const id = lst.id || `lst_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await c.env.DB.prepare('INSERT INTO lsts (id, title, description, recommendation, severity, status, category, location, identified_date, last_seen_date, recurrence_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, lst.title || 'Untitled', lst.description || '', lst.recommendation || '', lst.severity || 'Medium', lst.status || 'Identified', lst.category || '', lst.location || '', lst.identifiedDate || new Date().toISOString(), lst.lastSeenDate || new Date().toISOString(), 1)
      .run();
      
    await logAudit(c.env.DB, 'create', 'lst', lst.title || 'Untitled LST', id);
    return c.json({ success: true, id });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

lstsRouter.get('/:id/history', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare('SELECT * FROM lst_history WHERE lst_id = ? ORDER BY created_at DESC')
      .bind(id)
      .all();
    return c.json(results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
