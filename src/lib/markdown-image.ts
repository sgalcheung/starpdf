import { marked } from 'marked';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const MARGIN = 60;

type HtmlBlock =
  | {
      type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol' | 'blockquote';

      html: string;
    }
  | {
      type: 'img';

      src: string;

      alt: string;
    }
  | {
      type: 'hr';
    };

const FONT_REGULAR = path.join(
  process.cwd(),
  'public/fonts/NotoSansSC-Regular.ttf',
);

const FONT_BOLD = path.join(process.cwd(), 'public/fonts/NotoSansSC-Bold.ttf');

const FONT_ITALIC = path.join(
  process.cwd(),
  'public/fonts/NotoSansSC-Italic.ttf',
);

/**
 * Markdown → PDF
 */
export async function markdownToImage(markdown: string): Promise<Buffer> {
  const html = await marked.parse(markdown);

  return htmlToPdf(html);
}

/**
 * HTML → PDF
 */
export function htmlToPdf(html: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    renderHtml(doc, html);

    doc.end();
  });
}

/**
 * HTML → PDFKit
 */
function renderHtml(doc: PDFKit.PDFDocument, html: string) {
  const blocks = parseHtmlBlocks(html);

  for (const block of blocks) {
    switch (block.type) {
      case 'h1':
        renderHeading(doc, block.html, 26);
        break;

      case 'h2':
        renderHeading(doc, block.html, 22);
        break;

      case 'h3':
        renderHeading(doc, block.html, 18);
        break;

      case 'h4':
        renderHeading(doc, block.html, 15);
        break;

      case 'p':
        renderParagraph(doc, block.html);
        break;

      case 'ul':
        renderList(doc, block.html, false);
        break;

      case 'ol':
        renderList(doc, block.html, true);
        break;

      case 'blockquote':
        renderBlockquote(doc, block.html);
        break;

      case 'img':
        renderImage(doc, block.src, block.alt);
        break;

      case 'hr':
        doc.addPage();
        break;
    }
  }
}

/**
 * 非严格 HTML parser
 *
 * 这里只处理 Markdown 常见结构，
 * 不需要引入完整 HTML → PDF 引擎。
 */
function parseHtmlBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = [];

  const regex =
    /<(h1|h2|h3|h4|p|ul|ol|blockquote|img|hr)(?:\s+([^>]*))?>([\s\S]*?)<\/\1>|<(img|hr)(?:\s+([^>]*))?\s*\/?>/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html))) {
    const tag = (match[1] ?? match[4]).toLowerCase();

    const attributes = match[2] ?? match[5] ?? '';

    const content = match[3] ?? '';

    if (tag === 'img') {
      blocks.push({
        type: 'img',
        src: getAttribute(attributes, 'src') ?? '',
        alt: getAttribute(attributes, 'alt') ?? '',
      });

      continue;
    }

    if (tag === 'hr') {
      blocks.push({
        type: 'hr',
      });

      continue;
    }

    if (
      tag === 'h1' ||
      tag === 'h2' ||
      tag === 'h3' ||
      tag === 'h4' ||
      tag === 'p' ||
      tag === 'ul' ||
      tag === 'ol' ||
      tag === 'blockquote'
    ) {
      blocks.push({
        type: tag,
        html: content,
      });

      continue;
    }
  }

  return blocks;
}

function getAttribute(attributes: string, name: string): string | undefined {
  const regex = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');

  return attributes.match(regex)?.[1];
}

/**
 * 标题
 */
function renderHeading(
  doc: PDFKit.PDFDocument,
  html: string,
  fontSize: number,
) {
  ensureSpace(doc, 80);

  doc.font(FONT_BOLD).fontSize(fontSize).fillColor('#222');

  renderInlineText(doc, html);

  doc.moveDown(0.8);
}

/**
 * 正文
 */
function renderParagraph(doc: PDFKit.PDFDocument, html: string) {
  const text = stripHtml(html).trim();

  if (!text) {
    return;
  }

  ensureSpace(doc, 40);

  doc.font(FONT_REGULAR).fontSize(12).fillColor('#222');

  renderInlineText(doc, html);

  doc.moveDown(0.7);
}

/**
 * 行内 HTML
 *
 * 支持：
 * strong
 * em
 * code
 * a
 * br
 */
function renderInlineText(doc: PDFKit.PDFDocument, html: string) {
  const tokens = html.split(
    /(<strong>[\s\S]*?<\/strong>|<b>[\s\S]*?<\/b>|<em>[\s\S]*?<\/em>|<i>[\s\S]*?<\/i>|<code>[\s\S]*?<\/code>|<br\s*\/?>|<a[^>]*>[\s\S]*?<\/a>)/gi,
  );

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (/^<strong>/i.test(token) || /^<b>/i.test(token)) {
      doc.font(FONT_BOLD).text(stripHtml(token), {
        continued: true,
      });

      continue;
    }

    if (/^<em>/i.test(token) || /^<i>/i.test(token)) {
      doc.font(FONT_ITALIC).text(stripHtml(token), {
        continued: true,
      });

      continue;
    }

    if (/^<code>/i.test(token)) {
      doc.font(FONT_REGULAR).fontSize(10).text(stripHtml(token), {
        continued: true,
      });

      continue;
    }

    if (/^<br/i.test(token)) {
      doc.text('\n', {
        continued: true,
      });

      continue;
    }

    if (/^<a/i.test(token)) {
      doc.font(FONT_REGULAR).text(stripHtml(token), {
        continued: true,
        underline: true,
      });

      continue;
    }

    doc.font(FONT_REGULAR).fontSize(12).text(decodeHtml(token), {
      continued: true,
    });
  }

  // 结束 continued 状态
  doc.text('');
}

