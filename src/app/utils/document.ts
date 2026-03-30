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
  
  // Extract plain text directly (faster and more reliable)
  const plainTextResult = await mammoth.extractRawText({ arrayBuffer });
  const plainText = sanitizeText(plainTextResult.value);
  
  // Convert to HTML for htmlContent field
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const htmlContent = sanitizeHTML(htmlResult.value);
  
  // Extract title from first heading in HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlResult.value;
  const firstHeading = tempDiv.querySelector('h1, h2, h3');
  const title = sanitizeText(
    firstHeading?.textContent?.trim() || file.name.replace('.docx', '')
  );
  
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