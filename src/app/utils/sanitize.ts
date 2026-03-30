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
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace problematic quotes with standard ones
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes HTML content while preserving basic formatting
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  return html
    .normalize('NFC')
    // Remove script and style tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove event handlers
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    // Normalize quotes in HTML
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

/**
 * Sanitizes filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'document';
  
  return filename
    .normalize('NFC')
    // Remove invalid filename characters
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove consecutive underscores
    .replace(/_+/g, '_')
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
