import fs from "node:fs/promises";
import path from "node:path";

import {
	type AstroComponentFactory,
	createComponent,
	renderTemplate,
	unescapeHTML,
} from "astro/runtime/server/index.js";
import { marked } from "marked";
import { html } from "satori-html";

import { markdownToImage } from "../markdown-image.ts";
import type { Format, ImageResult, Page } from "../types.js";
import { hashString } from "../utils/bufferHelper.ts";
import { emitPdfAsset } from "../utils/emitPdfAsset.ts";
import type { Metadata } from "../utils/metadata.ts";
import { renderedHtml } from "../utils/renderedHtml.js";
import { renderContentToPdf, renderHtmlToSvg, renderSatoriToSvg } from "../utils/satoriRenderer.js";
import { convertSvgToPdf } from "../utils/svgToPdf.ts";
import { getUrlFileName } from "../utils/urlHelper.js";

// export const DocumentViewer: AstroComponentFactory = createComponent(
//   async (result, props: DocumentViewerProps) => {
//     const { content, url, format, crop, ...imageProps } = props;
//     const { DocumentViewer: Content } = await getDocumentViewer(content, url, {
//       format: format ?? 'pdf',
//       crop: crop ?? false,
//     });
//     return renderTemplate`${renderComponent(result, 'DocumentViewer', Content, imageProps)}`;
//   },
// );

function createDocumentViewerComponent(content: ImageResult): AstroComponentFactory {
	return createComponent((_result, props: DocumentViewerImageProps) => {
		const format = content.format;
		const alt = props.alt ?? content.alt ?? "";
		const html = renderedHtml(content.page, format, alt, {
			class: props.class ?? "",
			style: props.style ?? "",
			pageLimit: props.pageLimit ?? 10,
		});
		return renderTemplate`${unescapeHTML(html)}`;
	});
}

export interface LocalFileContent {
	resourceType: "pdf" | "markdown" | "text";
	filePath: string;
	sourceKey: string;
	assetTitle: string;
}

export function fromLocalFile(file: LocalFileContent): DocumentResource {
	return {
		title: file.assetTitle,
		cacheKey: file.sourceKey,
		render: async () => {
			if (file.resourceType === "pdf") {
				return await fs.readFile(file.filePath);
			}

			const rawText = await fs.readFile(file.filePath, "utf-8");

			let title = file.assetTitle;
			let body = rawText;
			let isMarkdown = false;

			if (file.resourceType === "markdown") {
				isMarkdown = true;
				const parsed = await marked.parse(rawText);
				title = file.assetTitle;
				body = parsed;
			}

			return renderContentToPdf(title, body, isMarkdown);
		},
	};
}

export function fromTextContent(content: DocumentViewer): DocumentResource {
	return {
		title: content.assetTitle,
		cacheKey: hashString(content.source),
		render: () => markdownToImage(content.source),
	};
}

/**
 * Unified handling of remote URLs and local file paths
 * @param pathOrUrl - Remote URL (http/https) or local relative/absolute path
 */
export async function fromBinaryPathOrUrl(pathOrUrl: string): Promise<DocumentResource> {
	const isRemote = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://");
	const fileName = isRemote ? getUrlFileName(pathOrUrl) : path.basename(pathOrUrl);

	if (isRemote) {
		return {
			title: fileName,
			cacheKey: pathOrUrl,
			render: async () => {
				const res = await fetch(pathOrUrl);
				if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
				return Buffer.from(await res.arrayBuffer());
			},
		};
	} else {
		const absolutePath = path.resolve(process.cwd(), pathOrUrl);
		const stat = await fs.stat(absolutePath);
		return {
			title: fileName,
			cacheKey: `${stat.mtimeMs}-${stat.size}`,
			render: async () => fs.readFile(absolutePath),
		};
	}
}

