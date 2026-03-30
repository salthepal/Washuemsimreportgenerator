/**
 * Text Sanitization Utility
 * 
 * Strips out problematic Unicode characters, escape sequences, and control characters
 * that can cause 'Unsupported Unicode' errors or database issues.
 */

/**
 * Sanitizes a string by removing or replacing problematic characters
 * - Removes control characters (except newlines, tabs, and carriage returns)
 * - Converts various Unicode whitespace to standard space
 * - Removes zero-width characters and other invisible Unicode
 * - Removes Unicode escape sequences in string format
 * - Normalizes the string to NFC form
 * - Removes backslash escape sequences that aren't standard JSON
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;

  // Step 1: Remove literal backslash-u escape sequences that might appear in pasted text
  // e.g., "\u0000" as a string literal
  sanitized = sanitized.replace(/\\u[0-9a-fA-F]{4}/g, '');
  sanitized = sanitized.replace(/\\x[0-9a-fA-F]{2}/g, '');
  
  // Step 2: Remove actual Unicode control characters (U+0000 to U+001F and U+007F to U+009F)
  // BUT keep newline (\n = U+000A), carriage return (\r = U+000D), and tab (\t = U+0009)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  
  // Step 3: Remove zero-width characters and other invisible Unicode
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width spaces
  sanitized = sanitized.replace(/[\u2060-\u206F]/g, ''); // Word joiners and other invisible formatting
  
  // Step 4: Remove bidirectional text markers that can cause rendering issues
  sanitized = sanitized.replace(/[\u202A-\u202E]/g, '');
  
  // Step 5: Normalize various Unicode whitespace characters to standard space
  sanitized = sanitized.replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ');
  
  // Step 6: Normalize to NFC form (canonical decomposition followed by canonical composition)
  // This ensures consistent representation of accented characters
  sanitized = sanitized.normalize('NFC');
  
  // Step 7: Remove any remaining non-standard backslash sequences
  // Keep only valid JSON escape sequences: \", \\, \/, \b, \f, \n, \r, \t
  sanitized = sanitized.replace(/\\(?!["\\/bfnrt])/g, '');
  
  // Step 8: Trim excessive whitespace
  sanitized = sanitized.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  
  // Step 9: Trim leading/trailing whitespace on each line
  sanitized = sanitized.split('\n').map(line => line.trim()).join('\n');
  
  // Step 10: Final trim
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitizes an object by recursively sanitizing all string values
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return sanitizeText(item);
      } else if (typeof item === 'object') {
        return sanitizeObject(item);
      }
      return item;
    });
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitized[key] = sanitizeText(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

/**
 * Validates that text doesn't contain problematic characters
 * Returns an error message if invalid, null if valid
 */
export function validateText(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Check for null bytes (these can cause database issues)
  if (text.includes('\x00')) {
    return 'Text contains null bytes which are not allowed';
  }

  // Check for unusual control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(text)) {
    return 'Text contains invalid control characters';
  }

  return null;
}
