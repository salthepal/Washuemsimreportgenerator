/**
 * Gemini Context Caching
 *
 * Caches the static system prompt (PROMPT_TEMPLATE) as a Gemini cachedContent so
 * it is not re-sent on every /generate-report request (50-80% prompt-token savings).
 *
 * Also exports resolveModelId which pins moving *-latest aliases to dated model
 * versions, preventing silent behaviour changes when Gemini updates the alias.
 *
 * Cache lifecycle:
 *   - TTL: 1 hour.  Refreshed automatically when < 5 minutes remain.
 *   - Stored in the D1 settings table under the key "gemini_system_cache".
 *   - If the configured model changes, the old cache is abandoned and a new one
 *     is created for the new model.
 *   - Any creation or validation failure returns null; callers must fall back to
 *     the uncached (full-prompt-in-contents) path.
 *
 * Minimum token requirement: Gemini context caching requires ≥ 1,024 tokens in
 * the cached content.  The current PROMPT_TEMPLATE is ~1,218 tokens (well above
 * the threshold).  If the API rejects the cache creation for any reason the
 * function logs a warning and returns null (graceful fallback).
 */

/** Pass model tags through as-is — they are real Gemini API model identifiers. */
export function resolveModelId(tag: string): string {
  return tag;
}

const CACHE_TTL_SECONDS = 3600;
const CACHE_REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000;
const CACHE_SETTINGS_KEY = 'gemini_system_cache';

interface CacheRecord {
  name: string;
  modelId: string;
  expiresAt: string;
}

/**
 * Return a valid Gemini cachedContent name for the given model and system prompt,
 * creating or refreshing the cache entry as needed.
 *
 * Returns null if caching is unavailable (token-count too low, API error, etc.).
 * Callers must treat null as "use the uncached path".
 */
export async function getOrRefreshSystemCache(
  db: D1Database,
  geminiKey: string,
  modelId: string,
  systemPrompt: string,
): Promise<string | null> {
  // Check D1 for a valid, unexpired cache entry that matches the current model.
  try {
    const { results } = await db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .bind(CACHE_SETTINGS_KEY)
      .all();

    if (results[0]) {
      const record: CacheRecord = JSON.parse(results[0].value as string);
      const expiresAt = new Date(record.expiresAt).getTime();
      const stillFresh = Date.now() < expiresAt - CACHE_REFRESH_BEFORE_EXPIRY_MS;
      if (stillFresh && record.modelId === modelId) {
        return record.name;
      }
    }
  } catch {
    // D1 read failure — fall through to create a new cache entry.
  }

  // Create a new cachedContent via the Gemini API.
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: `models/${modelId}`,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          ttl: `${CACHE_TTL_SECONDS}s`,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[CACHE] Gemini cache creation failed:', res.status, errText);
      return null;
    }

    const data: any = await res.json();
    const cacheName: string = data.name;
    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString();
    const record: CacheRecord = { name: cacheName, modelId, expiresAt };

    await db
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      .bind(CACHE_SETTINGS_KEY, JSON.stringify(record))
      .run();

    console.log(JSON.stringify({ event: 'gemini_cache_created', cacheName, modelId, expiresAt }));
    return cacheName;
  } catch (err) {
    console.warn('[CACHE] Gemini cache error:', err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
