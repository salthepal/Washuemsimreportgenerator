/**
 * DOCX generation utilities
 * Converts Markdown-formatted text to properly structured Word documents
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';

export interface DocxGenerationOptions {
  filename?: string;
  pageMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * Parses inline Markdown formatting (**bold**, *italic*) and returns TextRun array
 */
function parseInlineFormatting(text: string): TextRun[] {
  const textRuns: TextRun[] = [];
  
  // Split by both bold and italic markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  
  parts.forEach(part => {
    if (!part) return;
    
    // Bold text (**text**)
    if (part.startsWith('**') && part.endsWith('**')) {
      textRuns.push(new TextRun({ 
        text: part.slice(2, -2), 
        bold: true 
      }));
    }
    // Italic text (*text*) but not bold
    else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      textRuns.push(new TextRun({ 
        text: part.slice(1, -1), 
        italics: true 
      }));
    }
    // Regular text
    else {
      textRuns.push(new TextRun(part));
    }
  });

  return textRuns.length > 0 ? textRuns : [new TextRun(text)];
}

/**
 * Converts Markdown-formatted text to DOCX paragraphs
 */
async function markdownToDocxParagraphs(markdown: string): Promise<Paragraph[]> {
  const lines = markdown.split('\n');
  const children: Paragraph[] = [];
  let currentFindingLevel = 0; // Track if we're in a ### subsection for indentation

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      // Add spacing for empty lines
      children.push(new Paragraph({ text: '' }));
      currentFindingLevel = 0;
      continue;
    }

    // H1: Main title with # 
    if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('##')) {
      children.push(
        new Paragraph({
          text: trimmedLine.substring(2).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
      currentFindingLevel = 0;
    }
    // H2: Major sections with ##
    else if (trimmedLine.startsWith('## ') && !trimmedLine.startsWith('###')) {
      children.push(
        new Paragraph({
          text: trimmedLine.substring(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
      currentFindingLevel = 0;
    }
    // H3: Specific findings with ###
    else if (trimmedLine.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: trimmedLine.substring(4).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        })
      );
      currentFindingLevel = 1; // We're now in a finding subsection
    }
    // Bullet points with -, •, or *
    else if (trimmedLine.match(/^[-•*]\s+/)) {
      children.push(
        new Paragraph({
          text: trimmedLine.replace(/^[-•*]\s+/, ''),
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    }
    // Numbered lists (1. or 1))
    else if (trimmedLine.match(/^\d+[\.)]\s+/)) {
      children.push(
        new Paragraph({
          text: trimmedLine.replace(/^\d+[\.)]\s+/, ''),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 80 },
        })
      );
    }
    // Image tags ![alt](url)
    else if (trimmedLine.match(/^!\[.*?\]\((.*?)\)$/)) {
      const match = trimmedLine.match(/^!\[.*?\]\((.*?)\)$/);
      const url = match ? match[1] : null;
      if (url) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: arrayBuffer,
                  type: 'jpg',
                  transformation: {
                    width: 500,
                    height: 350,
                  },
                }),
              ],
              spacing: { before: 120, after: 120 },
            })
          );
        } catch (err) {
          console.warn("Failed to embed image in DOCX:", url);
          children.push(new Paragraph({ text: `[Image unable to load: ${url}]`, italics: true }));
        }
      }
    }
    // Regular paragraphs with inline formatting
    else {
      const textRuns = parseInlineFormatting(trimmedLine);
      
      // Apply indentation for paragraphs under ### findings
      const indentLevel = currentFindingLevel > 0 ? 720 : 0;

      children.push(
        new Paragraph({
          children: textRuns,
          spacing: { after: 120 },
          indent: indentLevel > 0 ? { left: indentLevel } : undefined,
        })
      );
    }
  }

  return children;
}

/**
 * Generates a DOCX blob from Markdown-formatted text
 */
export async function generateDocxFromMarkdown(
  markdown: string, 
  options: DocxGenerationOptions = {}
): Promise<Blob> {
  const paragraphs = await markdownToDocxParagraphs(markdown);
  
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: 'start',
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: options.pageMargins?.top ?? 1440,    // 1 inch (1440 twips)
              right: options.pageMargins?.right ?? 1440,  // 1 inch
              bottom: options.pageMargins?.bottom ?? 1440, // 1 inch
              left: options.pageMargins?.left ?? 1440,   // 1 inch
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Downloads a DOCX file from Markdown-formatted text
 */
export async function downloadDocxFromMarkdown(
  markdown: string, 
  options: DocxGenerationOptions = {}
): Promise<void> {
  const blob = await generateDocxFromMarkdown(markdown, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename || `document-${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
