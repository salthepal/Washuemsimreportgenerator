export interface LSTPayload {
  title: string;
  description: string;
  recommendation?: string;
  severity: 'High' | 'Medium' | 'Low';
  category: 'Equipment' | 'Process' | 'Resources' | 'Logistics';
  status: 'Identified' | 'In Progress' | 'Resolved' | 'Recurring';
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        }),
      }
    );

    if (!geminiRes.ok) return;
    const data = await geminiRes.json() as any;
    const parsedLSTs: LSTPayload[] = JSON.parse(data.candidates[0].content.parts[0].text);

    for (const lst of parsedLSTs) {
      const lstId = `lst_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Semantic Deduplication (Basic Title Check)
      const existing = await db.prepare('SELECT id, recurrence_count FROM lsts WHERE title = ?').bind(lst.title).all();
      
      if (existing.results?.[0]) {
        const id = existing.results[0].id as string;
        const count = (existing.results[0].recurrence_count as number || 1) + 1;
        
        await db.prepare('UPDATE lsts SET last_seen_date = ?, status = ?, recurrence_count = ? WHERE id = ?')
          .bind(new Date().toISOString(), 'Recurring', count, id)
          .run();
      } else {
        await db.prepare('INSERT INTO lsts (id, title, description, recommendation, severity, status, category, identified_date, last_seen_date, related_report_id, recurrence_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(lstId, lst.title, lst.description, lst.recommendation || '', lst.severity, 'Identified', lst.category, new Date().toISOString(), new Date().toISOString(), reportId, 1)
          .run();
      }
    }
  } catch (error) {
    console.error('AI LST Extraction Error:', error);
  }
}
