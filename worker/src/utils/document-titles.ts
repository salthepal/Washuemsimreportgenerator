type SessionNoteLike = {
  session_name?: string;
  created_at?: string;
  metadata?: string | {
    sessionDate?: string;
    location?: string;
  };
};

type CaseFileLike = {
  title?: string;
  case_type?: string;
  metadata?: {
    caseType?: string;
  };
};

function normalizeWhitespace(value: string | undefined | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map(normalizeWhitespace).filter(Boolean)));
}

function safeParseMetadata(metadata: SessionNoteLike['metadata']): { sessionDate?: string; location?: string } {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return metadata;
}

function formatDateLabel(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function pickPrimaryCaseLabel(cases: CaseFileLike[]): string | null {
  const caseTypes = uniqueNonEmpty(cases.map((item) => item.case_type || item.metadata?.caseType));
  if (caseTypes.length > 0) return caseTypes[0];

  const titles = uniqueNonEmpty(cases.map((item) => item.title));
  return titles.length > 0 ? titles[0] : null;
}

export function buildGeneratedReportTitle(notes: SessionNoteLike[], cases: CaseFileLike[]): string {
  const noteMetadata = notes.map((note) => safeParseMetadata(note.metadata));
  const sessionNames = uniqueNonEmpty(notes.map((note) => note.session_name));
  const locations = uniqueNonEmpty(noteMetadata.map((item) => item.location));
  const dateLabels = uniqueNonEmpty(
    notes.map((note, index) => formatDateLabel(noteMetadata[index]?.sessionDate || note.created_at))
  );
  const caseLabel = pickPrimaryCaseLabel(cases);

  const segments: string[] = [];
  if (locations.length > 0) segments.push(locations.length === 1 ? locations[0] : 'Multi-Site');
  if (sessionNames.length > 0) segments.push(sessionNames.length === 1 ? sessionNames[0] : 'Multi-Session Simulation');
  if (caseLabel) segments.push(caseLabel);
  if (dateLabels.length > 0) segments.push(dateLabels.length === 1 ? dateLabels[0] : `${dateLabels[0]} to ${dateLabels[dateLabels.length - 1]}`);

  if (segments.length === 0) {
    return `Generated Simulation Report - ${new Date().toISOString().slice(0, 10)}`;
  }

  return segments.join(' - ');
}
