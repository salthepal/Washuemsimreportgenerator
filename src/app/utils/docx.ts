/**
 * DOCX generation utilities
 * Converts Markdown-formatted text to properly structured Word documents
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

export interface DocxGenerationOptions {
  filename?: string;
  pageMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  pageSize?: {
    width?: number;  // twips; defaults to 12240 (Letter 8.5")
    height?: number; // twips; defaults to 15840 (Letter 11")
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
    if (!response.ok) return null;
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
async function markdownToDocxParagraphs(markdown: string, pageMargins?: DocxGenerationOptions['pageMargins'], pageSize?: DocxGenerationOptions['pageSize']): Promise<(Paragraph | Table)[]> {
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

  // Hoisted outside loop: constants and helpers used by image-group segments
  const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const noBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideH: NO_BORDER, insideV: NO_BORDER };

  // Derive usable content width from actual page size and margins.
  // Defaults: Letter 8.5" wide = 12240 twips, 1-inch margins = 1440 twips each side.
  const pageWidthTwips = pageSize?.width ?? 12240;
  const leftMargin     = pageMargins?.left  ?? 1440;
  const rightMargin    = pageMargins?.right ?? 1440;
  const CONTENT_W = pageWidthTwips - leftMargin - rightMargin;
  const COL_BIG  = Math.round(CONTENT_W * 0.6);
  const COL_SM   = CONTENT_W - COL_BIG;
  const COL_HALF = Math.round(CONTENT_W / 2);

  const BIG_W = 350; const BIG_H = 262;
  const SM_W = 220;  const SM_H = 125;

  const imgCell = (imgData: Awaited<ReturnType<typeof fetchImageBuffer>>, w: number, h: number, widthDxa: number): TableCell => {
    const content = imgData
      ? new Paragraph({ children: [new ImageRun({ data: imgData.buffer, type: imgData.type, transformation: { width: w, height: h } })], spacing: { after: 0 } })
      : new Paragraph({ children: [new TextRun({ text: '[Image unavailable]', italics: true })] });
    return new TableCell({
      children: [content],
      borders: noBorders,
      width: { size: widthDxa, type: WidthType.DXA },
    });
  };

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
      // Render session photos as an alternating mosaic collage using nested tables
      let groupIdx = 0;
      let imgI = 0;
      while (imgI < seg.urls.length) {
        const groupSize = Math.min(seg.urls.length - imgI, 3);
        const group = seg.urls.slice(imgI, imgI + groupSize);
        const mirrored = groupIdx % 2 === 1;

        if (groupSize === 1) {
          const imgData = await fetchImageBuffer(group[0]);
          children.push(new Table({
            rows: [new TableRow({ children: [imgCell(imgData, 580, 345, CONTENT_W)] })],
            columnWidths: [CONTENT_W],
            width: { size: CONTENT_W, type: WidthType.DXA },
            borders: noBorders,
          }));
        } else if (groupSize === 2) {
          const [d0, d1] = await Promise.all(group.map(fetchImageBuffer));
          children.push(new Table({
            rows: [new TableRow({ children: [imgCell(d0, 280, 210, COL_HALF), imgCell(d1, 280, 210, COL_HALF)] })],
            columnWidths: [COL_HALF, COL_HALF],
            width: { size: CONTENT_W, type: WidthType.DXA },
            borders: noBorders,
          }));
        } else {
          // 3 images: big (60%) + two stacked smalls (40%), alternating mirror.
          const [d0, d1, d2] = await Promise.all(group.map(fetchImageBuffer));
          // When mirrored: group[0]=small-top, group[1]=small-bottom, group[2]=big
          // When normal:   group[0]=big,       group[1]=small-top,    group[2]=small-bottom
          const bigData = mirrored ? d2 : d0;
          const sm1Data = mirrored ? d0 : d1;
          const sm2Data = mirrored ? d1 : d2;

          const bigCell = imgCell(bigData, BIG_W, BIG_H, COL_BIG);

          // Inner table holds the two small images stacked; uses explicit DXA width
          const stackedTable = new Table({
            rows: [
              new TableRow({ children: [imgCell(sm1Data, SM_W, SM_H, COL_SM)] }),
              new TableRow({ children: [imgCell(sm2Data, SM_W, SM_H, COL_SM)] }),
            ],
            columnWidths: [COL_SM],
            width: { size: COL_SM, type: WidthType.DXA },
            borders: noBorders,
          });

          const stackCell = new TableCell({ children: [stackedTable], borders: noBorders, width: { size: COL_SM, type: WidthType.DXA } });

          children.push(new Table({
            rows: [new TableRow({ children: mirrored ? [stackCell, bigCell] : [bigCell, stackCell] })],
            columnWidths: mirrored ? [COL_SM, COL_BIG] : [COL_BIG, COL_SM],
            width: { size: CONTENT_W, type: WidthType.DXA },
            borders: noBorders,
          }));
        }

        children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
        imgI += groupSize;
        groupIdx++;
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
  const paragraphs = await markdownToDocxParagraphs(markdown, options.pageMargins, options.pageSize);
  
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
            size: {
              width:  options.pageSize?.width  ?? 12240, // Letter 8.5" default
              height: options.pageSize?.height ?? 15840, // Letter 11" default
            },
            margin: {
              top:    options.pageMargins?.top    ?? 1440,
              right:  options.pageMargins?.right  ?? 1440,
              bottom: options.pageMargins?.bottom ?? 1440,
              left:   options.pageMargins?.left   ?? 1440,
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
