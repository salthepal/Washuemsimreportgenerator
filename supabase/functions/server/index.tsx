import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';
import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';

const app = new Hono();

// Initialize database table - verify it exists
async function initializeDatabase() {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    // Try to query the table to see if it exists
    const { error: checkError } = await supabase
      .from('kv_store_7fe18c53')
      .select('key')
      .limit(1);

    if (checkError) {
      console.error('❌ Database table not found!');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  DATABASE SETUP REQUIRED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('Please create the table in your Supabase SQL Editor:');
      console.log('');
      console.log('CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (');
      console.log('  key TEXT NOT NULL PRIMARY KEY,');
      console.log('  value JSONB NOT NULL');
      console.log(');');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    } else {
      console.log('✅ Database table verified successfully');
    }
  } catch (error) {
    console.error('Database initialization check failed:', error.message);
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
    const { title, content, htmlContent, date, tags, metadata } = await c.req.json();
    
    if (!title || !content) {
      return c.json({ error: 'Title and content are required' }, 400);
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

    console.log('Saving report with ID:', reportId, 'type:', report.type);
    await kv.set(reportId, report);
    console.log('Report saved successfully');
    
    // Verify it was saved by reading it back
    const savedReport = await kv.get(reportId);
    console.log('Verification read:', savedReport ? 'Success' : 'Failed', savedReport);
    
    await logAudit('create', 'report', title, reportId);
    return c.json({ success: true, report });
  } catch (error) {
    console.log(`Error uploading report: ${error}`);
    return c.json({ error: `Failed to upload report: ${error.message}` }, 500);
  }
});

