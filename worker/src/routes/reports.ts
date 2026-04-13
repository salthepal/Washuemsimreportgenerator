import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { verifyAdmin, verifyTurnstile, logAudit, indexDocumentVector } from '../lib/helpers';

const reportUploadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).default('Untitled Report'),
  content: z.string().default(''),
  type: z.string().default('prior_report'),
  metadata: z.any().optional().default({})
});

export const reportsRouter = new Hono<{ Bindings: Bindings }>();

reportsRouter.get('/', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);
    const { results } = await c.env.DB.prepare('SELECT * FROM reports WHERE type = "prior_report" ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json(results.map((r: any) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : {}
    })));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

reportsRouter.get('/generated', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);
    const { results } = await c.env.DB.prepare('SELECT * FROM reports WHERE type = "generated_report" ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json(results.map((r: any) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : {}
    })));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

reportsRouter.post('/upload', verifyTurnstile, async (c) => {
  try {
    const rawData = await c.req.json();
    const parseResult = reportUploadSchema.safeParse(rawData);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const { title, content, type, metadata } = parseResult.data;
    const id = parseResult.data.id || `rep_${crypto.randomUUID()}`;

    await c.env.DB.prepare('INSERT INTO reports (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)')
      .bind(id, title, content, type, JSON.stringify(metadata))
      .run();

    // Kick off vector indexing in background
    c.executionCtx.waitUntil(indexDocumentVector(c.env, id, title, content, type));

    await logAudit(c.env.DB, 'upload', 'report', title, id);
    return c.json({ success: true, id });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

reportsRouter.delete('/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM reports WHERE id = ?').bind(id).run();
    await logAudit(c.env.DB, 'delete', 'report', id, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
