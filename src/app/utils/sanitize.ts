/**
 * Sanitization utilities to prevent Unicode and formatting errors
 */

/**
 * Sanitizes text input by removing unsupported Unicode characters and normalizing whitespace
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize Unicode to NFC form
    .normalize('NFC')
    // Remove control characters except newlines and tabs
    .replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width characters
    .replaceAll(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace problematic quotes with standard ones
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll(/[\u201C\u201D]/g, '"')
    // Normalize whitespace
    .replaceAll(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes HTML content while preserving basic formatting
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  let sanitized = html.normalize('NFC');
  
  // Loop to handle nested/overlapping patterns until no more matches found
  // This prevents bypasses like <<script>script> becoming <script>
  let previousLength = -1;
  while (sanitized.length !== previousLength) {
    previousLength = sanitized.length;
    
    // Remove script tags and their content
    sanitized = sanitized.replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replaceAll(/<script[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replaceAll(/<script[^>]*>/gi, '');
    
    // Remove style tags and their content
    sanitized = sanitized.replaceAll(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    sanitized = sanitized.replaceAll(/<style[\s\S]*?<\/style>/gi, '');
    sanitized = sanitized.replaceAll(/<style[^>]*>/gi, '');
    
    // Remove iframe tags
    sanitized = sanitized.replaceAll(/<iframe[\s\S]*?<\/iframe>/gi, '');
    sanitized = sanitized.replaceAll(/<iframe[^>]*>/gi, '');
    
    // Remove object and embed tags
    sanitized = sanitized.replaceAll(/<object[\s\S]*?<\/object>/gi, '');
    sanitized = sanitized.replaceAll(/<embed[\s\S]*?<\/embed>/gi, '');
    
    // Remove all img tags (prevents base64 bloat causing SQLITE_TOOBIG in D1)
    sanitized = sanitized.replaceAll(/<img[^>]*>/gi, '');
    
    // Remove event handlers with various formats
    sanitized = sanitized.replaceAll(/on\w+\s*=\s*"[^"]*"/gi, '');
    sanitized = sanitized.replaceAll(/on\w+\s*=\s*'[^']*'/gi, '');
    sanitized = sanitized.replaceAll(/on\w+\s*=\s*[^\s>]*/gi, '');
    
    // Remove javascript: protocol
    sanitized = sanitized.replaceAll(/javascript:/gi, '');
    sanitized = sanitized.replaceAll(/vbscript:/gi, '');
    sanitized = sanitized.replaceAll(/data:text\/html/gi, '');
  }
  
  // Normalize quotes in HTML
  sanitized = sanitized.replaceAll(/[\u2018\u2019]/g, "'");
  sanitized = sanitized.replaceAll(/[\u201C\u201D]/g, '"');
  
  return sanitized;
}

/**
 * Sanitizes filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'document';
  
  return filename
    .normalize('NFC')
    // Remove invalid filename characters
    .replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, '')
    // Replace spaces with underscores
    .replaceAll(/\s+/g, '_')
    // Remove consecutive underscores
    .replaceAll(/_+/g, '_')
    .trim();
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Sanitizes JSON data by removing problematic Unicode
 */
export function sanitizeJSON(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJSON);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeJSON(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}