// Add session notes
app.post('/make-server-7fe18c53/notes/add', async (c) => {
  try {
    const { sessionName, notes, participants, tags, metadata } = await c.req.json();
    
    if (!sessionName || !notes) {
      return c.json({ error: 'Session name and notes are required' }, 400);
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

    await kv.set(noteId, sessionNotes);
    
    await logAudit('create', 'note', sessionName, noteId);
    return c.json({ success: true, notes: sessionNotes });
  } catch (error) {
    console.log(`Error adding session notes: ${error}`);
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

// Upload a case file
app.post('/make-server-7fe18c53/case_files/upload', async (c) => {
  try {
    const { fileName, content, metadata } = await c.req.json();
    
    if (!fileName || !content) {
      return c.json({ error: 'File name and content are required' }, 400);
    }

    const caseFileId = `casefile_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const caseFile = {
      id: caseFileId,
      fileName,
      content,
      uploadDate: new Date().toISOString(),
      type: 'case_file',
      createdAt: new Date().toISOString(),
      metadata: metadata || {},
    };

    console.log('Saving case file with ID:', caseFileId);
    await kv.set(caseFileId, caseFile);
    console.log('Case file saved successfully');
    
    await logAudit('create', 'case_file', fileName, caseFileId);
    return c.json({ success: true, caseFile });
  } catch (error) {
    console.log('Error uploading case file:', error);
    const errorMsg = error?.message || String(error) || 'Unknown error';
    return c.json({ error: `Failed to upload case file: ${errorMsg}` }, 500);
  }
});

// Get all case files
app.get('/make-server-7fe18c53/case_files', async (c) => {
  try {
    const allCaseFiles = await kv.getByPrefix('casefile_');
    const caseFiles = allCaseFiles
      .filter(item => item.type === 'case_file')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ case_files: caseFiles });
  } catch (error) {
    console.log(`Error fetching case files: ${error}`);
    return c.json({ error: `Failed to fetch case files: ${error.message}` }, 500);
  }
});

// Delete a case file
app.delete('/make-server-7fe18c53/case_files/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const caseFile = await kv.get(id);
    await kv.del(id);
    await logAudit('delete', 'case_file', caseFile?.fileName || 'Unknown', id);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting case file: ${error}`);
    return c.json({ error: `Failed to delete case file: ${error.message}` }, 500);
  }
});

// Generate new report using Gemini
app.post('/make-server-7fe18c53/reports/generate', async (c) => {
  try {
    const { selectedReports, selectedNotes, selectedCaseFiles } = await c.req.json();
    
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

    // Fetch the selected reports and notes
    const reports = await kv.mget(selectedReports);
    const notes = await kv.mget(selectedNotes);
    const caseFiles = selectedCaseFiles ? await kv.mget(selectedCaseFiles) : [];

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

    const caseFilesContext = caseFiles
      .map((cf, i) => `=== CASE FILE ${i + 1}: ${cf.fileName} ===\nContent:\n${cf.content}\n`)
      .join('\n');

    const prompt = `You are an expert in generating Post-Session Reports for the Washington University Emergency Medicine Simulation program based on in-situ simulation sessions.

Your task is to generate a NEW Post-Session Report that:
1. Follows the EXACT writing style, tone, structure, and formatting of the prior reports provided
2. Incorporates and synthesizes insights from the new session notes
3. Identifies and discusses:
   - LATENT SAFETY THREATS discovered during the simulation
   - KEY EDUCATIONAL LEARNING POINTS for participants
   - COMMON THREADS noted by multiple observers/facilitators
   - System-level issues and individual performance insights
   - Recommendations for improvement
4. Maintains consistency with how prior reports were formatted and presented
5. Uses the SAME section headings, organization, and narrative structure as the prior reports

CRITICAL INSTRUCTIONS FOR FORMATTING AND STRUCTURE:
- Analyze the prior reports carefully to identify their EXACT structure (section headings, subsections, paragraph organization)
- Use the IDENTICAL section headings found in the prior reports (e.g., if they use "Background," you must use "Background")
- Match the EXACT writing style, tone, and voice (formal vs conversational, first person vs third person, etc.)
- Replicate their paragraph length, sentence structure, and narrative flow
- If prior reports use bullet points, use them the same way; if they use numbered lists, follow that pattern
- Preserve any special formatting conventions like capitalization, emphasis, or organizational patterns
- Match the level of detail and depth - if prior reports are concise, be concise; if detailed, be detailed

CONTENT GENERATION RULES:
- Generate COMPLETELY NEW CONTENT based on the session notes provided
- DO NOT copy-paste sentences from the prior reports (they are style guides only)
- Synthesize information from multiple observers/facilitators to identify common themes
- Focus on latent safety threats (system-level vulnerabilities, not individual mistakes)
- Emphasize actionable recommendations for systemic improvement
- Include specific examples and observations from the session notes
- Identify patterns and recurring issues mentioned by multiple people
- Connect observations to broader patient safety and educational outcomes

OUTPUT FORMAT REQUIREMENTS:
- Generate the report as PLAIN TEXT with clear section breaks
- Use line breaks and whitespace exactly as the prior reports do
- DO NOT include HTML tags, CSS, or any markup
- DO NOT add meta-commentary like "Here is the report:" or "Based on the style..."
- Start directly with the report content
- Use simple text formatting (spacing, line breaks, capitalization) to match the prior reports
- Include ALL sections that were present in the prior reports (if they have 5 sections, your report should have 5 sections)

QUALITY STANDARDS:
- Ensure the report is comprehensive and addresses all key points from the session notes
- Balance detail with readability - avoid overly technical jargon unless prior reports use it
- Provide specific, actionable recommendations (not generic advice)
- Maintain professional medical/educational tone throughout
- Ensure logical flow and clear transitions between sections
- Cross-reference multiple observer notes to validate key findings

PRIOR COMPLETED REPORTS (for style and structure reference ONLY):
${priorReportsContext}

NEW SESSION NOTES TO INCORPORATE (the actual content for your report):
${sessionNotesContext}

CASE FILES TO INCORPORATE (additional context for your report):
${caseFilesContext}

Generate a comprehensive Post-Session Report now. Remember:
1. Structure and style MUST exactly match the prior reports
2. Content MUST be completely new, synthesized from the session notes
3. Focus on latent safety threats, learning points, and common threads
4. Output ONLY the report content with no preamble or commentary
5. Include ALL sections present in the prior reports`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
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
      basedOnCaseFiles: selectedCaseFiles || [],
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

// Report quality scoring endpoint
app.post('/make-server-7fe18c53/score-quality', async (c) => {
  try {
    const { content } = await c.req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      return c.json({ score: 7, feedback: 'Quality scoring unavailable' });
    }

    const prompt = `Rate this Latent Safety Threat Report on a scale of 1-10 for:
- Completeness (has all necessary sections)
- Clarity (easy to understand)
- Actionability (provides clear recommendations)

Content:
${content.slice(0, 2000)}

Return ONLY a JSON object: {"score": 8, "feedback": "Brief feedback here"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      const result = JSON.parse(text.match(/\{.*\}/s)?.[0] || '{"score": 7, "feedback": "Unable to analyze"}');
      return c.json(result);
    } else {
      return c.json({ score: 7, feedback: 'Quality scoring unavailable' });
    }
  } catch (error) {
    console.log(`Error scoring quality: ${error}`);
    return c.json({ score: 7, feedback: 'Quality scoring error' });
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

Deno.serve(app.fetch);