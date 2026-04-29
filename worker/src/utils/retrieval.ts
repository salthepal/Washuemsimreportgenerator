type VectorMatchLike = {
  id: string;
  score: number;
  metadata?: {
    title?: string;
    type?: string;
  };
};

type HydratedDocument = {
  id: string;
  title: string;
  content: string;
  score: number;
};

type HydratedResult = {
  contextText: string;
  sources: { filename: string; score: number; excerpt: string }[];
};

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function buildExcerpt(content: string, fallbackTitle: string): string {
  const normalized = compactWhitespace(content);
  if (!normalized) return fallbackTitle.substring(0, 300);
  return normalized.substring(0, 300);
}

export async function hydrateVectorMatches(
  db: D1Database,
  matches: VectorMatchLike[]
): Promise<HydratedResult> {
  if (matches.length === 0) {
    return { contextText: '', sources: [] };
  }

  const ids = matches.map((match) => match.id);
  const placeholders = ids.map(() => '?').join(',');
  const { results } = await db.prepare(
    `SELECT id, title, content FROM reports WHERE id IN (${placeholders})`
  ).bind(...ids).all();

  const reportMap = new Map<string, { title: string; content: string }>();
  for (const row of results as Array<{ id: string; title: string; content: string }>) {
    reportMap.set(row.id, {
      title: row.title || 'Unknown Document',
      content: row.content || '',
    });
  }

  const hydrated: HydratedDocument[] = matches.map((match) => {
    const dbRow = reportMap.get(match.id);
    const title = dbRow?.title || match.metadata?.title || 'Unknown Document';
    const content = dbRow?.content || '';
    return { id: match.id, title, content, score: match.score };
  });

  const contextText = hydrated
    .map((doc, index) => `<document index="${index + 1}" id="${doc.id}" title="${doc.title.replace(/"/g, '')}">\n${doc.content}\n</document>`)
    .join('\n\n');

  const sources = hydrated.map((doc) => ({
    filename: doc.title,
    score: doc.score,
    excerpt: buildExcerpt(doc.content, doc.title),
  }));

  return { contextText, sources };
}
