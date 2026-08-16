// src/lib/pdf/renderer.ts

import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

import type { HTMLElement, Node } from 'node-html-parser';

import type { PdfOptions } from './types';
import { imageSize } from 'image-size';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const DEFAULT_MARGIN = 60;

export async function renderHtmlToPdf(
  root: HTMLElement,
  options: PdfOptions = {},
): Promise<Buffer> {
  const marginTop = options.margin?.top ?? DEFAULT_MARGIN;

  const marginRight = options.margin?.right ?? DEFAULT_MARGIN;

  const marginBottom = options.margin?.bottom ?? DEFAULT_MARGIN;

  const marginLeft = options.margin?.left ?? DEFAULT_MARGIN;

  const regularFont =
    options.font?.regular ?? defaultFont('NotoSansSC-Regular.ttf');

  const boldFont = options.font?.bold ?? regularFont;

  const italicFont = options.font?.italic ?? regularFont;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: false,
    bufferPages: true,
  });

  const renderer = new PdfRenderer(doc, {
    ...options,

    margin: {
      top: marginTop,
      right: marginRight,
      bottom: marginBottom,
      left: marginLeft,
    },

    font: {
      regular: regularFont,
      bold: boldFont,
      italic: italicFont,
    },
  });

  renderer.addPage();

  if (options.cover) {
    renderer.renderCover();
    renderer.addPage();
  }

  renderer.renderRoot(root);

  renderer.renderPageNumbers();

  return renderer.toBuffer();
}

function defaultFont(filename: string): string {
  return path.join(process.cwd(), 'public', 'fonts', filename);
}

class PdfRenderer {
  private doc: PDFKit.PDFDocument;

  private marginTop: number;
  private marginRight: number;
  private marginBottom: number;
  private marginLeft: number;

  private contentWidth: number;

  private regularFont: string;
  private boldFont: string;
  private italicFont: string;

  private pageNumber = 0;

  private options: PdfOptions;

  constructor(doc: PDFKit.PDFDocument, options: PdfOptions) {
    this.doc = doc;

    this.options = options;

    this.marginTop = options.margin?.top ?? DEFAULT_MARGIN;

    this.marginRight = options.margin?.right ?? DEFAULT_MARGIN;

    this.marginBottom = options.margin?.bottom ?? DEFAULT_MARGIN;

    this.marginLeft = options.margin?.left ?? DEFAULT_MARGIN;

    this.contentWidth = A4_WIDTH - this.marginLeft - this.marginRight;

    this.regularFont = options.font!.regular;

    this.boldFont = options.font!.bold ?? this.regularFont;

    this.italicFont = options.font!.italic ?? this.regularFont;
  }

  addPage() {
    this.doc.addPage({
      size: 'A4',
      margin: 0,
    });

    this.pageNumber++;

    this.drawHeader();
  }

  renderRoot(root: HTMLElement) {
    for (const node of root.childNodes) {
      if (node.nodeType !== 1) {
        continue;
      }

      this.renderElement(node as HTMLElement);
    }
  }

