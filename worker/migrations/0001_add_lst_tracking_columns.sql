ALTER TABLE lsts ADD COLUMN resolution_note TEXT;
ALTER TABLE lsts ADD COLUMN resolved_date TEXT;
ALTER TABLE lsts ADD COLUMN assignee TEXT;
ALTER TABLE lsts ADD COLUMN parent_issue_id TEXT;
ALTER TABLE lsts ADD COLUMN location_statuses TEXT;
ALTER TABLE lsts ADD COLUMN related_report_id TEXT;
ALTER TABLE lsts ADD COLUMN recurrence_count INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_lsts_related_report ON lsts(related_report_id);
