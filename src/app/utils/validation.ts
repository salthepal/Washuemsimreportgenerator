/**
 * Common validation utilities used across components
 */

export const FILE_VALIDATIONS = {
  DOCX: {
    extension: '.docx',
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
};

/**
 * Validates a DOCX file
 */
export function validateDocxFile(file: File): string | null {
  if (!file.name.endsWith(FILE_VALIDATIONS.DOCX.extension)) {
    return 'Please upload a .docx file';
  }
  
  if (file.size > FILE_VALIDATIONS.DOCX.maxSize) {
    const maxSizeMB = FILE_VALIDATIONS.DOCX.maxSize / (1024 * 1024);
    return `File size exceeds ${maxSizeMB}MB limit`;
  }
  
  if (file.size === 0) {
    return 'File appears to be empty or corrupted';
  }
  
  return null;
}

/**
 * Validates minimum content length
 */
export function validateMinLength(text: string, minWords: number, minChars: number): { 
  isValid: boolean; 
  wordCount: number; 
  charCount: number;
} {
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = text.length;
  
  return {
    isValid: wordCount >= minWords && charCount >= minChars,
    wordCount,
    charCount,
  };
}

/**
 * Validates required fields
 */
export function validateRequiredField(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}