/**
 * 无序 / 有序列表
 */
function renderList(doc: PDFKit.PDFDocument, html: string, ordered: boolean) {
  const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];

  items.forEach((item, index) => {
    ensureSpace(doc, 30);

    const bullet = ordered ? `${index + 1}.` : '•';

    const text = stripHtml(item[1]).trim();

    const x = MARGIN;
    const y = doc.y;

    doc.font(FONT_REGULAR).fontSize(12).text(bullet, x, y, {
      width: 20,
    });

    doc.text(text, x + 20, y, {
      width: A4_WIDTH - MARGIN * 2 - 20,
      lineGap: 4,
    });

    doc.moveDown(0.3);
  });

  doc.moveDown(0.5);
}

/**
 * 引用
 */
function renderBlockquote(doc: PDFKit.PDFDocument, html: string) {
  ensureSpace(doc, 60);

  const text = stripHtml(html).trim();

  const x = MARGIN;
  const y = doc.y;

  doc.save().rect(x, y, 4, 50).fill('#999').restore();

  doc
    .font(FONT_ITALIC)
    .fontSize(12)
    .fillColor('#666')
    .text(text, x + 15, y, {
      width: A4_WIDTH - MARGIN * 2 - 15,
      lineGap: 5,
    });

  doc.moveDown(1);
}

/**
 * 图片
 */
function renderImage(doc: PDFKit.PDFDocument, src: string, alt: string) {
  if (!src) {
    return;
  }

  const imagePath = resolveImagePath(src);

  if (!imagePath || !fs.existsSync(imagePath)) {
    console.warn(`Image not found: ${src}`);

    return;
  }

  try {
    /**
     * PDFKit 可以直接读取图片。
     *
     * 这里不再使用 openImage，
     * 避免 TypeScript 类型问题。
     */
    const maxWidth = A4_WIDTH - MARGIN * 2;

    const maxHeight = A4_HEIGHT - MARGIN * 2;

    /**
     * 先尝试把图片放到当前页面。
     */
    doc.image(imagePath, MARGIN, doc.y, {
      fit: [maxWidth, maxHeight],
      align: 'center',
    });

    doc.moveDown(1);

    if (alt) {
      doc.font(FONT_REGULAR).fontSize(9).fillColor('#888').text(alt, {
        width: maxWidth,
        align: 'center',
      });

      doc.moveDown(1);
    }
  } catch (error) {
    console.warn(`Failed to render image: ${src}`, error);
  }
}

/**
 * 自动分页
 */
function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > A4_HEIGHT - MARGIN) {
    doc.addPage({
      size: 'A4',
      margin: MARGIN,
    });
  }
}

/**
 * HTML → 纯文本
 */
function stripHtml(html: string): string {
  return decodeHtml(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
}

/**
 * HTML entity
 */
function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * 图片路径
 */
function resolveImagePath(src: string): string | null {
  /**
   * 暂时不支持远程图片。
   *
   * Netlify Serverless Function
   * 如果需要远程图片，需要另外 fetch。
   */
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return null;
  }

  /**
   * /images/foo.jpg
   *
   * →
   *
   * public/images/foo.jpg
   */
  if (src.startsWith('/')) {
    return path.join(process.cwd(), 'public', src.slice(1));
  }

  return path.join(process.cwd(), src);
}

/**
 * SVG XML 转换
 *
 * 你原来的函数可以继续保留。
 */
export function htmlToXml(html: string): string {
  return html.replace(
    /<(img|br|hr|input|meta|link|source|area|base|col|embed|param|track|wbr)(\s[^>]*)?>/gi,
    '<$1$2 />',
  );
}

/**
 * HTML → SVG
 *
 * 如果以后还需要 SVG，
 * 这个函数继续可以使用。
 */
export function htmlToSvg(html: string, width = 800, height = 1200) {
  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>
  <foreignObject
    x="0"
    y="0"
    width="${width}"
    height="${height}"
  >
    <xhtml:div
      xmlns="http://www.w3.org/1999/xhtml"
      style="
        width: ${width}px;
        height: ${height}px;
        box-sizing: border-box;
        padding: 60px;
        background: white;
        color: #222;
        font-family: Arial, sans-serif;
        font-size: 20px;
        line-height: 1.8;
      "
    >
      ${html}
    </xhtml:div>
  </foreignObject>
</svg>
`;
}
