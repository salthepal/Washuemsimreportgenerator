import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';
import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
import { sanitizeText, sanitizeObject, validateText } from './text-sanitizer.tsx';

const app = new Hono();

// Initialize database table
async function initializeDatabase() {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    // Create table if it doesn't exist using SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (
          key TEXT NOT NULL PRIMARY KEY,
          value JSONB NOT NULL
        );
      `
    });

    if (error) {
      console.error('Table initialization error (this is OK if table exists):', error.message);
      // Try alternative method - direct SQL execution
      const { error: sqlError } = await supabase.from('kv_store_7fe18c53').select('key').limit(1);
      if (sqlError) {
        console.error('Table does not exist. Please create it manually in Supabase dashboard.');
        console.log('Run this SQL in Supabase SQL Editor:');
        console.log('CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (key TEXT NOT NULL PRIMARY KEY, value JSONB NOT NULL);');
      } else {
        console.log('Database table verified successfully');
      }
    } else {
      console.log('Database table initialized successfully');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    console.log('Please ensure the kv_store_7fe18c53 table exists in your Supabase database');
  }
}

// Initialize on startup
initializeDatabase();

// Enable CORS and logging
app.use('*', cors({
  origin: '*',
  credentials: true,
}));
app.use('*', logger(console.log));

// Global error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ 
    error: err.message || 'Internal server error',
    details: err.stack 
  }, 500);
});

// Health check
app.get('/make-server-7fe18c53/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint to see ALL keys in database
app.get('/make-server-7fe18c53/debug/all-keys', async (c) => {
  try {
    const allData = await kv.getByPrefix('');
    console.log('ALL DATABASE ENTRIES:', allData.length);
    console.log('First entry full data:', JSON.stringify(allData[0], null, 2));
    return c.json({ 
      total: allData.length,
      keys: allData.map(item => ({
        id: item.id,
        type: item.type,
        title: item.title || item.sessionName,
        hasContent: !!item.content,
        contentLength: item.content?.length || 0
      })),
      rawFirstEntry: allData[0]
    });
  } catch (error) {
    console.log(`Error in debug endpoint: ${error}`);
    return c.json({ error: error.message }, 500);
  }
});

// Upload a prior report
app.post('/make-server-7fe18c53/reports/upload', async (c) => {
  try {
    let { title, content, htmlContent, date, tags, metadata } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: 'Title and content are required' }, 400);
    }

    // Sanitize all text inputs to remove problematic Unicode characters
    title = sanitizeText(title);
    content = sanitizeText(content);
    if (htmlContent) {
      htmlContent = sanitizeText(htmlContent);
    }
    
    // Sanitize metadata object
    if (metadata) {
      metadata = sanitizeObject(metadata);
    }
    
    // Sanitize tags array
    if (tags && Array.isArray(tags)) {
      tags = tags.map((tag: string) => sanitizeText(tag));
    }
    
    // Validate that critical fields don't contain problematic characters
    const titleValidation = validateText(title);
    if (titleValidation) {
      console.error('Title validation error:', titleValidation);
      return c.json({ error: `Title contains invalid characters: ${titleValidation}` }, 400);
    }
    
    const contentValidation = validateText(content);
    if (contentValidation) {
      console.error('Content validation error:', contentValidation);
      return c.json({ error: `Content contains invalid characters: ${contentValidation}` }, 400);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const report = {
      id: reportId,
      title,
      content,
      htmlContent: htmlContent || null,
      date: date || new Date().toISOString(),
      tags: tags || [],
      metadata: metadata || {},
      type: 'prior_report',
      createdAt: new Date().toISOString(),
    };

    console.log('Saving sanitized report with ID:', reportId, 'type:', report.type);
    await kv.set(reportId, report);
    console.log('Report saved successfully');
    
    // Verify it was saved by reading it back
    const savedReport = await kv.get(reportId);
    console.log('Verification read:', savedReport ? 'Success' : 'Failed', savedReport);
    
    await logAudit('create', 'report', title, reportId);
    return c.json({ success: true, report });
  } catch (error) {
    console.log(`Error uploading report: ${error}`);
    console.log(`Stack trace: ${error.stack}`);
    return c.json({ error: `Failed to upload report: ${error.message}` }, 500);
  }
});

// Add session notes
app.post('/make-server-7fe18c53/notes/add', async (c) => {
  try {
    let { sessionName, notes, participants, tags, metadata } = await c.req.json();
    
    if (!sessionName || !notes) {
      return c.json({ error: 'Session name and notes are required' }, 400);
    }

    // Sanitize all text inputs to remove problematic Unicode characters
    sessionName = sanitizeText(sessionName);
    notes = sanitizeText(notes);
    
    // Sanitize participants array
    if (participants && Array.isArray(participants)) {
      participants = participants.map((p: string) => sanitizeText(p));
    }
    
    // Sanitize tags array
    if (tags && Array.isArray(tags)) {
      tags = tags.map((tag: string) => sanitizeText(tag));
    }
    
    // Sanitize metadata object
    if (metadata) {
      metadata = sanitizeObject(metadata);
    }
    
    // Validate critical fields
    const sessionNameValidation = validateText(sessionName);
    if (sessionNameValidation) {
      console.error('Session name validation error:', sessionNameValidation);
      return c.json({ error: `Session name contains invalid characters: ${sessionNameValidation}` }, 400);
    }
    
    const notesValidation = validateText(notes);
    if (notesValidation) {
      console.error('Notes validation error:', notesValidation);
      return c.json({ error: `Notes contain invalid characters: ${notesValidation}` }, 400);
    }

    const noteId = `notes_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sessionNotes = {
      id: noteId,
      sessionName,
      notes,
      participants: participants || [],
      tags: tags || [],
      metadata: metadata || {},
      type: 'session_notes',
      createdAt: new Date().toISOString(),
    };

    console.log('Saving sanitized session notes with ID:', noteId);
    await kv.set(noteId, sessionNotes);
    console.log('Session notes saved successfully');
    
    await logAudit('create', 'note', sessionName, noteId);
    return c.json({ success: true, notes: sessionNotes });
  } catch (error) {
    console.log(`Error adding session notes: ${error}`);
    console.log(`Stack trace: ${error.stack}`);
    return c.json({ error: `Failed to add session notes: ${error.message}` }, 500);
  }
});

