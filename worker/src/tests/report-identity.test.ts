import { describe, expect, it } from 'vitest';
import {
  buildReportMarkdownDocument,
  chooseCanonicalReportTitle,
  ensureReportContentTitle,
  extractMarkdownH1,
  getReportR2Key,
} from '../utils/report-identity';

describe('report identity helpers', () => {
  it('extracts the first markdown h1', () => {
    expect(extractMarkdownH1('# Example Report\n\nBody')).toBe('Example Report');
  });

  it('prefers a strong stored title over an internal generic heading', () => {
    expect(chooseCanonicalReportTitle({
      id: 'r1',
      title: 'Multi-Site Trauma Summary',
      content: '# WUCS FACULTY DEV Report\n\nBody',
    })).toBe('Multi-Site Trauma Summary');
  });

  it('falls back to content heading when stored title is weak', () => {
    expect(chooseCanonicalReportTitle({
      id: 'r2',
      title: 'AI Created - 4/4/2026',
      content: '# WUCS FACULTY DEV Report\n\nBody',
    })).toBe('WUCS FACULTY DEV Report');
  });

  it('replaces an existing markdown h1 with the canonical title', () => {
    expect(ensureReportContentTitle('Canonical Title', '# Old Title\n\nBody'))
      .toBe('# Canonical Title\n\nBody');
  });

  it('prefixes a missing markdown h1', () => {
    expect(ensureReportContentTitle('Canonical Title', 'Body text'))
      .toBe('# Canonical Title\n\nBody text');
  });

  it('builds a markdown document with aligned title and footer metadata', () => {
    const doc = buildReportMarkdownDocument('Canonical Title', '# Old Title\n\nBody', 'generated_report', '2026-04-28T20:00:00.000Z');
    expect(doc).toContain('# Canonical Title');
    expect(doc).toContain('Generated: 2026-04-28T20:00:00.000Z');
  });

  it('chooses the correct R2 key by report type', () => {
    expect(getReportR2Key('abc', 'generated_report')).toBe('reports/generated/abc.md');
    expect(getReportR2Key('abc', 'prior_report')).toBe('reports/uploaded/abc.md');
  });
});