  private renderElement(element: HTMLElement) {
    const tag = element.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
        this.renderHeading(element, 30, 20);
        break;

      case 'h2':
        this.renderHeading(element, 22, 16);
        break;

      case 'h3':
        this.renderHeading(element, 18, 12);
        break;

      case 'h4':
        this.renderHeading(element, 15, 10);
        break;

      case 'p':
        this.renderParagraph(element);
        break;

      case 'ul':
        this.renderList(element, false);
        break;

      case 'ol':
        this.renderList(element, true);
        break;

      case 'blockquote':
        this.renderBlockquote(element);
        break;

      case 'img':
        this.renderImage(element);
        break;

      case 'hr':
        this.addPage();
        break;

      case 'pre':
        this.renderCodeBlock(element);
        break;

      case 'table':
        this.renderTable(element);
        break;

      default:
        this.renderChildren(element);
        break;
    }
  }

  private renderChildren(element: HTMLElement) {
    for (const node of element.childNodes) {
      if (node.nodeType !== 1) {
        continue;
      }

      this.renderElement(node as HTMLElement);
    }
  }

  private renderHeading(
    element: HTMLElement,
    fontSize: number,
    spacing: number,
  ) {
    this.ensureSpace(fontSize * 2 + spacing);

    this.doc.font(this.boldFont).fontSize(fontSize).fillColor('#222');

    this.renderInline(element);

    this.doc.moveDown(spacing / fontSize);
  }

  private renderParagraph(element: HTMLElement) {
    const text = element.text.trim();

    if (!text) {
      return;
    }

    this.ensureSpace(40);

    this.doc.font(this.regularFont).fontSize(12).fillColor('#222');

    this.renderInline(element);

    this.doc.moveDown(0.8);
  }

  private renderInline(element: HTMLElement) {
    for (const node of element.childNodes) {
      if (node.nodeType === 3) {
        const text = node.text;

        if (text) {
          this.doc.font(this.regularFont).text(text, {
            continued: true,
            lineGap: 5,
          });
        }

        continue;
      }

      if (node.nodeType !== 1) {
        continue;
      }

      const child = node as HTMLElement;

      const tag = child.tagName.toLowerCase();

      switch (tag) {
        case 'strong':
        case 'b':
          this.doc.font(this.boldFont).text(child.text, {
            continued: true,
            lineGap: 5,
          });
          break;

        case 'em':
        case 'i':
          this.doc.font(this.italicFont).text(child.text, {
            continued: true,
            lineGap: 5,
          });
          break;

        case 'code':
          this.doc.font(this.regularFont).fontSize(11).text(child.text, {
            continued: true,
          });
          break;

        case 'br':
          this.doc.text('\n', {
            continued: true,
          });
          break;

        case 'a':
          this.doc.font(this.regularFont).text(child.text, {
            continued: true,
            underline: true,
          });
          break;

        default:
          this.doc.font(this.regularFont).text(child.text, {
            continued: true,
            lineGap: 5,
          });
          break;
      }
    }

    this.doc.text('');
  }

  private renderList(element: HTMLElement, ordered: boolean) {
    const items = element.querySelectorAll(':scope > li');

    items.forEach((item, index) => {
      this.ensureSpace(30);

      const bullet = ordered ? `${index + 1}.` : '•';

      const x = this.marginLeft;

      const y = this.doc.y;

      this.doc.font(this.regularFont).fontSize(12).text(bullet, x, y, {
        width: 20,
        continued: false,
      });

      this.doc.text(item.text.trim(), x + 20, y, {
        width: this.contentWidth - 20,
        lineGap: 5,
      });

      this.doc.moveDown(0.4);
    });

    this.doc.moveDown(0.5);
  }

  private renderBlockquote(element: HTMLElement) {
    this.ensureSpace(50);

    const x = this.marginLeft;

    const y = this.doc.y;

    this.doc.save().rect(x, y, 4, 50).fill('#999').restore();

    this.doc
      .font(this.italicFont)
      .fontSize(12)
      .fillColor('#666')
      .text(element.text.trim(), x + 15, y, {
        width: this.contentWidth - 15,
        lineGap: 5,
      });

    this.doc.moveDown(1);
  }

  private renderImage(element: HTMLElement) {
    const src = element.getAttribute('src');

    if (!src) {
      return;
    }

    const imagePath = this.resolveImage(src);

    if (!imagePath || !fsExists(imagePath)) {
      return;
    }

    try {
      const buffer = fs.readFileSync(imagePath);

      const { width: imageWidth, height: imageHeight } = imageSize(buffer);

      if (!imageWidth || !imageHeight) {
        return;
      }

      const maxWidth = this.contentWidth;

      const pageHeight = A4_HEIGHT - this.marginTop - this.marginBottom;

      // 当前页面剩余高度
      let availableHeight = A4_HEIGHT - this.marginBottom - this.doc.y;

      // 如果当前页面剩余空间太小，
      // 直接新开一页
      if (availableHeight < 100) {
        this.addPage();

        availableHeight = A4_HEIGHT - this.marginBottom - this.doc.y;
      }

      let scale = Math.min(
        maxWidth / imageWidth,
        availableHeight / imageHeight,
        1,
      );

      // 如果图片本身超过一整页，
      // 按整页高度缩放
      if (imageHeight * scale > pageHeight) {
        scale = pageHeight / imageHeight;
      }

      const width = imageWidth * scale;

      const height = imageHeight * scale;

      // 如果当前页面放不下，
      // 换页后重新计算
      if (this.doc.y + height > A4_HEIGHT - this.marginBottom) {
        this.addPage();

        availableHeight = A4_HEIGHT - this.marginBottom - this.doc.y;

        scale = Math.min(
          maxWidth / imageWidth,
          availableHeight / imageHeight,
          1,
        );

        const newWidth = imageWidth * scale;

        const newHeight = imageHeight * scale;

        const x = this.marginLeft + (maxWidth - newWidth) / 2;

        this.doc.image(imagePath, x, this.doc.y, {
          width: newWidth,
          height: newHeight,
        });

        this.doc.y = this.doc.y + newHeight + 15;
      } else {
        const x = this.marginLeft + (maxWidth - width) / 2;

        this.doc.image(imagePath, x, this.doc.y, {
          width,
          height,
        });

        this.doc.y = this.doc.y + height + 15;
      }

      const alt = element.getAttribute('alt');

      if (alt) {
        this.doc
          .font(this.regularFont)
          .fontSize(9)
          .fillColor('#888')
          .text(alt, this.marginLeft, this.doc.y, {
            width: this.contentWidth,
            align: 'center',
          });

        this.doc.moveDown(1);
      }
    } catch (error) {
      console.warn(`Failed to render image: ${imagePath}`, error);
    }
  }

  private renderCodeBlock(element: HTMLElement) {
    this.ensureSpace(60);

    this.doc
      .font(this.regularFont)
      .fontSize(9)
      .fillColor('#333')
      .text(element.text, {
        width: this.contentWidth,
        lineGap: 3,
      });

    this.doc.moveDown(1);
  }

  private renderTable(element: HTMLElement) {
    const rows = element.querySelectorAll('tr');

    const data: string[][] = [];

    for (const row of rows) {
      const cells = row.querySelectorAll('th, td');

      data.push(cells.map((cell) => cell.text.trim()));
    }

    if (!data.length) {
      return;
    }

    const columnCount = Math.max(...data.map((row) => row.length));

    const columnWidth = this.contentWidth / columnCount;

    const rowHeight = 24;

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];

      this.ensureSpace(rowHeight);

      for (let col = 0; col < columnCount; col++) {
        const value = row[col] ?? '';

        const x = this.marginLeft + col * columnWidth;

        const y = this.doc.y;

        this.doc.rect(x, y, columnWidth, rowHeight).stroke('#ccc');

        this.doc
          .font(this.regularFont)
          .fontSize(9)
          .fillColor('#222')
          .text(value, x + 5, y + 6, {
            width: columnWidth - 10,
            height: rowHeight - 8,
            ellipsis: true,
          });
      }

      this.doc.y += rowHeight;
    }

    this.doc.moveDown();
  }

  renderCover() {
    const title = this.options.title ?? 'Magazine';

    this.doc
      .font(this.boldFont)
      .fontSize(36)
      .fillColor('#111')
      .text(title, this.marginLeft, 250, {
        width: this.contentWidth,
        align: 'center',
      });

    if (this.options.issueNo !== undefined) {
      this.doc
        .moveDown(1)
        .font(this.regularFont)
        .fontSize(18)
        .text(`第 ${this.options.issueNo} 期`, {
          align: 'center',
        });
    }

    if (this.options.author) {
      this.doc
        .moveDown(1)
        .font(this.regularFont)
        .fontSize(12)
        .text(this.options.author, {
          align: 'center',
        });
    }
  }

  private drawHeader() {
    if (!this.options.header) {
      return;
    }

    this.doc
      .font(this.regularFont)
      .fontSize(8)
      .fillColor('#888')
      .text(this.options.header, this.marginLeft, 25, {
        width: this.contentWidth,
        align: 'center',
      });
  }

  renderPageNumbers() {
    if (this.options.showPageNumber === false) {
      return;
    }

    const range = this.doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);

      this.doc
        .font(this.regularFont)
        .fontSize(8)
        .fillColor('#888')
        .text(String(i + 1), this.marginLeft, A4_HEIGHT - 30, {
          width: this.contentWidth,
          align: 'center',
        });
    }
  }

  private ensureSpace(height: number) {
    if (this.doc.y + height > A4_HEIGHT - this.marginBottom) {
      this.addPage();
    }
  }

  private resolveImage(src: string): string | null {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return null;
    }

    if (src.startsWith('/')) {
      return path.join(process.cwd(), 'public', src.substring(1));
    }

    return path.join(process.cwd(), src);
  }

  toBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      this.doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      this.doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      this.doc.on('error', reject);

      this.doc.end();
    });
  }
}

function fsExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