// Get all prior reports
app.get('/make-server-7fe18c53/reports', async (c) => {
  try {
    console.log('Fetching reports with prefix: report_');
    const allReports = await kv.getByPrefix('report_');
    console.log('All reports from KV:', allReports.length, 'items found');
    
    const reports = allReports
      .filter(item => {
        console.log('Checking item:', item.id, 'type:', item.type);
        return item.type === 'prior_report';
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('Filtered prior reports:', reports.length);
    return c.json({ reports });
  } catch (error) {
    console.log(`Error fetching reports: ${error}`);
    return c.json({ error: `Failed to fetch reports: ${error.message}` }, 500);
  }
});

// Get all session notes
app.get('/make-server-7fe18c53/notes', async (c) => {
  try {
    const allNotes = await kv.getByPrefix('notes_');
    const notes = allNotes
      .filter(item => item.type === 'session_notes')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ notes });
  } catch (error) {
    console.log(`Error fetching session notes: ${error}`);
    return c.json({ error: `Failed to fetch session notes: ${error.message}` }, 500);
  }
});

// Delete a report
app.delete('/make-server-7fe18c53/reports/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const report = await kv.get(id);
    await kv.del(id);
    await logAudit('delete', 'report', report?.title || 'Unknown', id);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting report: ${error}`);
    return c.json({ error: `Failed to delete report: ${error.message}` }, 500);
  }
});

// Delete session note
app.delete('/make-server-7fe18c53/notes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const note = await kv.get(id);
    await kv.del(id);
    await logAudit('delete', 'note', note?.sessionName || 'Unknown', id);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting note: ${error}`);
    return c.json({ error: `Failed to delete note: ${error.message}` }, 500);
  }
});

