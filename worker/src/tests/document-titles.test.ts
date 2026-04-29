import { describe, expect, it } from 'vitest';
import { buildGeneratedReportTitle } from '../utils/document-titles';

describe('buildGeneratedReportTitle', () => {
  it('uses location, session name, case type, and date when available', () => {
    const title = buildGeneratedReportTitle(
      [{
        session_name: 'Trauma Simulation',
        created_at: '2026-04-28T15:00:00.000Z',
        metadata: JSON.stringify({ location: 'CHNW', sessionDate: '2026-04-27T10:00:00.000Z' }),
      }],
      [{ title: 'Chest Pain Case', case_type: 'Trauma' }]
    );

    expect(title).toBe('CHNW - Trauma Simulation - Trauma - 2026-04-27');
  });

  it('falls back to multi-site and multi-session labels when needed', () => {
    const title = buildGeneratedReportTitle(
      [
        { session_name: 'Peds', created_at: '2026-04-25T10:00:00.000Z', metadata: JSON.stringify({ location: 'BJH' }) },
        { session_name: 'Adult', created_at: '2026-04-26T10:00:00.000Z', metadata: JSON.stringify({ location: 'CHNW' }) },
      ],
      []
    );

    expect(title).toBe('Multi-Site - Multi-Session Simulation - 2026-04-25 to 2026-04-26');
  });

  it('falls back to a dated generic title when there is no usable metadata', () => {
    const title = buildGeneratedReportTitle([], []);
    expect(title).toMatch(/^Generated Simulation Report - \d{4}-\d{2}-\d{2}$/);
  });
});
