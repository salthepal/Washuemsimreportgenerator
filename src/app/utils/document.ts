/**
 * Document processing utilities
 */
import mammoth from 'mammoth';
import { sanitizeText, sanitizeHTML } from './sanitize';

export interface ProcessedDocument {
  title: string;
  content: string;
  htmlContent: string;
}

/**
 * Processes a DOCX file and extracts content
 */
export async function processDocxFile(file: File): Promise<ProcessedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  
  // Extract plain text for content field
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = result.value;
  const plainText = sanitizeText(tempDiv.textContent || tempDiv.innerText || '');
  
  // Auto-extract title from first heading or filename
  const firstHeading = tempDiv.querySelector('h1, h2, h3');
  const title = sanitizeText(
    firstHeading?.textContent?.trim() || file.name.replace('.docx', '')
  );
  
  // Sanitize HTML content
  const htmlContent = sanitizeHTML(result.value);
  
  return {
    title,
    content: plainText,
    htmlContent,
  };
}

/**
 * Formats date for display
 */
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

/**
 * Formats date and time for display
 */
export function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}
