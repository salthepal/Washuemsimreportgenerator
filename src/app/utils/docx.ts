/**
 * DOCX generation utilities
 * Converts Markdown-formatted text to properly structured Word documents
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType } from 'docx';

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

async function fetchImageBuffer(url: string): Promise<{ buffer: ArrayBuffer; type: 'jpg' | 'png' } | null> {
  try {
    const response = await fetch(url);
    const mimeType = response.headers.get('content-type')?.split(';')[0].trim() ?? 'image/jpeg';
    if (mimeType === 'image/png') {
      return { buffer: await response.arrayBuffer(), type: 'png' };
    }
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return { buffer: await response.arrayBuffer(), type: 'jpg' };
    }
    // Convert unsupported formats to JPEG via canvas
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const jpegBlob = await new Promise<Blob>((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d')?.drawImage(img, 0, 0);
          canvas.toBlob((b) => b ? res(b) : rej(new Error('toBlob failed')), 'image/jpeg', 0.9);
        };
        img.onerror = rej;
        img.src = objectUrl;
      });
      return { buffer: await jpegBlob.arrayBuffer(), type: 'jpg' };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

/**
 * Converts Markdown-formatted text to DOCX paragraphs
 */
async function markdownToDocxParagraphs(markdown: string): Promise<(Paragraph | Table)[]> {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];
  let currentFindingLevel = 0;
  const imgRegex = /^!\[.*?\]\((.*?)\)$/;

  // Pre-process into segments so consecutive images can be batched into collage rows
  type TextSeg = { kind: 'text'; line: string };
  type ImageGroupSeg = { kind: 'images'; urls: string[] };
  type Seg = TextSeg | ImageGroupSeg;

  const segments: Seg[] = [];
  let idx = 0;
  while (idx < lines.length) {
    const trimmed = lines[idx].trim();
    if (imgRegex.test(trimmed)) {
      const urls: string[] = [];
      while (idx < lines.length) {
        const l = lines[idx].trim();
        if (imgRegex.test(l)) {
          const m = l.match(imgRegex);
          if (m) urls.push(m[1]);
          idx++;
        } else if (!l) {
          idx++;
        } else {
          break;
        }
      }
      segments.push({ kind: 'images', urls });
    } else {
      segments.push({ kind: 'text', line: trimmed });
      idx++;
    }
  }

  for (const seg of segments) {
    if (seg.kind === 'text') {
      const trimmedLine = seg.line;

      if (!trimmedLine) {
        children.push(new Paragraph({ text: '' }));
        currentFindingLevel = 0;
        continue;
      }

      if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('##')) {
        children.push(new Paragraph({
          text: trimmedLine.substring(2).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }));
        currentFindingLevel = 0;
      } else if (trimmedLine.startsWith('## ') && !trimmedLine.startsWith('###')) {
        children.push(new Paragraph({
          text: trimmedLine.substring(3).trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }));
        currentFindingLevel = 0;
      } else if (trimmedLine.startsWith('### ')) {
        children.push(new Paragraph({
          text: trimmedLine.substring(4).trim(),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        }));
        currentFindingLevel = 1;
      } else if (trimmedLine.match(/^[-•*]\s+/)) {
        children.push(new Paragraph({
          text: trimmedLine.replace(/^[-•*]\s+/, ''),
          bullet: { level: 0 },
          spacing: { after: 80 },
        }));
      } else if (trimmedLine.match(/^\d+[\.)]\s+/)) {
        children.push(new Paragraph({
          text: trimmedLine.replace(/^\d+[\.)]\s+/, ''),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 80 },
        }));
      } else {
        const textRuns = parseInlineFormatting(trimmedLine);
        const indentLevel = currentFindingLevel > 0 ? 720 : 0;
        children.push(new Paragraph({
          children: textRuns,
          spacing: { after: 120 },
          indent: indentLevel > 0 ? { left: indentLevel } : undefined,
        }));
      }
    } else {
      // Render images in rows of 3 using a table
      const imagesPerRow = 3;
      // ~150×113 px per cell for a 3-column layout (EMU: 1pt = 12700 EMU, but docx uses px at 96dpi)
      const cellImgWidth = 150;
      const cellImgHeight = 113;

      for (let row = 0; row < seg.urls.length; row += imagesPerRow) {
        const rowUrls = seg.urls.slice(row, row + imagesPerRow);
        const cells: TableCell[] = [];

        for (const url of rowUrls) {
          const imgData = await fetchImageBuffer(url);
          const cellContent = imgData
            ? new Paragraph({
                children: [new ImageRun({ data: imgData.buffer, type: imgData.type, transformation: { width: cellImgWidth, height: cellImgHeight } })],
                spacing: { after: 60 },
              })
            : new Paragraph({ text: '[Image failed to load]', italics: true });

          cells.push(new TableCell({
            children: [cellContent],
            width: { size: Math.floor(100 / imagesPerRow), type: WidthType.PERCENTAGE },
          }));
        }

        // Pad row to always have imagesPerRow cells so columns align
        while (cells.length < imagesPerRow) {
          cells.push(new TableCell({
            children: [new Paragraph({ text: '' })],
            width: { size: Math.floor(100 / imagesPerRow), type: WidthType.PERCENTAGE },
          }));
        }

        children.push(new Table({
          rows: [new TableRow({ children: cells })],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      }
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
