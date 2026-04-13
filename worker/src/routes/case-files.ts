import { Hono } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../types';
import { verifyAdmin, verifyTurnstile, logAudit, indexDocumentVector } from '../lib/helpers';

const caseFileUploadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).default('Untitled Case'),
  content: z.string().default(''),
  htmlContent: z.string().optional().default(''),
  date: z.string().optional(),
  metadata: z.object({
    uploaderName: z.string().optional().default(''),
    caseType: z.string().optional().default('')
  }).optional().default({ uploaderName: '', caseType: '' })
});

export const caseFilesRouter = new Hono<{ Bindings: Bindings }>();

caseFilesRouter.get('/', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);
    const { results } = await c.env.DB.prepare('SELECT * FROM case_files ORDER BY date DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json(results.map((cf: any) => ({
      ...cf,
      createdAt: cf.created_at || cf.date
    })));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

caseFilesRouter.post('/upload', verifyTurnstile, async (c) => {
  try {
    const rawData = await c.req.json();
    const parseResult = caseFileUploadSchema.safeParse(rawData);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const { title, content, htmlContent, date, metadata } = parseResult.data;
    const id = parseResult.data.id || `case_${crypto.randomUUID()}`;

    await c.env.DB.prepare('INSERT INTO case_files (id, title, content, html_content, date, uploader_name, case_type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, title, content, htmlContent, date, metadata.uploaderName, metadata.caseType)
      .run();

    // Kick off vector indexing in background
    c.executionCtx.waitUntil(indexDocumentVector(c.env, id, title, content, metadata.caseType));

    await logAudit(c.env.DB, 'upload', 'case_file', title, id);
    return c.json({ success: true, id });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

caseFilesRouter.post('/storage-upload', verifyAdmin, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file uploaded' }, 400);

    const name = (formData.get('name') as string) || file.name;
    const key = `${Date.now()}_${name}`;

    // Save to R2
    await c.env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    await logAudit(c.env.DB, 'upload', 'file', name, key);
    return c.json({ success: true, key, url: `/files/${key}` });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