// Generate new report using Gemini
app.post('/make-server-7fe18c53/reports/generate', async (c) => {
  try {
    const { selectedReports, selectedNotes, selectedCases } = await c.req.json();
    
    if (!selectedReports || selectedReports.length === 0) {
      return c.json({ error: 'At least one prior report must be selected for style reference' }, 400);
    }

    if (!selectedNotes || selectedNotes.length === 0) {
      return c.json({ error: 'At least one session note must be selected' }, 400);
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return c.json({ error: 'Gemini API key not configured' }, 500);
    }

    // Get the user's preferred model
    const modelPreference = await kv.get('ai_model_preference') || 'gemini-flash-latest';

    // Fetch the selected reports, notes, and case files
    const reports = await kv.mget(selectedReports);
    const notes = await kv.mget(selectedNotes);
    const cases = selectedCases && selectedCases.length > 0 ? await kv.mget(selectedCases) : [];

    // Build the prompt for Gemini
    const priorReportsContext = reports
      .map((r, i) => {
        const content = r.content; // Use plain text content
        return `=== PRIOR REPORT ${i + 1}: ${r.title} ===\n${content}\n`;
      })
      .join('\n');

    const sessionNotesContext = notes
      .map((n, i) => `=== SESSION ${i + 1}: ${n.sessionName} ===\nParticipants: ${n.participants.join(', ')}\nNotes:\n${n.notes}\n`)
      .join('\n');

    // Build case files context if provided
    const caseFilesContext = cases.length > 0
      ? '\n\nCASE SCENARIO DETAILS (Reference for patient details and scenario context):\n\n' + 
        cases.map((c, i) => `=== CASE FILE ${i + 1}: ${c.title} ===\n${c.metadata?.caseType ? `Case Type: ${c.metadata.caseType}\n` : ''}${c.content}\n`)
          .join('\n')
      : '';

    const prompt = `Role: You are an expert Medical Simulation Specialist and Education Consultant for the Washington University Department of Emergency Medicine. Your goal is to generate professional, actionable Post-Session Reports that prioritize psychological safety and a "Just Culture" framework.

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

Hierarchy Example:
# WUCS FACULTY DEV Report

**Date:** [date]
**Session Type:** In-Situ Simulation
...

**In-Situ Simulation:** A simulation conducted in the actual clinical environment...

## Latent Safety Threats

### Chest Tube Tray Availability

**Current State:** The chest tube insertion tray was not immediately available in the resuscitation bay.

**Impact:** This delay created a 3-minute gap during which the team had to search for equipment while managing a deteriorating patient.

**Recommendations:** Consider pre-positioning chest tube trays in each resuscitation bay or implementing a visual checklist system.

Input Data:
PRIOR REPORTS (Style Guide):
${priorReportsContext}

NEW SESSION NOTES:
${sessionNotesContext}

CASE FILE DATA:
${caseFilesContext}

Generate the Post-Session Report now using strict Markdown formatting.`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelPreference}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Gemini API error: ${response.status} - ${errorText}`);
      return c.json({ error: `Gemini API error: ${response.status} - ${errorText}` }, 500);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      console.log(`No content generated from Gemini: ${JSON.stringify(data)}`);
      return c.json({ error: 'No content generated from Gemini API' }, 500);
    }

    const generatedContent = data.candidates[0].content.parts[0].text;

    // Collect tags from source reports and notes
    const allTags = new Set<string>();
    reports.forEach(r => r.tags?.forEach((t: string) => allTags.add(t)));
    notes.forEach(n => n.tags?.forEach((t: string) => allTags.add(t)));

    // Save the generated report
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newReport = {
      id: reportId,
      title: `Generated Report - ${new Date().toLocaleDateString()}`,
      content: generatedContent,
      date: new Date().toISOString(),
      type: 'generated_report',
      status: 'draft',
      tags: Array.from(allTags),
      createdAt: new Date().toISOString(),
      basedOnReports: selectedReports,
      basedOnNotes: selectedNotes,
    };

    await kv.set(reportId, newReport);

    await logAudit('create', 'report', newReport.title, reportId);
    return c.json({ success: true, report: newReport });
  } catch (error) {
    console.log(`Error generating report: ${error}`);
    return c.json({ error: `Failed to generate report: ${error.message}` }, 500);
  }
});

// Get all generated reports
app.get('/make-server-7fe18c53/reports/generated', async (c) => {
  try {
    const allReports = await kv.getByPrefix('report_');
    const reports = allReports
      .filter(item => item.type === 'generated_report')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ reports });
  } catch (error) {
    console.log(`Error fetching generated reports: ${error}`);
    return c.json({ error: `Failed to fetch generated reports: ${error.message}` }, 500);
  }
});

// Update report (for editing and status changes)
app.patch('/make-server-7fe18c53/reports/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const existingReport = await kv.get(id);
    if (!existingReport) {
      return c.json({ error: 'Report not found' }, 404);
    }

    const updatedReport = {
      ...existingReport,
      ...updates,
      id: existingReport.id, // Prevent ID changes
      type: existingReport.type, // Prevent type changes
      updatedAt: new Date().toISOString(),
    };

    await kv.set(id, updatedReport);
    await logAudit('update', 'report', existingReport.title, id);
    return c.json({ success: true, report: updatedReport });
  } catch (error) {
    console.log(`Error updating report: ${error}`);
    return c.json({ error: `Failed to update report: ${error.message}` }, 500);
  }
});

// Delete report
app.delete('/make-server-7fe18c53/reports/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const report = await kv.get(id);
    await kv.del(id);
    await logAudit('delete', 'report', report?.title || 'Unknown', id);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting report: ${error}`);
    return c.json({ error: `Failed to delete report: ${error.message}` }, 500);
  }
});

