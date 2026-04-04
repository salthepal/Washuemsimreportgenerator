export interface LSTPayload {
  title: string;
  description: string;
  recommendation?: string;
  severity: 'High' | 'Medium' | 'Low';
  category: 'Equipment' | 'Process' | 'Resources' | 'Logistics';
  status: 'Identified' | 'In Progress' | 'Resolved' | 'Recurring';
}

async function logError(db: D1Database, action: string, error: any, context?: any) {
  try {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await db.prepare('INSERT INTO error_logs (id, action, message, stack, context, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(errorId, action, error?.message || String(error), error?.stack, context ? JSON.stringify(context) : null, new Date().toISOString())
      .run();
  } catch (e) { console.error('Double fault logging error:', e); }
}

export async function extractAndScoreLSTs(db: D1Database, reportContent: string, reportId: string, geminiKey: string) {
  try {
    const prompt = `
Role: You are a Medical Safety Audit AI for Washington University Emergency Medicine.
Task: Extract Latent Safety Threats (LSTs) from the following simulation report and return them as a JSON array.

Report Content:
${reportContent}

Instructions:
1. Identify every system-level gap (environmental, process, equipment).
2. For each threat, provide:
   - title: Concise but descriptive (e.g., "O2 Flowmeter Malfunction")
   - description: What happened and the clinical impact.
   - recommendation: A specific fix.
   - severity: "High" (Direct patient harm threat), "Medium" (Delayed care/Cognitive load), or "Low" (Minor inefficiency).
   - category: "Equipment", "Process", "Resources", or "Logistics".

Return ONLY a valid JSON array of objects. No preamble.
Format: [{"title": "...", "description": "...", "recommendation": "...", "severity": "...", "category": "..."}]
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      await logError(db, 'AI_LST_FETCH', new Error(`Gemini API returned ${geminiRes.status}: ${errText}`), { reportId });
      return;
    }
    const data = await geminiRes.json() as any;
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      await logError(db, 'AI_LST_PARSE', new Error('Empty Gemini response'), { data, reportId });
      return;
    }
    
    const rawText = data.candidates[0].content.parts[0].text;
    const parsedLSTs: LSTPayload[] = JSON.parse(rawText);

    for (const lst of parsedLSTs) {
      const lstId = `lst_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Step 1: Detect Current Report Location (if available)
      const reportRes = await db.prepare('SELECT metadata FROM reports WHERE id = ?').bind(reportId).all();
      let reportLocation = 'Default Site';
      if (reportRes.results?.[0]) {
        const meta = JSON.parse(reportRes.results[0].metadata as string);
        reportLocation = meta.location || 'Default Site';
      }

      // Semantic Deduplication (Basic Title Check for 'Master' tracking)
      const existing = await db.prepare('SELECT id, recurrence_count, location_statuses FROM lsts WHERE title = ?').bind(lst.title).all();
      
      if (existing.results?.[0]) {
        const masterId = existing.results[0].id as string;
        const count = (existing.results[0].recurrence_count as number || 1) + 1;
        
        let locStatuses: Record<string, string> = {};
        try {
          locStatuses = existing.results[0].location_statuses ? JSON.parse(existing.results[0].location_statuses as string) : {};
        } catch (e) {}

        // Update status only for THIS location
        locStatuses[reportLocation] = lst.status;
        
        await db.prepare('UPDATE lsts SET last_seen_date = ?, status = ?, recurrence_count = ?, location_statuses = ? WHERE id = ?')
          .bind(new Date().toISOString(), 'Recurring', count, JSON.stringify(locStatuses), masterId)
          .run();
      } else {
        // Initialize location statuses for the new Master record
        const initialLocStatuses = { [reportLocation]: 'Identified' };
        
        await db.prepare('INSERT INTO lsts (id, title, description, recommendation, severity, status, category, identified_date, last_seen_date, related_report_id, recurrence_count, location, location_statuses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(
            lstId, lst.title, lst.description, lst.recommendation || '', 
            lst.severity, 'Identified', lst.category, 
            new Date().toISOString(), new Date().toISOString(), 
            reportId, 1, reportLocation, JSON.stringify(initialLocStatuses)
          )
          .run();
      }
    }
  } catch (error) {
    console.error('AI LST Extraction Error:', error);
    await logError(db, 'AI_LST_SYSTEM', error, { reportId });
  }
}
