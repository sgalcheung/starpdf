// src/lib/pdf/markdown.ts

import { marked } from 'marked';
import { parse, type HTMLElement } from 'node-html-parser';

import type { PdfOptions } from './types';
import { renderHtmlToPdf } from './renderer';

export async function markdownToPdf(
  markdown: string,
  options: PdfOptions = {},
): Promise<Buffer> {
  const html = await marked.parse(markdown);

  const root = parse(html);

  return renderHtmlToPdf(root, options);
}
