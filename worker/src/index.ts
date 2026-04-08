/**
 * WashU EM Sim Intelligence Worker - v3.2.0
 * Automatic deployment test triggered via GitHub Actions
 */
import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { cache } from 'hono/cache';
import { z } from 'zod';
import { extractAndScoreLSTs } from './utils/ai';

const reportUploadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).default('Untitled Report'),
  content: z.string().default(''),
  type: z.string().default('prior_report'),
  metadata: z.any().optional().default({})
});

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

const askSchema = z.object({
  query: z.string().min(1, "Query is required"),
  stream: z.boolean().optional().default(false)
});

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  RATELIMIT: KVNamespace;
  GEMINI_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  ADMIN_TOKEN: string;
  AI_SEARCH_TOKEN: string;
  AI: any;
  VECTORIZE: VectorizeIndex;
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Security Headers Middleware
app.use('*', secureHeaders());

// 2. Base Middlewares
app.use('*', honoLogger());
app.use('*', cors({
  origin: [
    'https://washusimintelligence.pages.dev',
    'https://washu-em-sim-intelligence.sphadnisuf.workers.dev',
    'http://localhost:5173',
    'http://localhost:8787',
  ],
  allowHeaders: ['Content-Type', 'X-Turnstile-Token', 'Authorization', 'X-Admin-Token'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// 3. Edge Caching Middleware (Only applies to GET requests automatically)
app.use('*', cache({
  cacheName: 'washusim-api-cache',
  cacheControl: 'max-age=30', // Cache for 30 seconds to optimize D1 reads while keeping data relatively fresh
}));

app.get('/', (c) => {
  return c.json({
    message: 'WashU EM Sim Intelligence API is Running',
    version: '3.1.2',
    status: 'Operational'
  });
});

// --- HYDRATE ENDPOINT ---
app.get('/hydrate', verifyAdmin, async (c) => {
  try {
    const [reports, lsts, notes, cases] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM reports ORDER BY created_at DESC').all(),
      c.env.DB.prepare('SELECT * FROM lsts ORDER BY status ASC, severity ASC, last_seen_date DESC').all(),
      c.env.DB.prepare('SELECT * FROM session_notes ORDER BY created_at DESC').all(),
      c.env.DB.prepare('SELECT * FROM case_files ORDER BY date DESC').all()
    ]);

    return c.json({
      reports: reports.results.map((r: any) => ({
        ...r,
        createdAt: r.created_at,
        metadata: r.metadata ? JSON.parse(r.metadata) : {}
      })),
      lsts: lsts.results.map((l: any) => ({
        ...l,
        identifiedDate: l.identified_date,
        lastSeenDate: l.last_seen_date,
        resolvedDate: l.resolved_date,
        locationStatuses: l.location_statuses ? JSON.parse(l.location_statuses) : {}
      })),
      notes: notes.results.map((n: any) => ({
        ...n,
        createdAt: n.created_at,
        participants: n.participants ? JSON.parse(n.participants) : [],
        tags: n.tags ? JSON.parse(n.tags) : [],
        metadata: n.metadata ? JSON.parse(n.metadata) : {}
      })),
      cases: cases.results.map((cf: any) => ({
        ...cf,
        createdAt: cf.created_at || cf.date
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Error logging helper for Cloudflare
async function logError(db: D1Database, action: string, error: any, context?: any) {
  try {
    const errorId = `error_${crypto.randomUUID()}`;
    const entry = {
      id: errorId,
      action,
      message: error?.message || String(error),
      stack: error?.stack,
      context: context ? JSON.stringify(context) : null,
      timestamp: new Date().toISOString()
    };
    
    await db.prepare('INSERT INTO error_logs (id, action, message, stack, context, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(entry.id, entry.action, entry.message, entry.stack, entry.context, entry.timestamp)
      .run();
      
    console.log(`[ERROR LOGGED] ${action}: ${entry.message}`);
  } catch (logErr) {
    console.log(`CRITICAL: Failed to log error: ${logErr}`);
  }
}

// Audit logging helper
async function logAudit(db: D1Database, action: string, type: string, target: string, id: string) {
  try {
    const auditId = `audit_${crypto.randomUUID()}`;
    await db.prepare('INSERT INTO audit_logs (id, action, type, target, target_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(auditId, action, type, target, id, new Date().toISOString())
      .run();
  } catch (error) {
    console.log(`Error logging audit: ${error}`);
  }
}

// Turnstile Verification Middleware
async function verifyTurnstile(c: any, next: any) {
  const headerToken = c.req.header('X-Turnstile-Token');
  let token = headerToken;

  if (!token) {
    try {
      const body = await c.req.raw.clone().json();
      token = body.turnstileToken;
    } catch (e) {
      // Body might not be JSON or might be missing turnstileToken
    }
  }

  const secret = c.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error('[AUTH ERROR] TURNSTILE_SECRET_KEY is missing from environment. Rejecting for security.');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  if (!token) {
    return c.json({ error: 'Security verification failed: Missing token' }, 403);
  }

  try {
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome: any = await result.json();
    if (!outcome.success) {
      return c.json({ error: 'Security verification failed: Invalid token' }, 403);
    }

    await next();
  } catch (err: any) {
    console.error('Turnstile verification error:', err);
    return c.json({ error: 'Verification service unreachable' }, 503);
  }
}

// Admin Authorization Middleware
async function verifyAdmin(c: any, next: any) {
  const adminSecret = c.env.ADMIN_TOKEN;
  const providedToken = c.req.header('X-Admin-Token');

  if (!adminSecret) {
    console.error('[AUTH ERROR] ADMIN_TOKEN is missing from environment. Rejecting access.');
    return c.json({ error: 'Administrative access not configured' }, 500);
  }

  if (!providedToken || providedToken !== adminSecret) {
    await logError(c.env.DB, 'unauthorized_admin_access', new Error('Invalid or missing Admin Token'), {
      ip: c.req.header('cf-connecting-ip')
    });
    return c.json({ error: 'Unauthorized: Admin Token required' }, 401);
  }

  await next();
}

// Rate Limiting Middleware
async function rateLimit(c: any, next: any) {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const key = `rl_${ip}`;
  const limit = 5; // 5 reports per minute per IP
  const window = 60; // 60 seconds

  const current = await c.env.RATELIMIT.get(key);
  const count = current ? parseInt(current) : 0;

  if (count >= limit) {
    await logError(c.env.DB, 'rate_limit_exceeded', new Error(`IP ${ip} exceeded rate limit`), { ip, count });
    return c.json({ error: 'Too many requests. Please try again in a minute.' }, 429);
  }

  await c.env.RATELIMIT.put(key, (count + 1).toString(), { expirationTtl: window });
  return next();
}

async function indexDocumentVector(env: Bindings, id: string, title: string, content: string, type: string) {
  if (!env.AI || !env.VECTORIZE) {
     throw new Error('Infrastructure bindings missing (AI/VECTORIZE)');
  }

  try {
    const textToEmbed = `${title}\n\n${content}`.substring(0, 1000); 
    const aiOutput = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
      text: [textToEmbed]
    });
    
    // Workers AI might return direct data or { data: [] } depending on version/types
    const values = Array.isArray(aiOutput) ? aiOutput[0] : aiOutput.data?.[0];
    if (!values) throw new Error(`AI generated no embeddings for ${id}`);

    await env.VECTORIZE.upsert([
      {
        id: id,
        values: values,
        metadata: { title, type, timestamp: new Date().toISOString() }
      }
    ]);
  } catch (err: any) {
    console.error(`[VECTOR ERROR] ${id}:`, err);
    throw err; // RE-THROW so the loop can identify a failure
  }
}

// LST Extraction Helper
async function extractLSTs(db: D1Database, reportContent: string, reportId: string) {
  try {
    // Regex to find things in ## Latent Safety Threats section
    // Actually, it is more reliable to ask Gemini to output a hidden JSON block at the end
    // But for the existing reports, we use a simple parser for Markdown bold labels
    const sections = reportContent.split('##');
    const lstSection = sections.find(s => s.toLowerCase().includes('latent safety threat'));
    
    if (!lstSection) return;

    // Split by individual LST headers (###)
    const findings = lstSection.split('###').slice(1);
    
    for (const finding of findings) {
      const lines = finding.split('\n');
      const title = lines[0].trim();
      const content = finding;
      
      // Extract Recommendation if possible
      const recMatch = finding.match(/\*\*Recommendations:\*\*(.*)/i);
      const recommendation = recMatch ? recMatch[1].trim() : '';
      
      const lstId = `lst_${crypto.randomUUID()}`;
      
      // Check for duplicates (very basic check)
      const existing = await db.prepare('SELECT id FROM lsts WHERE title = ?').bind(title).all();
      if (existing.results?.length > 0) {
        // Update last seen date for recurring issue
        await db.prepare('UPDATE lsts SET last_seen_date = ?, status = ? WHERE title = ?')
          .bind(new Date().toISOString(), 'Recurring', title)
          .run();
      } else {
        await db.prepare('INSERT INTO lsts (id, title, description, recommendation, severity, status, category, identified_date, last_seen_date, related_report_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(lstId, title, content.substring(0, 500), recommendation, 'Medium', 'Identified', 'Process', new Date().toISOString(), new Date().toISOString(), reportId)
          .run();
      }
    }
  } catch (err) {
    console.error('LST Extraction Failed:', err);
  }
}

// Global error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  logError(c.env.DB, 'global_unhandled', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

// --- API Endpoints ---

import { lstsRouter } from './routes/lsts';
app.route('/lsts', lstsRouter);


// R2 Object Storage (File Handling)
app.post('/upload-file', verifyTurnstile, async (c) => {
  try {
    const formData = await c.req.formData();
    const fileItem = formData.get('file');
    
    if (!fileItem || typeof fileItem === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }

    const file = fileItem as unknown as File;
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

app.get('/files/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const object = await c.env.BUCKET.get(path);

  if (!object) return c.json({ error: 'File not found' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
});

// AI Search (RAG) — Powered by Cloudflare AI Search (AutoRAG)
// Uses Workers AI binding to query the 'washu-sim-ssearch' instance
app.post('/ask', rateLimit, async (c) => {
  try {
    const rawData = await c.req.json();
    const parseResult = askSchema.safeParse(rawData);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const { query, stream: doStream } = parseResult.data;

    if (!c.env.AI) {
      return c.json({ error: 'AI binding not configured' }, 503);
    }

    if (doStream) {
      // Streaming response — for the live "typing" effect in the UI
      return streamText(c, async (stream) => {
        try {
          const result = await c.env.AI.autorag('washu-sim-ssearch').aiSearch({
            query,
            rewrite_query: true,
            max_num_results: 5,
            ranking_options: { score_threshold: 0.2 },
            reranking: { enabled: true, model: '@cf/baai/bge-reranker-base' },
            stream: true,
          });
          
          // Forward the stream chunks to the client
          for await (const chunk of result as AsyncIterable<any>) {
            const text = chunk?.response ?? chunk?.text ?? '';
            if (text) await stream.write(text);
          }
        } catch (err: any) {
          await stream.write(`\n\n[AI Search Error: ${err.message}]`);
        }
      });
    } else {
      // Non-streaming — returns full answer + sources
      const result = await c.env.AI.autorag('washu-sim-ssearch').aiSearch({
        query,
        rewrite_query: true,
        max_num_results: 5,
        ranking_options: { score_threshold: 0.2 },
        reranking: { enabled: true, model: '@cf/baai/bge-reranker-base' },
        stream: false,
      });

      return c.json({
        answer: result.response,
        sources: (result.data || []).map((d: any) => ({
          filename: d.filename,
          score: d.score,
          excerpt: d.content?.[0]?.text?.substring(0, 300) ?? '',
        })),
        search_query: result.search_query,
      });
    }
  } catch (error: any) {
    console.error('[ASK] AI Search error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Hybrid Search (Optimization #1 & #2: FTS5 + Vectorize)
app.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) return c.json([]);

  try {
    // 1. Kick off FTS5 keyword search (Fast)
    const ftsPromise = (async () => {
      try {
        const searchQuery = query.includes('*') || query.includes('"') ? query : `${query}*`;
        const { results } = await c.env.DB.prepare(`
          SELECT 
            s.id, 
            s.type, 
            highlight(search_index, 2, '[[HL]]', '[[/HL]]') as title_highlight,
            snippet(search_index, 3, '[[HL]]', '[[/HL]]', '...', 32) as snippet,
            s.title,
            r.metadata
          FROM search_index s
          LEFT JOIN reports r ON s.id = r.id
          WHERE search_index MATCH ? 
          ORDER BY rank
          LIMIT 20
        `)
          .bind(searchQuery)
          .all();
        return results.map((res: any) => ({
          ...res,
          metadata: res.metadata ? JSON.parse(res.metadata) : {},
          matchType: 'keyword' as const,
          score: 1.0 // Exact matches get the highest score
        }));
      } catch (e) {
        console.error('FTS Search Error:', e);
        return [];
      }
    })();

    // 2. Kick off Semantic Search if AI bindings available
    const semanticPromise = (async () => {
      try {
        if (!c.env.AI || !c.env.VECTORIZE) return [];
        
        // Generate embedding for query
        const aiOutput = await c.env.AI.run('@cf/baai/bge-small-en-v1.5', {
          text: [query]
        });
        const queryVector = Array.isArray(aiOutput) ? aiOutput[0] : aiOutput.data?.[0];
        
        if (!queryVector) return [];

        // Search Vectorize
        const matches = await c.env.VECTORIZE.query(queryVector, {
          topK: 15,
          returnMetadata: 'all'
        });

        if (matches.matches.length === 0) return [];

        // Hydrate from DB
        const ids = matches.matches.map(m => m.id);
        const placeholders = ids.map(() => '?').join(',');
        const { results } = await c.env.DB.prepare(`
          SELECT 
            id, 
            title, 
            content as snippet,
            'report' as type
          FROM reports 
          WHERE id IN (${placeholders})
        `)
          .bind(...ids)
          .all();

        return results.map((res: any) => ({
          ...res,
          matchType: 'semantic' as const,
          score: matches.matches.find(m => m.id === res.id)?.score || 0.5
        }));
      } catch (e) {
        console.error('Semantic Search Error:', e);
        return [];
      }
    })();

    // 3. Await both and merge
    const [ftsResults, semanticResults] = await Promise.all([ftsPromise, semanticPromise]);
    
    // 4. De-duplicate (Prioritize Keywords)
    const combinedMap = new Map<string, any>();
    
    // Add semantic first
    semanticResults.forEach((res: any) => combinedMap.set(res.id, res));
    // Overwrite/Add keywords (since they might have highlights and top scores)
    ftsResults.forEach((res: any) => combinedMap.set(res.id, {
       ...res,
       // If it was already in semantic, we keep the semantic score if it was higher or just mark it as keyword
       isHybrid: combinedMap.has(res.id)
    }));

    const finalResults = Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score);

    return c.json(finalResults);

  } catch (error: any) {
    console.error('Hybrid Search Failure:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Report Generation (Gemini AI Implementation & Streaming)
app.post('/generate-report', verifyTurnstile, rateLimit, async (c) => {
  try {
    const { selectedReports, selectedNotes, selectedCases, extractLST } = await c.req.json();
    
    if (!selectedNotes || selectedNotes.length === 0) {
      return c.json({ error: 'At least one session note must be selected' }, 400);
    }

    const geminiApiKey = c.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return c.json({ error: 'Gemini API key not configured' }, 500);
    }

    // Get the user's preferred model
    const { results: modelRes } = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('ai_model_preference').all();
    let modelPreference = 'gemini-flash-latest';
    if (modelRes[0]) {
      const val = modelRes[0].value as string;
      try {
        // Handle cases where it might be double-quoted or raw
        if (val.startsWith('"')) {
          modelPreference = JSON.parse(val);
        } else {
          modelPreference = val;
        }
      } catch (e) {
        modelPreference = val;
      }
    }

    // Fetch the context
    const reportsRes = await c.env.DB.prepare(`SELECT * FROM reports WHERE id IN (${selectedReports.map(() => '?').join(',')})`).bind(...selectedReports).all();
    const notesRes = await c.env.DB.prepare(`SELECT * FROM session_notes WHERE id IN (${selectedNotes.map(() => '?').join(',')})`).bind(...selectedNotes).all();
    // Fetch the context for case files
    let cases: any[] = [];
    if (selectedCases && selectedCases.length > 0) {
      // 1. Try relational table
      const relCases = await c.env.DB.prepare(`SELECT * FROM case_files WHERE id IN (${selectedCases.map(() => '?').join(',')})`).bind(...selectedCases).all();
      if (relCases.results) {
        cases = [...relCases.results];
      }
      
      // 2. Fallback to settings blob for missing cases
      if (cases.length < selectedCases.length) {
        const { results: fallbackRes } = await c.env.DB.prepare(`SELECT value FROM settings WHERE key = 'case_files'`).all();
        if (fallbackRes[0]) {
          const allLegacy = JSON.parse(fallbackRes[0].value as string);
          const legacyMatches = allLegacy.filter((cf: any) => 
            selectedCases.includes(cf.id) && !cases.some(c => c.id === cf.id)
          );
          cases = [...cases, ...legacyMatches];
        }
      }
    }

    const priorReportsContext = reportsRes.results.map((r: any, i: number) => `=== PRIOR REPORT ${i + 1}: ${r.title} ===\n${r.content}\n`).join('\n');
    const sessionNotesContext = notesRes.results.map((n: any, i: number) => `=== SESSION ${i + 1}: ${n.session_name} ===\nNotes:\n${n.notes}\n`).join('\n');
    const caseFilesContext = cases.map((c: any, i: number) => `=== CASE FILE ${i + 1}: ${c.title} ===\n${c.content}\n`).join('\n');

    const prompt = `${PROMPT_TEMPLATE}\n\n=== CONTEXT ===\n${priorReportsContext}\n${sessionNotesContext}\n${caseFilesContext}`;

    // Start streaming
    return streamText(c, async (stream) => {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelPreference}:streamGenerateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errorData: any = await geminiRes.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${geminiRes.status}`);
      }

      const reader = geminiRes.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');

      let fullReport = '';
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Gemini streaming JSON often comes as elements in an array: [{}, {}, ...]
        // We need to parse individual JSON objects from the stream.
        // It's safer to split by something identifiable or accumulate until a valid JSON object is found.
        
        let boundary = buffer.indexOf('}\n,');
        if (boundary === -1) boundary = buffer.indexOf('}]'); // End of stream
        
        while (boundary !== -1) {
          let part = buffer.substring(0, boundary + 1).trim();
          // Remove leading array bracket or comma
          if (part.startsWith('[')) part = part.substring(1);
          if (part.startsWith(',')) part = part.substring(1);
          
          try {
            const json = JSON.parse(part);
            if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
              const text = json.candidates[0].content.parts[0].text;
              fullReport += text;
              await stream.write(text);
            }
          } catch (e) {
            console.error('Partial JSON parse failed:', e, part);
          }
          
          buffer = buffer.substring(boundary + 2);
          boundary = buffer.indexOf('}\n,');
          if (boundary === -1) boundary = buffer.indexOf('}]');
        }
      }

      // Final attempt for anything remaining in buffer
      if (buffer.trim()) {
        try {
          let lastPart = buffer.trim();
          if (lastPart.endsWith(']')) lastPart = lastPart.slice(0, -1);
          if (lastPart.startsWith(',')) lastPart = lastPart.substring(1);
          const json = JSON.parse(lastPart);
          if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
             const text = json.candidates[0].content.parts[0].text;
             fullReport += text;
             await stream.write(text);
          }
        } catch (e) {}
      }

      // After stream completes, save the full report to D1 (fire and forget)
      const reportId = `report_${crypto.randomUUID()}`;
      c.executionCtx.waitUntil((async () => {
         try {
           const reportTitle = `AI Created - ${new Date().toLocaleDateString()}`;
           await c.env.DB.prepare('INSERT INTO reports (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)')
             .bind(reportId, reportTitle, fullReport, 'generated_report', JSON.stringify({ createdAt: new Date().toISOString() }))
             .run();
           
           // Write to R2 as markdown so Cloudflare AI Search can index it
           const r2Key = `reports/generated/${reportId}.md`;
           const markdownContent = `# ${reportTitle}\n\nGenerated: ${new Date().toISOString()}\n\n${fullReport}`;
           await c.env.BUCKET.put(r2Key, markdownContent, {
             httpMetadata: { contentType: 'text/markdown' },
             customMetadata: { reportId, type: 'generated_report', title: reportTitle }
           });
           
           // AUTO-EXTRACT LSTS (AI POWERED) - Conditioned by user toggle
           if (extractLST !== false) {
             await extractAndScoreLSTs(c.env.DB, fullReport, reportId, c.env.GEMINI_API_KEY);
           }
           
           c.executionCtx.waitUntil(indexDocumentVector(c.env, reportId, reportTitle, fullReport, 'report'));
           await logAudit(c.env.DB, 'generate', 'report', `Streaming report complete`, reportId);
         } catch (dbErr) {
           console.error('Failed to save generated report:', dbErr);
         }
      })());
    });
  } catch (error: any) {
    await logError(c.env.DB, 'streaming_report', error);
    return c.json({ error: error.message }, 500);
  }
});

// Reports
app.get('/reports', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);

    const { results } = await c.env.DB.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    return c.json({ 
      reports: results.map((r: any) => ({
        ...r,
        createdAt: r.created_at,
        date: r.created_at, // Use created_at as the primary date for the library
        metadata: r.metadata ? JSON.parse(r.metadata) : {}
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/reports/generated', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);

    const { results } = await c.env.DB.prepare("SELECT * FROM reports WHERE type = 'generated_report' ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .bind(limit, offset)
      .all();
    return c.json({ 
      reports: results.map((r: any) => ({
        ...r,
        createdAt: r.created_at,
        date: r.created_at, // Use created_at as the primary date for the library
        metadata: r.metadata ? JSON.parse(r.metadata) : {}
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/reports/upload', verifyTurnstile, async (c) => {
  try {
    const rawData = await c.req.json();
    const parseResult = reportUploadSchema.safeParse(rawData);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const reportData = parseResult.data;
    
    const id = reportData.id || `report_${crypto.randomUUID()}`;
    const title = reportData.title;
    const content = reportData.content;
    
    await c.env.DB.prepare('INSERT INTO reports (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)')
      .bind(id, title, content, reportData.type || 'prior_report', JSON.stringify(reportData.metadata || {}))
      .run();

    // Write to R2 as markdown so Cloudflare AI Search can index it
    const r2Key = `reports/uploaded/${id}.md`;
    const markdownContent = `# ${title}\n\nUploaded: ${new Date().toISOString()}\nType: ${reportData.type || 'prior_report'}\n\n${content}`;
    c.executionCtx.waitUntil(
      c.env.BUCKET.put(r2Key, markdownContent, {
        httpMetadata: { contentType: 'text/markdown' },
        customMetadata: { reportId: id, type: reportData.type || 'prior_report', title }
      })
    );
      
    await logAudit(c.env.DB, 'upload', reportData.type || 'report', title, id);
    // Index for semantic search (Vectorize)
    c.executionCtx.waitUntil(indexDocumentVector(c.env, id, title, content, 'report'));
    return c.json({ success: true, report: reportData });
  } catch (error: any) {
    await logError(c.env.DB, 'report_upload', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/reports/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM reports WHERE id = ?').bind(id).run();
    await logAudit(c.env.DB, 'delete', 'report', `Deleted report ${id}`, id);
    return c.json({ success: true });
  } catch (error: any) {
    await logError(c.env.DB, 'report_delete', error);
    return c.json({ error: error.message }, 500);
  }
});

// Prompt Template (Official WashU EM Simulation Version)
const PROMPT_TEMPLATE = `Role: You are an expert Medical Simulation Specialist and Education Consultant for the Washington University Department of Emergency Medicine. Your goal is to generate professional, actionable Post-Session Reports that prioritize psychological safety and a "Just Culture" framework.

Objective: Generate a Post-Session Report based on the provided session notes and case files that mirrors the structure of the prior reports while maintaining a supportive, growth-oriented tone.

CRITICAL FORMATTING REQUIREMENT: You MUST output the entire report using strict Markdown formatting. Follow these rules exactly:

1. MARKDOWN STRUCTURE:
   - Use # for the main report title (e.g., # WUCS FACULTY DEV Report)
   - Use ## for major sections (e.g., ## Latent Safety Threats, ## Best Practice Supports)
   - Use ### for specific findings and subsections (e.g., ### Chest Tube Tray Availability, ### Massive Transfusion Protocol)
   - Use **bold text** for inline labels like **Current State:**, **Impact:**, **Recommendations:**, and **Definition:**
   - Use bullet points with - for lists (Objectives, Attendance, etc.)
   - Use italics with *text* for direct quotes or "voice of the room" statements

2. STANDARD DEFINITIONS SECTION:
   Always include these three definitions near the top of the report (after title and session info, before main content):

   **In-Situ Simulation:** A simulation conducted in the actual clinical environment where care is typically delivered, using real equipment and spaces to identify system-level issues.

   **Latent Safety Threat:** A system-level condition or gap that increases the likelihood of errors or adverse events. These are environmental, equipment, or process-related issues rather than individual performance problems.

   **Best Practice Support:** An existing system, resource, or process that effectively facilitates safe and high-quality care delivery.

Phase 1: Structural Analysis (Internal)
Analyze the prior reports to identify the sequence of headings, typical narrative flow, and the level of detail expected in each section.

Phase 2: Content Synthesis & Tone Guardrails

Just Culture Perspective: Focus heavily on Latent Safety Threats (LSTs). These are system-level issues like equipment availability, cognitive load, or environmental factors.

Non-Punitive Language: Use objective and constructive phrasing. Replace "The resident failed to..." with "The team encountered challenges with..." or "An opportunity for optimized workflow was identified in...".

Psychological Safety: Acknowledge the complexity of the scenario. Frame findings as "Learning Points" and "Opportunities for System Improvement" rather than "Mistakes" or "Errors."

Observer Synthesis: Aggregate feedback from multiple facilitators to highlight "Common Threads" in a way that feels like a collective learning experience.

Phase 3: Formatting & Constraints

MARKDOWN ONLY: Use strict Markdown formatting as specified above. The # symbols for headers, ** for bold, * for italics.

No Preamble: Start immediately with the # main title.

Identical Structure: Replicate the exact section headers and organizational flow from the prior reports.

Plain Text with Markdown: Output plain text with Markdown formatting only. No HTML or other markup.

Tone: Professional, objective, and encouraging. Avoid "harsh" or judgmental adjectives.

No Em Dashes: Do not use em dashes; utilize commas, colons, or parentheses instead.

Generate the Post-Session Report now using strict Markdown formatting.`;

app.get('/prompt-template', verifyAdmin, (c) => {
  return c.json({ template: PROMPT_TEMPLATE });
});

// Model Preference
app.get('/model-preference', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('ai_model_preference').all();
    if (!results[0]) return c.json({ model: 'gemini-flash-latest' });
    const val = results[0].value as string;
    let model = val;
    if (val.startsWith('"')) {
       try { model = JSON.parse(val); } catch(e) {}
    }
    return c.json({ model });
  } catch (error: any) {
    return c.json({ model: 'gemini-flash-latest' });
  }
});

app.post('/model-preference', verifyAdmin, async (c) => {
  try {
    const { model } = await c.req.json();
    await c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind('ai_model_preference', model)
      .run();
    
    await logAudit(c.env.DB, 'update', 'settings', `Changed AI model to ${model}`, 'settings');
    return c.json({ success: true, model });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});


import { notesRouter } from './routes/notes';
app.route('/notes', notesRouter);

// Case Files
app.get('/case-files', async (c) => {
  try {
    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const offset = Number(c.req.query('offset') || 0);

    // Try relational table first
    const { results } = await c.env.DB.prepare('SELECT * FROM case_files ORDER BY date DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    if (results && results.length > 0) {
      return c.json(results.map((cf: any) => ({
        ...cf,
        type: 'case_file',
        createdAt: cf.created_at || cf.date, // Fallback to date if created_at is missing
        htmlContent: cf.html_content || '',
        metadata: {
          uploaderName: cf.uploader_name || '',
          caseType: cf.case_type || ''
        }
      })));
    }

    // Fallback to settings blob for legacy data
    const { results: fallback } = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('case_files').all();
    return c.json(fallback[0] ? JSON.parse(fallback[0].value as string) : []);
  } catch (error: any) {
    return c.json([]);
  }
});

app.post('/case-files/upload', verifyTurnstile, async (c) => {
  try {
    const rawData = await c.req.json();
    const parseResult = caseFileUploadSchema.safeParse(rawData);
    if (!parseResult.success) {
      return c.json({ error: 'Validation failed', details: parseResult.error.issues }, 400);
    }
    const data = parseResult.data;
    const id = data.id || `case_file_${crypto.randomUUID()}`;
    

    
    await c.env.DB.prepare('INSERT INTO case_files (id, title, content, html_content, date, uploader_name, case_type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, data.title || 'Untitled Case', data.content || '', data.htmlContent || '', data.date || new Date().toISOString(), data.metadata?.uploaderName || '', data.metadata?.caseType || '')
      .run();
      
    await logAudit(c.env.DB, 'upload', 'case_file', data.title || 'Untitled Case', id);
    return c.json({ success: true, id });
  } catch (error: any) {
    await logError(c.env.DB, 'case_file_upload', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/case-files/:id', verifyAdmin, async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM case_files WHERE id = ?').bind(id).run();
    
    // Also try removing from legacy settings list (if present)
    const { results } = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('case_files').all();
    if (results[0]) {
      const allCases = JSON.parse(results[0].value as string);
      const filtered = allCases.filter((cf: any) => cf.id !== id);
      await c.env.DB.prepare('UPDATE settings SET value = ? WHERE key = ?').bind(JSON.stringify(filtered), 'case_files').run();
    }
    
    await logAudit(c.env.DB, 'delete', 'case_file', `Deleted case file ${id}`, id);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Error Logs
app.get('/error-log', verifyAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 100').all();
    return c.json(results.map((r: any) => ({
      ...r,
      context: r.context ? JSON.parse(r.context) : null
    })));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/error-log', verifyAdmin, async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM error_logs').run();
    await logAudit(c.env.DB, 'clear', 'system', 'Error Log Cleared', 'error-log');
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Backup & Restore
app.get('/backup', verifyAdmin, async (c) => {
  try {
    const [reports, lsts, notes, audit] = await c.env.DB.batch([
      c.env.DB.prepare('SELECT * FROM reports'),
      c.env.DB.prepare('SELECT * FROM lsts'),
      c.env.DB.prepare('SELECT * FROM session_notes'),
      c.env.DB.prepare('SELECT * FROM audit_logs')
    ]);
    
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '2.0-cloudflare',
      reports: reports.results,
      lsts: lsts.results,
      sessionNotes: notes.results,
      auditLog: audit.results
    };
    
    await logAudit(c.env.DB, 'export', 'backup', 'Full System Backup (Cloudflare)', 'backup');
    return c.json(backup);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});


// ─────────────────────────────────────────────────────
// Cron: Automated R2 Backup
// ─────────────────────────────────────────────────────

async function scheduledBackup(env: Bindings) {
  try {
    const [reports, lsts, notes, cases] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM reports'),
      env.DB.prepare('SELECT * FROM lsts'),
      env.DB.prepare('SELECT * FROM session_notes'),
      env.DB.prepare('SELECT * FROM case_files'),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '3.1.2-auto',
      reports: reports.results,
      lsts: lsts.results,
      sessionNotes: notes.results,
      caseFiles: cases.results,
    };

    const key = `backups/auto_${new Date().toISOString().split('T')[0]}.json`;
    await env.BUCKET.put(key, JSON.stringify(backup), {
      httpMetadata: { contentType: 'application/json' },
    });

    console.log(`[CRON] Automated backup saved to R2: ${key}`);
  } catch (error) {
    console.error('[CRON] Backup failed:', error);
  }
}

// Admin: Re-index all documents for semantic search
app.post('/admin/reindex', verifyAdmin, async (c) => {
  try {
    if (!c.env.AI || !c.env.VECTORIZE) {
      return c.json({ error: 'AI and Vectorize bindings are not configured on this worker environment. Check wrangler.toml and deploy again.' }, 503);
    }

    // 1. Fetch all reports
    const { results: reports } = await c.env.DB.prepare('SELECT id, title, content FROM reports').all();
    
    // 2. Chunks of 5 for re-indexing (balance speed and AI rate limits)
    let count = 0;
    const chunkSize = 5;
    for (let i = 0; i < reports.length; i += chunkSize) {
      const chunk = reports.slice(i, i + chunkSize);
      await Promise.all(chunk.map(report => 
         indexDocumentVector(c.env, report.id as string, report.title as string, report.content as string, 'report')
      ));
      count += chunk.length;
    }

    await logAudit(c.env.DB, 'reindex', 'admin', `Manually re-indexed ${count} documents`, 'system');
    return c.json({ success: true, indexed: count });
  } catch (error: any) {
    console.error('Re-index administrative failure:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Final check: Version identifier for deployment confirmation
app.get('/health', (c) => c.json({ status: 'ok', version: '3.5.0' }));

export default {
  fetch: (request: Request, env: Bindings, ctx: ExecutionContext) => {
    return app.fetch(request, env, ctx);
  },
  scheduled: async (event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) => {
    ctx.waitUntil(scheduledBackup(env));
  },
};
