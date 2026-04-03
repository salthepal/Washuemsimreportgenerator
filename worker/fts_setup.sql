CREATE VIRTUAL TABLE IF NOT EXISTS reports_fts USING fts5(id UNINDEXED, title, content, type);
INSERT INTO reports_fts(id, title, content, type) SELECT id, title, content, type FROM reports;

-- Trigger to keep search in sync
CREATE TRIGGER IF NOT EXISTS reports_ai AFTER INSERT ON reports BEGIN
  INSERT INTO reports_fts(id, title, content, type) VALUES (new.id, new.title, new.content, new.type);
END;

CREATE TRIGGER IF NOT EXISTS reports_ad AFTER DELETE ON reports BEGIN
  DELETE FROM reports_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS reports_au AFTER UPDATE ON reports BEGIN
  DELETE FROM reports_fts WHERE id = old.id;
  INSERT INTO reports_fts(id, title, content, type) VALUES (new.id, new.title, new.content, new.type);
END;
