// src/lib/markdown-image.ts

import { marked } from "marked";

function htmlToXml(html: string): string {
	return html.replace(
		/<(img|br|hr|input|meta|link|source|area|base|col|embed|param|track|wbr)(\s[^>]*)?>/gi,
		"<$1$2 />",
	);
}

export async function markdownToImage(markdown: string) {
	const html = await marked.parse(markdown);
	// const xmlHtml = htmlToXml(html);
	// const result = htmlToSvg(xmlHtml);
	// return Buffer.from(result, 'utf-8');

	return await htmlToPdf(html);
}
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

import { chromium } from "playwright";

export async function htmlToPdf(html: string) {
	const browser = await chromium.launch();

	try {
		const page = await browser.newPage({
			viewport: {
				width: 1200,
				height: 1600,
			},
		});

		await page.setContent(
			`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />

          <style>
            @page {
              size: A4;
              margin: 20mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              color: #222;
              font-family:
                "Noto Sans CJK SC",
                "PingFang SC",
                Arial,
                sans-serif;
              font-size: 16px;
              line-height: 1.8;
            }

            h1 {
              font-size: 32px;
              margin: 0 0 24px;
            }

            h2 {
              font-size: 24px;
              margin: 32px 0 16px;
            }

            p {
              margin: 0 0 16px;
            }

            img {
              max-width: 100%;
              height: auto;
            }

            pre {
              padding: 16px;
              background: #f5f5f5;
              overflow: hidden;
              white-space: pre-wrap;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th,
            td {
              padding: 8px;
              border: 1px solid #ddd;
            }
          </style>
        </head>

        <body>
          ${html}
        </body>
      </html>
    `,
			{
				waitUntil: "networkidle",
			},
		);

		return await page.pdf({
			format: "A4",
			printBackground: true,
		});
	} finally {
		await browser.close();
	}
}

import path from "node:path";
export interface UrlResource {
	url: string;
	buffer: Buffer;
	name: string;
	filename: string;
	extension: string;
	mimeType: string;
	size: number;
}

import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function resourceFromUrl(url: string): Promise<UrlResource> {
	const isRemote = /^https?:\/\//i.test(url);

	let buffer: Buffer;
	let filename: string;
	let mimeType: string;

	if (isRemote) {
		// 远程资源
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
		}

		buffer = Buffer.from(await response.arrayBuffer());

		const pathname = new URL(url).pathname;
		filename = path.basename(pathname);

		mimeType = response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
	} else {
		// 本地资源
		const filePath = url.startsWith("file://") ? fileURLToPath(url) : path.resolve(url);

		buffer = await fs.readFile(filePath);

		filename = path.basename(filePath);

		mimeType = getMimeType(path.extname(filename));
	}

	const extension = path.extname(filename).toLowerCase();
	const name = path.basename(filename, extension);

	return {
		url,
		buffer,
		filename,
		name,
		extension,
		mimeType,
		size: buffer.length,
	};
}

function getMimeType(extension: string): string {
	const mimeTypes: Record<string, string> = {
		".pdf": "application/pdf",
		".epub": "application/epub+zip",
		".txt": "text/plain",
		".md": "text/markdown",
		".html": "text/html",
		".json": "application/json",
		".xml": "application/xml",
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".png": "image/png",
		".gif": "image/gif",
		".webp": "image/webp",
	};

	return mimeTypes[extension.toLowerCase()] ?? "application/octet-stream";
}
