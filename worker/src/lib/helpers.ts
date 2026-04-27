import type { Bindings } from '../types';

export async function logError(db: D1Database, action: string, error: any, context?: any) {
  try {
    const errorId = `error_${crypto.randomUUID()}`;
    const entry = {
      id: errorId,
      action,
      message: error?.message || String(error),
      stack: error?.stack,
      context: context ? JSON.stringify(context) : null,
      timestamp: new Date().toISOString()
    };
    
    await db.prepare('INSERT INTO error_logs (id, action, message, stack, context, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(entry.id, entry.action, entry.message, entry.stack, entry.context, entry.timestamp)
      .run();
      
    console.log(`[ERROR LOGGED] ${action}: ${entry.message}`);
  } catch (logErr) {
    console.log(`CRITICAL: Failed to log error: ${logErr}`);
  }
}

export async function logAudit(db: D1Database, action: string, type: string, target: string, id: string) {
  try {
    const auditId = `audit_${crypto.randomUUID()}`;
    await db.prepare('INSERT INTO audit_logs (id, action, type, target, target_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(auditId, action, type, target, id, new Date().toISOString())
      .run();
  } catch (error) {
    console.log(`Error logging audit: ${error}`);
  }
}

export async function verifyTurnstile(c: any, next: any) {
  const headerToken = c.req.header('X-Turnstile-Token');
  let token = headerToken;

  if (!token) {
    try {
      const body = await c.req.raw.clone().json();
      token = body.turnstileToken;
    } catch (e) {}
  }

  const secret = c.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error('[AUTH ERROR] TURNSTILE_SECRET_KEY is missing from environment.');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  if (!token) {
    return c.json({ error: 'Security verification failed: Missing token' }, 403);
  }

  try {
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome: any = await result.json();
    if (!outcome.success) {
      return c.json({ error: 'Security verification failed: Invalid token' }, 403);
    }

    await next();
  } catch (err: any) {
    console.error('Turnstile verification error:', err);
    return c.json({ error: 'Verification service unreachable' }, 503);
  }
}

export async function verifyAdmin(c: any, next: any) {
  const adminSecret = c.env.ADMIN_TOKEN;
  const providedToken = c.req.header('X-Admin-Token');

  if (!adminSecret) {
    console.error('[AUTH ERROR] ADMIN_TOKEN is missing from environment.');
    return c.json({ error: 'Administrative access not configured' }, 500);
  }

  if (!providedToken || providedToken !== adminSecret) {
    await logError(c.env.DB, 'unauthorized_admin_access', new Error('Invalid or missing Admin Token'), {
      ip: c.req.header('cf-connecting-ip')
    });
    return c.json({ error: 'Unauthorized: Admin Token required' }, 401);
  }

  await next();
}

export async function indexDocumentVector(env: Bindings, id: string, title: string, content: string, type: string) {
  if (!env.AI || !env.VECTORIZE) {
    throw new Error('Infrastructure bindings missing (AI/VECTORIZE)');
  }

  try {
    const textToEmbed = `${title}\n\n${content}`.substring(0, 1000);
    const aiOutput = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
      text: [textToEmbed]
    });

    // Workers AI might return direct data or { data: [] } depending on version/types
    const values = Array.isArray(aiOutput) ? aiOutput[0] : (aiOutput as any).data?.[0];
    if (!values) throw new Error(`AI generated no embeddings for ${id}`);

    await env.VECTORIZE.upsert([
      {
        id: id,
        values: values,
        metadata: { title, type, timestamp: new Date().toISOString() }
      }
    ]);
  } catch (err: any) {
    console.error(`[VECTOR ERROR] ${id}:`, err);
    throw err;
  }
}

export async function rateLimit(c: any, next: any) {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const key = `rl_${ip}`;
  const limit = 5; 
  const window = 60; 

  const current = await c.env.RATELIMIT.get(key);
  const count = current ? parseInt(current) : 0;

  if (count >= limit) {
    await logError(c.env.DB, 'rate_limit_exceeded', new Error(`IP ${ip} exceeded rate limit`), { ip, count });
    return c.json({ error: 'Too many requests. Please try again in a minute.' }, 429);
  }

  await c.env.RATELIMIT.put(key, (count + 1).toString(), { expirationTtl: window });
  return next();
}