export async function fromMarkdownPathOrUrl(pathOrUrl: string): Promise<DocumentResource> {
	const isRemote = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://");
	const fileName = isRemote ? getUrlFileName(pathOrUrl) : path.basename(pathOrUrl);
	const title = fileName.replace(/\.[^/.]+$/, "") || fileName;

	let readText: () => Promise<string>;
	let cacheKey: string;

	if (isRemote) {
		cacheKey = pathOrUrl;
		readText = async () => {
			const res = await fetch(pathOrUrl);
			return await res.text();
		};
	} else {
		const absolutePath = path.resolve(process.cwd(), pathOrUrl);
		const stat = await fs.stat(absolutePath);
		cacheKey = `${stat.mtimeMs}-${stat.size}`;
		readText = async () => fs.readFile(absolutePath, "utf-8");
	}

	return {
		title,
		cacheKey,
		render: async () => {
			const markdownContent = await readText();

			const htmlBody = marked.parse(markdownContent);
			const fullHtml = `
        <div style="display:flex; flex-direction:column; width:100%; height:100%; padding:80px; font-family:CustomFont; background:#ffffff; color:#333333;">
          <h1 style="font-size:56px; font-weight:bold; margin-bottom:40px; border-bottom:3px solid #f0f0f0; padding-bottom:20px; color:#111111;">${title}</h1>
          <div style="font-size:28px; line-height:1.8; letter-spacing:1px;">
            ${htmlBody}
          </div>
        </div>
      `;
			console.log(fullHtml);
			const markup = html(fullHtml);

			return renderSatoriToSvg(markup);
		},
	};
}

export async function fromTextPathOrUrl(
	pathOrUrl: string,
	targetFormat: "svg" | "pdf" = "pdf",
): Promise<DocumentResource> {
	const isRemote = pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://");
	const fileName = isRemote ? getUrlFileName(pathOrUrl) : path.basename(pathOrUrl);
	const title = fileName.replace(/\.[^/.]+$/, "") || fileName;

	let readText: () => Promise<string>;
	let cacheKey: string;

	if (isRemote) {
		cacheKey = pathOrUrl;
		readText = async () => {
			const res = await fetch(pathOrUrl);
			if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
			return await res.text();
		};
	} else {
		const absolutePath = path.resolve(process.cwd(), pathOrUrl);
		const stat = await fs.stat(absolutePath);
		cacheKey = `${stat.mtimeMs}-${stat.size}`;
		readText = async () => fs.readFile(absolutePath, "utf-8");
	}

	const PAGE_WIDTH = 1200;
	const PAGE_HEIGHT = 1600;

	return {
		title,
		cacheKey,
		render: async () => {
			const textContent = await readText();

			// 1. 构建带有内联 CSS 的 HTML 字符串 (支持 whiteSpace: pre-wrap 保留换行)
			const htmlString = `
        <div style="display:flex; flex-direction:column; width:100%; height:100%; padding:80px; font-family:'CustomFont'; background:#ffffff; color:#333333;">
          <h1 style="font-size:56px; font-weight:bold; margin-bottom:40px; border-bottom:3px solid #f0f0f0; padding-bottom:20px; color:#111111;">${title}</h1>
          <div style="font-size:28px; line-height:1.8; letter-spacing:1px; white-space:pre-wrap;">${textContent}</div>
        </div>
      `;

			// 2. 使用 Satori 生成 SVG Buffer
			const svgBuffer = await renderHtmlToSvg(htmlString, PAGE_WIDTH, PAGE_HEIGHT);

			// 3. 根据目标格式决定最终输出
			if (targetFormat === "pdf") {
				// ⚠️ 转换为真正的 PDF (包含图片嵌入)
				return await convertSvgToPdf(svgBuffer, PAGE_WIDTH, PAGE_HEIGHT);
			}

			// 默认返回 SVG Buffer (推荐，体积更小，网页渲染更清晰)
			return svgBuffer;
		},
	};
}

export interface DocumentResource {
	title: string;
	cacheKey: string;
	render: () => Promise<Buffer>;
}

export async function getDocumentViewer(resource: DocumentResource, format: Format): Promise<Page> {
	try {
		return await emitPdfAsset({
			title: resource.title,
			source: resource.cacheKey,
			render: resource.render,
		});
	} catch (err) {
		console.error("[setCache] Error:", err);
		return { src: "" };
	}
}

export interface DocumentViewer {
	source: string;
	alt: string;
	sourceName?: string;
	assetTitle: string;
	meta: Metadata;
}

export interface DocumentViewerProps
	extends DocumentViewerImageProps, Pick<DocumentViewerOptions, "format" | "crop"> {
	content?: DocumentViewer;
	url?: string;
}

interface DocumentViewerImageProps {
	pageLimit?: number;
	class?: string;
	style?: string;
	alt?: string;
}

interface DocumentViewerOptions {
	/**
	 * Output format for `DocumentViewer`.
	 * @default the `defaults.format` configured on the integration ("svg" unless overridden)
	 */
	format?: Format;

	/**
	 * Crop `DocumentViewer` to a single tightly-fit image instead of full pages.
	 * @default false
	 */
	crop?: boolean;

	/**
	 * Render a downloadable PDF of the same DocumentViewer, returned as `pdf`.
	 * @default false
	 */
	pdf?: boolean;
}