// Delete session note
app.delete('/make-server-7fe18c53/notes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const note = await kv.get(id);
    await kv.del(id);
    await logAudit('delete', 'note', note?.sessionName || 'Unknown', id);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting note: ${error}`);
    return c.json({ error: `Failed to delete note: ${error.message}` }, 500);
  }
});

// ============= NEW OPTIMIZATION ENDPOINTS =============

// Audit log endpoint
app.get('/make-server-7fe18c53/audit-log', async (c) => {
  try {
    const auditEntries = await kv.getByPrefix('audit_');
    const entries = auditEntries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return c.json(entries);
  } catch (error) {
    console.log(`Error fetching audit log: ${error}`);
    return c.json({ error: `Failed to fetch audit log: ${error.message}` }, 500);
  }
});

// Add audit log entry (helper function called by other endpoints)
async function logAudit(action: string, itemType: string, itemTitle: string, itemId: string) {
  try {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const entry = {
      id: auditId,
      timestamp: new Date().toISOString(),
      action,
      itemType,
      itemTitle,
      itemId,
    };
    await kv.set(auditId, entry);
  } catch (error) {
    console.log(`Error logging audit: ${error}`);
  }
}

// Backup endpoint - export all data
app.get('/make-server-7fe18c53/backup', async (c) => {
  try {
    const allData = await kv.getByPrefix('');
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      reports: allData.filter(item => item.type === 'prior_report' || item.type === 'generated_report'),
      sessionNotes: allData.filter(item => item.type === 'session_notes'),
      templates: allData.filter(item => item.type === 'template'),
      auditLog: allData.filter(item => item.id?.startsWith('audit_')),
    };
    
    await logAudit('export', 'backup', 'Full System Backup', 'backup');
    return c.json(backup);
  } catch (error) {
    console.log(`Error creating backup: ${error}`);
    return c.json({ error: `Failed to create backup: ${error.message}` }, 500);
  }
});

// Restore endpoint - import data
app.post('/make-server-7fe18c53/restore', async (c) => {
  try {
    const { reports, sessionNotes, templates } = await c.req.json();
    
    let imported = 0;
    
    // Restore reports
    if (reports && Array.isArray(reports)) {
      for (const report of reports) {
        const existing = await kv.get(report.id);
        if (!existing) {
          await kv.set(report.id, report);
          imported++;
        }
      }
    }
    
    // Restore session notes
    if (sessionNotes && Array.isArray(sessionNotes)) {
      for (const note of sessionNotes) {
        const existing = await kv.get(note.id);
        if (!existing) {
          await kv.set(note.id, note);
          imported++;
        }
      }
    }
    
    // Restore templates
    if (templates && Array.isArray(templates)) {
      for (const template of templates) {
        const existing = await kv.get(template.id);
        if (!existing) {
          await kv.set(template.id, template);
          imported++;
        }
      }
    }
    
    await logAudit('import', 'backup', `Restored ${imported} items`, 'restore');
    return c.json({ success: true, imported });
  } catch (error) {
    console.log(`Error restoring data: ${error}`);
    return c.json({ error: `Failed to restore data: ${error.message}` }, 500);
  }
});

// Templates endpoints
app.get('/make-server-7fe18c53/templates', async (c) => {
  try {
    const templates = await kv.getByPrefix('template_');
    return c.json(templates.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  } catch (error) {
    console.log(`Error fetching templates: ${error}`);
    return c.json({ error: `Failed to fetch templates: ${error.message}` }, 500);
  }
});

app.post('/make-server-7fe18c53/templates', async (c) => {
  try {
    const template = await c.req.json();
    const templateId = template.id || `template_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newTemplate = {
      ...template,
      id: templateId,
      type: 'template',
      createdAt: template.createdAt || new Date().toISOString(),
    };
    
    await kv.set(templateId, newTemplate);
    await logAudit('create', 'template', newTemplate.name, templateId);
    return c.json({ success: true, template: newTemplate });
  } catch (error) {
    console.log(`Error creating template: ${error}`);
    return c.json({ error: `Failed to create template: ${error.message}` }, 500);
  }
});

