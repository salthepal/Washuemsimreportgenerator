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

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON blob
);
