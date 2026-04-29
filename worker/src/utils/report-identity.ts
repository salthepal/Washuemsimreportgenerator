type ReportRecordLike = {
  id: string;
  title?: string;
  content?: string;
  type?: string;
};

function normalizeWhitespace(value: string | undefined | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function isWeakTitle(title: string): boolean {
  return /^(untitled report|generated simulation report|ai created\b)/i.test(title);
}

export function extractMarkdownH1(content: string): string | null {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match ? normalizeWhitespace(match[1]) : null;
}

export function chooseCanonicalReportTitle(report: ReportRecordLike): string {
  const currentTitle = normalizeWhitespace(report.title);
  const headingTitle = extractMarkdownH1(report.content || '');

  if (currentTitle && !isWeakTitle(currentTitle)) return currentTitle;
  if (headingTitle) return headingTitle;
  if (currentTitle) return currentTitle;
  return `Recovered Report ${report.id}`;
}

export function ensureReportContentTitle(title: string, content: string): string {
  const normalizedTitle = normalizeWhitespace(title);
  const trimmedContent = content.trim();

  if (!trimmedContent) return `# ${normalizedTitle}`;

  if (/^#\s+.+$/m.test(trimmedContent)) {
    return trimmedContent.replace(/^#\s+.+$/m, `# ${normalizedTitle}`);
  }

  return `# ${normalizedTitle}\n\n${trimmedContent}`;
}

export function buildReportMarkdownDocument(title: string, content: string, type: string, timestamp: string): string {
  const normalizedContent = ensureReportContentTitle(title, content);
  const label = type === 'generated_report' ? 'Generated' : 'Uploaded';
  return `${normalizedContent}\n\n${label}: ${timestamp}\nType: ${type}`;
}

export function getReportR2Key(reportId: string, type: string): string {
  return type === 'generated_report'
    ? `reports/generated/${reportId}.md`
    : `reports/uploaded/${reportId}.md`;
}
