/**
 * WashU EM Sim Intelligence Worker - v3.1.2
 * Automatic deployment test triggered via GitHub Actions
 */
import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { cache } from 'hono/cache';
import { extractAndScoreLSTs } from './utils/ai';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  RATELIMIT: KVNamespace;
  GEMINI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 1. Security Headers Middleware
app.use('*', secureHeaders());

// 2. Base Middlewares
app.use('*', honoLogger());
app.use('*', cors());

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

// --- HYDRATE ENDPOINT (Optimization #5) ---
// Fetches all major app state in a single request to reduce network RTT
app.get('/hydrate', async (c) => {
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
      
      const lstId = `lst_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
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

// LST Extraction Tracker
app.get('/lsts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM lsts ORDER BY CASE WHEN status = "Resolved" THEN 1 ELSE 0 END, CASE WHEN severity = "High" THEN 0 WHEN severity = "Medium" THEN 1 ELSE 2 END, last_seen_date DESC').all();
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

app.put('/lsts/:id', async (c) => {
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

app.post('/lsts/add', async (c) => {
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

// ... LST history handled below

// --- LST HISTORY ENDPOINT (Optimization #4) ---
app.get('/lsts/:id/history', async (c) => {
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

// Full-Text Search (Optimization #1)
app.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) return c.json([]);

  try {
    // Search using FTS5 MATCH operator
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
      LIMIT 50
    `)
      .bind(searchQuery)
      .all();
    
    return c.json(results.map((res: any) => ({
      ...res,
      metadata: res.metadata ? JSON.parse(res.metadata) : {}
    })));
  } catch (error: any) {
    console.error('FTS Search Error:', error);
    // Silent fallback to basic LIKE if FTS fails (e.g. index not yet populated)
    const { results } = await c.env.DB.prepare('SELECT id, title, content, type FROM reports WHERE title LIKE ? OR content LIKE ? LIMIT 20')
      .bind(`%${query}%`, `%${query}%`)
      .all();
    return c.json(results);
  }
});

// Report Generation (Gemini AI Implementation & Streaming)
app.post('/generate-report', rateLimit, async (c) => {
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
        throw new Error(`Gemini API error: ${geminiRes.status}`);
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
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      c.executionCtx.waitUntil((async () => {
         try {
           await c.env.DB.prepare('INSERT INTO reports (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)')
             .bind(reportId, `AI Created - ${new Date().toLocaleDateString()}`, fullReport, 'generated_report', JSON.stringify({ createdAt: new Date().toISOString() }))
             .run();
           
           // AUTO-EXTRACT LSTS (AI POWERED) - Conditioned by user toggle
           if (extractLST !== false) {
             await extractAndScoreLSTs(c.env.DB, fullReport, reportId, c.env.GEMINI_API_KEY);
           }
           
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
    const { results } = await c.env.DB.prepare('SELECT * FROM reports ORDER BY created_at DESC').all();
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
    const { results } = await c.env.DB.prepare("SELECT * FROM reports WHERE type = 'generated_report' ORDER BY created_at DESC").all();
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

app.post('/reports/upload', async (c) => {
  try {
    const reportData = await c.req.json();
    const id = reportData.id || `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    await c.env.DB.prepare('INSERT INTO reports (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)')
      .bind(id, reportData.title || 'Untitled Report', reportData.content || '', reportData.type || 'prior_report', JSON.stringify(reportData.metadata || {}))
      .run();
      
    await logAudit(c.env.DB, 'upload', reportData.type || 'report', reportData.title || 'Untitled Report', id);
    return c.json({ success: true, report: reportData });
  } catch (error: any) {
    await logError(c.env.DB, 'report_upload', error);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/reports/:id', async (c) => {
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

app.get('/prompt-template', (c) => {
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

app.post('/model-preference', async (c) => {
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


// Session Notes
app.get('/notes', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM session_notes ORDER BY created_at DESC').all();
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

app.post('/notes/add', async (c) => {
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

app.delete('/notes/:id', async (c) => {
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

// Case Files
app.get('/case-files', async (c) => {
  try {
    // Try relational table first
    const { results } = await c.env.DB.prepare('SELECT * FROM case_files ORDER BY date DESC').all();
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

app.post('/case-files/upload', async (c) => {
  try {
    const data = await c.req.json();
    const id = data.id || `case_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Ensure table exists (idempotent for safety)
    await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS case_files (id TEXT PRIMARY KEY, title TEXT, content TEXT, html_content TEXT, date TEXT, uploader_name TEXT, case_type TEXT, created_at DATETIME DEFAULT (strftime("%Y-%m-%dT%H:%M:%f", "now", "utc")))').run();
    
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

