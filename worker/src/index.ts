import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  RATELIMIT: KVNamespace;
  GEMINI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', honoLogger());
app.use('*', cors());

// Error logging helper for Cloudflare
async function logError(db: D1Database, action: string, error: any, context?: any) {
  try {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`;
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
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await db.prepare('INSERT INTO audit_logs (id, action, type, target, target_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(auditId, action, type, target, id, new Date().toISOString())
      .run();
  } catch (error) {
    console.log(`Error logging audit: ${error}`);
  }
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

// Global error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  logError(c.env.DB, 'global_unhandled', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

// --- API Endpoints ---

// LST Tracker
app.get('/lsts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM lsts ORDER BY created_at DESC').all();
    return c.json(results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/lsts', async (c) => {
  try {
    const lst = await c.req.json();
    const id = lst.id || `lst_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await c.env.DB.prepare('INSERT INTO lsts (id, title, description, recommendation, severity, status, category, location, identified_date, last_seen_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, lst.title, lst.description, lst.recommendation, lst.severity, lst.status, lst.category, lst.location, lst.identifiedDate, lst.lastSeenDate)
      .run();
      
    await logAudit(c.env.DB, 'create', 'lst', lst.title, id);
    return c.json({ success: true, id });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/lsts/merge', async (c) => {
  try {
    const { ids, mergedLST } = await c.req.json();
    if (!ids || !Array.isArray(ids) || ids.length < 2) {
      return c.json({ error: 'At least two LSTs are required for merging' }, 400);
    }

    const newId = `lst_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Create new LST
    await c.env.DB.prepare('INSERT INTO lsts (id, title, description, recommendation, severity, status, category, location, identified_date, last_seen_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId, mergedLST.title, mergedLST.description, mergedLST.recommendation, mergedLST.severity, mergedLST.status, mergedLST.category, mergedLST.location, mergedLST.identifiedDate, mergedLST.lastSeenDate)
      .run();

    // Delete old ones
    for (const id of ids) {
      await c.env.DB.prepare('DELETE FROM lsts WHERE id = ?').bind(id).run();
    }

    await logAudit(c.env.DB, 'merge', 'lst', `Merged ${ids.length} LSTs into ${mergedLST.title}`, newId);
    return c.json({ success: true, id: newId });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// R2 Object Storage (File Handling)
app.post('/upload-file', async (c) => {
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

// Full-Text Search
app.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) return c.json([]);

  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM reports_fts WHERE reports_fts MATCH ? ORDER BY rank')
      .bind(query)
      .all();
    return c.json(results);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Report Generation (Gemini AI Implementation & Streaming)
app.post('/generate-report', rateLimit, async (c) => {
  try {
    const { selectedReports, selectedNotes, selectedCases } = await c.req.json();
    
    if (!selectedNotes || selectedNotes.length === 0) {
      return c.json({ error: 'At least one session note must be selected' }, 400);
    }

    const geminiApiKey = c.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return c.json({ error: 'Gemini API key not configured' }, 500);
    }

    // Get the user's preferred model
    const { results: modelRes } = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('ai_model_preference').all();
    const modelPreference = modelRes[0] ? JSON.parse(modelRes[0].value as string) : 'gemini-flash-latest';

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
        throw new Error(`Gemini API error: ${geminiRes.status}`);
      }

      const reader = geminiRes.body?.getReader();
      if (!reader) throw new Error('Failed to get stream reader');

      let fullReport = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Gemini streaming returns JSON blobs in an array, we parse and stream the text
        try {
           const lines = chunk.split('\n').filter(l => l.trim() !== '');
           for (const line of lines) {
             const json = JSON.parse(line.replace(/^,/, ''));
             const text = json.candidates[0].content.parts[0].text;
             fullReport += text;
             await stream.write(text);
           }
        } catch (e) { /* ignore chunking errors during JSON stream */ }
      }

      // After stream completes, save the full report to D1 (fire and forget)
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      c.executionCtx.waitUntil((async () => {
         await c.env.DB.prepare('INSERT INTO reports (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)')
           .bind(reportId, `AI Created - ${new Date().toLocaleDateString()}`, fullReport, 'generated_report', JSON.stringify({ createdAt: new Date().toISOString() }))
           .run();
         await logAudit(c.env.DB, 'generate', 'report', `Streaming report complete`, reportId);
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
    const { results } = await c.env.DB.prepare('SELECT * FROM reports ORDER BY created_at DESC').all();
    return c.json({ 
      reports: results.map((r: any) => ({
        ...r,
        metadata: r.metadata ? JSON.parse(r.metadata) : {}
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/reports/upload', async (c) => {
  try {
    const reportData = await c.req.json();
    const id = reportData.id || `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await c.env.DB.prepare('INSERT INTO reports (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)')
      .bind(id, reportData.title, reportData.content, reportData.type, JSON.stringify(reportData.metadata || {}))
      .run();
      
    await logAudit(c.env.DB, 'upload', reportData.type, reportData.title, id);
    return c.json({ success: true, report: reportData });
  } catch (error: any) {
    await logError(c.env.DB, 'report_upload', error);
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

app.get('/prompt-template', (c) => {
  return c.json({ template: PROMPT_TEMPLATE });
});

// Model Preference
app.get('/model-preference', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('ai_model_preference').all();
    return c.json({ model: results[0] ? JSON.parse(results[0].value as string) : 'gemini-flash-latest' });
  } catch (error: any) {
    return c.json({ model: 'gemini-flash-latest' });
  }
});

app.post('/model-preference', async (c) => {
  try {
    const { model } = await c.req.json();
    await c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind('ai_model_preference', JSON.stringify(model))
      .run();
    
    await logAudit(c.env.DB, 'update', 'settings', `Changed AI model to ${model}`, 'settings');
    return c.json({ success: true, model });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/settings/ai-model', async (c) => {
  // Keeping this for backward compatibility if any old components use it
  try {
    const { model } = await c.req.json();
    await c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind('ai_model_preference', JSON.stringify(model))
      .run();
      
    await logAudit(c.env.DB, 'update', 'settings', `Changed AI model to ${model}`, 'settings');
    return c.json({ success: true, model });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Session Notes
app.get('/notes', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM session_notes ORDER BY created_at DESC').all();
    return c.json(results.map((n: any) => ({
      ...n,
      participants: n.participants ? JSON.parse(n.participants) : [],
      tags: n.tags ? JSON.parse(n.tags) : [],
      metadata: n.metadata ? JSON.parse(n.metadata) : {}
    })));
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/notes/add', async (c) => {
  try {
    const note = await c.req.json();
    const id = note.id || `notes_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await c.env.DB.prepare('INSERT INTO session_notes (id, session_name, notes, participants, tags, metadata) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, note.sessionName, note.notes, JSON.stringify(note.participants || []), JSON.stringify(note.tags || []), JSON.stringify(note.metadata || {}))
      .run();
      
    await logAudit(c.env.DB, 'create', 'session_notes', note.sessionName, id);
    return c.json({ success: true, notes: { ...note, id } });
  } catch (error: any) {
    await logError(c.env.DB, 'note_upload', error);
    return c.json({ error: error.message }, 500);
  }
});

// Case Files
app.get('/case-files', async (c) => {
  try {
    // Try relational table first
    const { results } = await c.env.DB.prepare('SELECT * FROM case_files ORDER BY date DESC').all();
    if (results && results.length > 0) {
      return c.json(results.map((cf: any) => ({
        ...cf,
        type: 'case_file',
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

app.post('/case-files/upload', async (c) => {
  try {
    const data = await c.req.json();
    const id = data.id || `case_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Ensure table exists (idempotent for safety)
    await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS case_files (id TEXT PRIMARY KEY, title TEXT, content TEXT, html_content TEXT, date TEXT, uploader_name TEXT, case_type TEXT)').run();
    
    await c.env.DB.prepare('INSERT INTO case_files (id, title, content, html_content, date, uploader_name, case_type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, data.title, data.content, data.htmlContent || '', data.date || new Date().toISOString(), data.metadata?.uploaderName || '', data.metadata?.caseType || '')
      .run();
      
    await logAudit(c.env.DB, 'upload', 'case_file', data.title, id);
    return c.json({ success: true, id });
  } catch (error: any) {
    await logError(c.env.DB, 'case_file_upload', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/case-files/:id', async (c) => {
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
app.get('/error-log', async (c) => {
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

app.delete('/error-log', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM error_logs').run();
    await logAudit(c.env.DB, 'clear', 'system', 'Error Log Cleared', 'error-log');
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Backup & Restore
app.get('/backup', async (c) => {
  try {
    const reports = await c.env.DB.prepare('SELECT * FROM reports').all();
    const lsts = await c.env.DB.prepare('SELECT * FROM lsts').all();
    const notes = await c.env.DB.prepare('SELECT * FROM session_notes').all();
    const audit = await c.env.DB.prepare('SELECT * FROM audit_logs').all();
    
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

// Model Preference
app.get('/model-preference', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('ai_model_preference').all();
    return c.json({ model: results[0] ? JSON.parse(results[0].value as string) : 'gemini-flash-latest' });
  } catch (error: any) {
    return c.json({ model: 'gemini-flash-latest' });
  }
});

app.post('/settings/ai-model', async (c) => {
  try {
    const { model } = await c.req.json();
    await c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .bind('ai_model_preference', JSON.stringify(model))
      .run();
      
    await logAudit(c.env.DB, 'update', 'settings', `Changed AI model to ${model}`, 'settings');
    return c.json({ success: true, model });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;