app.delete('/make-server-7fe18c53/templates/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const template = await kv.get(id);
    await kv.del(id);
    await logAudit('delete', 'template', template?.name || 'Unknown', id);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting template: ${error}`);
    return c.json({ error: `Failed to delete template: ${error.message}` }, 500);
  }
});

// AI-powered auto-tagging endpoint
app.post('/make-server-7fe18c53/suggest-tags', async (c) => {
  try {
    const { content, title } = await c.req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      return c.json({ error: 'Gemini API key not configured' }, 500);
    }

    const prompt = `Analyze this medical simulation report and suggest 3-5 relevant tags. 
    
Title: ${title}
Content: ${content.slice(0, 1000)}

Return ONLY a JSON array of tags (lowercase, hyphenated). Example: ["patient-safety", "equipment-failure", "communication"]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      const tags = JSON.parse(text.match(/\[.*\]/)?.[0] || '[]');
      return c.json({ tags });
    } else {
      return c.json({ tags: [] });
    }
  } catch (error) {
    console.log(`Error suggesting tags: ${error}`);
    return c.json({ tags: [] });
  }
});

// Similarity detection endpoint
app.post('/make-server-7fe18c53/find-similar', async (c) => {
  try {
    const { title, tags, content } = await c.req.json();
    const allReports = await kv.getByPrefix('report_');
    
    // Simple similarity scoring based on title and tags
    const similarities = allReports.map(report => {
      let score = 0;
      
      // Title similarity (basic word matching)
      const titleWords = title.toLowerCase().split(/\s+/);
      const reportTitleWords = (report.title || '').toLowerCase().split(/\s+/);
      const commonWords = titleWords.filter(w => reportTitleWords.includes(w));
      score += commonWords.length * 10;
      
      // Tag overlap
      if (tags && report.tags) {
        const commonTags = tags.filter((t: string) => report.tags.includes(t));
        score += commonTags.length * 20;
      }
      
      return { report, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => ({ ...item.report, similarityScore: item.score }));
    
    return c.json({ similar: similarities });
  } catch (error) {
    console.log(`Error finding similar reports: ${error}`);
    return c.json({ similar: [] });
  }
});

// Smart recommendations - suggest prior reports based on session notes
app.post('/make-server-7fe18c53/recommend-reports', async (c) => {
  try {
    const { sessionNotes, tags } = await c.req.json();
    const allReports = await kv.getByPrefix('report_');
    const priorReports = allReports.filter(r => r.type === 'prior_report');
    
    // Score reports based on tag overlap and content similarity
    const scored = priorReports.map(report => {
      let score = 0;
      
      // Tag matching
      if (tags && report.tags) {
        const commonTags = tags.filter((t: string) => report.tags.includes(t));
        score += commonTags.length * 30;
      }
      
      // Department matching
      if (sessionNotes.metadata?.department && report.metadata?.department) {
        if (sessionNotes.metadata.department === report.metadata.department) {
          score += 25;
        }
      }
      
      return { report, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => ({ 
      ...item.report, 
      matchScore: item.score,
      matchPercentage: Math.min(100, Math.round(item.score / 2))
    }));
    
    return c.json({ recommendations: scored });
  } catch (error) {
    console.log(`Error recommending reports: ${error}`);
    return c.json({ recommendations: [] });
  }
});

// Bulk operations endpoint
app.post('/make-server-7fe18c53/bulk-operation', async (c) => {
  try {
    const { operation, ids, data } = await c.req.json();
    
    switch (operation) {
      case 'delete':
        await kv.mdel(ids);
        await logAudit('bulk-delete', 'multiple', `${ids.length} items`, 'bulk');
        return c.json({ success: true, affected: ids.length });
        
      case 'update-status':
        const items = await kv.mget(ids);
        for (const item of items) {
          await kv.set(item.id, { ...item, status: data.status });
        }
        await logAudit('bulk-update', 'multiple', `${ids.length} items`, 'bulk');
        return c.json({ success: true, affected: ids.length });
        
      case 'add-tags':
        const tagItems = await kv.mget(ids);
        for (const item of tagItems) {
          const newTags = [...new Set([...(item.tags || []), ...data.tags])];
          await kv.set(item.id, { ...item, tags: newTags });
        }
        return c.json({ success: true, affected: ids.length });
        
      default:
        return c.json({ error: 'Unknown operation' }, 400);
    }
  } catch (error) {
    console.log(`Error in bulk operation: ${error}`);
    return c.json({ error: `Bulk operation failed: ${error.message}` }, 500);
  }
});

// ============= CASE FILES ENDPOINTS =============

// Upload a case file
app.post('/make-server-7fe18c53/case-files/upload', async (c) => {
  try {
    let { title, content, htmlContent, date, tags, metadata } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: 'Title and content are required' }, 400);
    }

    // Sanitize all text inputs to remove problematic Unicode characters
    title = sanitizeText(title);
    content = sanitizeText(content);
    if (htmlContent) {
      htmlContent = sanitizeText(htmlContent);
    }
    
    // Sanitize metadata object
    if (metadata) {
      metadata = sanitizeObject(metadata);
    }
    
    // Sanitize tags array
    if (tags && Array.isArray(tags)) {
      tags = tags.map((tag: string) => sanitizeText(tag));
    }
    
    // Validate that critical fields don't contain problematic characters
    const titleValidation = validateText(title);
    if (titleValidation) {
      console.error('Title validation error:', titleValidation);
      return c.json({ error: `Title contains invalid characters: ${titleValidation}` }, 400);
    }
    
    const contentValidation = validateText(content);
    if (contentValidation) {
      console.error('Content validation error:', contentValidation);
      return c.json({ error: `Content contains invalid characters: ${contentValidation}` }, 400);
    }

    const caseFileId = `case_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const caseFile = {
      id: caseFileId,
      title,
      content,
      htmlContent: htmlContent || null,
      date: date || new Date().toISOString(),
      tags: tags || [],
      metadata: metadata || {},
      type: 'case_file',
      createdAt: new Date().toISOString(),
    };

    console.log('Saving sanitized case file with ID:', caseFileId, 'type:', caseFile.type);
    await kv.set(caseFileId, caseFile);
    console.log('Case file saved successfully');
    
    // Verify it was saved by reading it back
    const savedCaseFile = await kv.get(caseFileId);
    console.log('Verification read:', savedCaseFile ? 'Success' : 'Failed', savedCaseFile);
    
    await logAudit('create', 'case_file', title, caseFileId);
    return c.json({ success: true, caseFile });
  } catch (error) {
    console.log(`Error uploading case file: ${error}`);
    console.log(`Stack trace: ${error.stack}`);
    return c.json({ error: `Failed to upload case file: ${error.message}` }, 500);
  }
});

// Get all case files
app.get('/make-server-7fe18c53/case-files', async (c) => {
  try {
    console.log('Fetching case files with prefix: case_');
    const allCaseFiles = await kv.getByPrefix('case_');
    console.log('All case files from KV:', allCaseFiles.length, 'items found');
    
    const caseFiles = allCaseFiles
      .filter(item => {
        console.log('Checking item:', item.id, 'type:', item.type);
        return item.type === 'case_file';
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log('Filtered case files:', caseFiles.length);
    return c.json({ caseFiles });
  } catch (error) {
    console.log(`Error fetching case files: ${error}`);
    return c.json({ error: `Failed to fetch case files: ${error.message}` }, 500);
  }
});

// Delete a case file
app.delete('/make-server-7fe18c53/case-files/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const caseFile = await kv.get(id);
    await kv.del(id);
    await logAudit('delete', 'case_file', caseFile?.title || 'Unknown', id);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting case file: ${error}`);
    return c.json({ error: `Failed to delete case file: ${error.message}` }, 500);
  }
});

