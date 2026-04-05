-- Cloudflare D1 SQL Schema for WashU EM Sim Intelligence

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- 'prior_report' or 'generated_report'
  metadata TEXT, -- JSON blob
  created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', 'utc'))
);

CREATE TABLE IF NOT EXISTS session_notes (
  id TEXT PRIMARY KEY,
  session_name TEXT NOT NULL,
  notes TEXT NOT NULL,
  participants TEXT, -- JSON array
  tags TEXT, -- JSON array
  metadata TEXT, -- JSON blob
  created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', 'utc'))
);

CREATE TABLE IF NOT EXISTS lsts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT,
  severity TEXT NOT NULL, -- 'Low', 'Medium', 'High'
  status TEXT NOT NULL, -- 'Active', 'Resolved'
  category TEXT,
  location TEXT,
  identified_date TEXT, -- ISO Date
  last_seen_date TEXT, -- ISO Date
  created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', 'utc'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  target_id TEXT,
  timestamp DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', 'utc'))
);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context TEXT, -- JSON blob
  timestamp DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', 'utc'))
);

-- Search Index (FTS5) for Clinical Content
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  id UNINDEXED,
  type UNINDEXED,
  title,
  content,
  tokenize='porter'
);

-- LST History for Audit & Versioning
CREATE TABLE IF NOT EXISTS lst_history (
  id TEXT PRIMARY KEY,
  lst_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  old_severity TEXT,
  new_severity TEXT,
  change_note TEXT,
  changed_by TEXT,
  created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', 'utc'))
);

-- Optimized Indexes for Site-Filtering and Hydration
CREATE INDEX IF NOT EXISTS idx_reports_site ON reports(metadata->>'location');
CREATE INDEX IF NOT EXISTS idx_notes_site ON session_notes(metadata->>'location');
CREATE INDEX IF NOT EXISTS idx_lsts_site ON lsts(location);
CREATE INDEX IF NOT EXISTS idx_lsts_status ON lsts(status);

-- Triggers to auto-record LST History
CREATE TRIGGER IF NOT EXISTS trg_lst_history 
AFTER UPDATE ON lsts
FOR EACH ROW
WHEN OLD.status != NEW.status OR OLD.severity != NEW.severity
BEGIN
  INSERT INTO lst_history (id, lst_id, old_status, new_status, old_severity, new_severity)
  VALUES ('hist_' || hex(randomblob(8)), OLD.id, OLD.status, NEW.status, OLD.severity, NEW.severity);
END;

-- Triggers for FTS Search Indexing
CREATE TRIGGER IF NOT EXISTS trg_reports_search 
AFTER INSERT ON reports
BEGIN
  INSERT INTO search_index (id, type, title, content)
  VALUES (new.id, new.type, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_search 
AFTER INSERT ON session_notes
BEGIN
  INSERT INTO search_index (id, type, title, content)
  VALUES (new.id, 'session_note', new.session_name, new.notes);
END;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON blob
);