// Get AI Prompt Template (view-only)
app.get('/make-server-7fe18c53/prompt-template', (c) => {
  const template = `Role: You are an expert Medical Simulation Specialist and Education Consultant for the Washington University Department of Emergency Medicine. Your goal is to generate professional, actionable Post-Session Reports that prioritize psychological safety and a "Just Culture" framework.

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

Hierarchy Example:
# WUCS FACULTY DEV Report

**Date:** [date]
**Session Type:** In-Situ Simulation
...

**In-Situ Simulation:** A simulation conducted in the actual clinical environment...

## Latent Safety Threats

### Chest Tube Tray Availability

**Current State:** The chest tube insertion tray was not immediately available in the resuscitation bay.

**Impact:** This delay created a 3-minute gap during which the team had to search for equipment while managing a deteriorating patient.

**Recommendations:** Consider pre-positioning chest tube trays in each resuscitation bay or implementing a visual checklist system.

Input Data:
PRIOR REPORTS (Style Guide):
\${priorReportsContext}

NEW SESSION NOTES:
\${sessionNotesContext}

CASE FILE DATA:
\${caseFilesContext}

Generate the Post-Session Report now using strict Markdown formatting.`;

  return c.json({ 
    template,
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
    maxOutputTokens: 8192,
    version: '2.0',
    lastUpdated: '2026-03-30'
  });
});

// Get AI model preference
app.get('/make-server-7fe18c53/model-preference', async (c) => {
  try {
    const preference = await kv.get('ai_model_preference');
    return c.json({ model: preference || 'gemini-flash-latest' });
  } catch (error) {
    console.log(`Error fetching model preference: ${error}`);
    return c.json({ model: 'gemini-flash-latest' });
  }
});

// Set AI model preference
app.post('/make-server-7fe18c53/model-preference', async (c) => {
  try {
    const { model } = await c.req.json();
    
    // Validate model
    const validModels = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'];
    if (!validModels.includes(model)) {
      return c.json({ error: 'Invalid model' }, 400);
    }
    
    await kv.set('ai_model_preference', model);
    
    // Log audit event
    await kv.set(`audit_${Date.now()}_model_change`, {
      action: 'model_preference_changed',
      model,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true, model });
  } catch (error) {
    console.log(`Error setting model preference: ${error}`);
    return c.json({ error: `Failed to set model preference: ${error.message}` }, 500);
  }
});

Deno.serve(app.fetch);