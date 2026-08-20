import fs from 'node:fs/promises';
import path from 'node:path';
import {
	type AstroComponentFactory,
	createComponent,
	renderTemplate,
	unescapeHTML,
} from 'astro/runtime/server/index.js';
import {
	markdownToImage,
	resourceFromUrl,
	type UrlResource,
} from '../markdown-image.ts';
import { getState } from '../state.ts';
import type { Format, ImageResult, Page } from '../types.js';
import { hashBuffer, hashString } from '../utils/bufferHelper.ts';
import { emitMyAsset, emitPdfAsset } from '../utils/emitPdfAsset.ts';
import { generateTextPdfAsset } from '../utils/generatePdf.ts';
import { resolveDefaults } from '../utils/index.ts';
import type { Metadata } from '../utils/metadata.ts';
import { renderedErrorHtml } from '../utils/renderedErrorHtml.ts';
import { renderedHtml } from '../utils/renderedHtml.ts';
import { getUrlFileName } from '../utils/urlHelper.ts';

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

function createDocumentViewerComponent(
	content: ImageResult,
): AstroComponentFactory {
	return createComponent((_result, props: DocumentViewerImageProps) => {
		const format = content.format;
		const alt = props.alt ?? content.alt ?? '';
		const html = renderedHtml(content.page, format, alt, {
			class: props.class ?? '',
			style: props.style ?? '',
			pageLimit: props.pageLimit ?? 10,
		});
		return renderTemplate`${unescapeHTML(html)}`;
	});
}

interface LocalPdfContent {
	isLocalPdf: true;
	filePath: string;
	sourceHash: string;
	assetTitle: string;
}

export function fromLocalPdf(pdf: LocalPdfContent): DocumentResource {
	return {
		title: pdf.assetTitle,
		cacheKey: pdf.sourceHash,
		render: () => fs.readFile(pdf.filePath),
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
export async function fromPathOrUrl(
	pathOrUrl: string,
): Promise<DocumentResource> {
	const isRemote =
		pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://');

	if (isRemote) {
		return {
			title: getUrlFileName(pathOrUrl),
			cacheKey: pathOrUrl,
			render: async () => {
				const res = await fetch(pathOrUrl);
				if (!res.ok) {
					throw new Error(
						`Failed to fetch remote document: ${res.status} ${res.statusText}`,
					);
				}
				return Buffer.from(await res.arrayBuffer());
			},
		};
	}

	const absolutePath = path.resolve(process.cwd(), pathOrUrl);
	const fileName = path.basename(absolutePath);

	const stat = await fs.stat(absolutePath);
	const cacheKey = `${stat.mtimeMs}-${stat.size}`;

	return {
		title: fileName.replace(/\.[^/.]+$/, '') || fileName,
		cacheKey: cacheKey,
		render: async () => {
			return await fs.readFile(absolutePath);
		},
	};
}

/**
export async function getDocumentViewer(props: DocumentViewerProps): Promise<Page> {
  try {
    // let source: string;
    // let resource: UrlResource | undefined;
    // let buffer: Buffer | undefined;

    // if (props.content) {
    //   source = props.content.source;
    // } else if (props.url) {
    //   resource = await resourceFromUrl(props.url);
    //   buffer = resource.buffer;
    //   source = hashBuffer(buffer);
    // } else {
    //   throw new Error('Either content or url is required.');
    // }

    return await emitPdfAsset({
      title: props.content?.assetTitle ?? resource?.name ?? 'untitled',
      source:
      render: async () => {
        if (props.content) {
          return markdownToImage(props.content.source);
        }

        if (resource) {
          if (resource.extension === '.txt') {
            return generateTextPdfAsset(
              resource.name,
              resource.buffer.toString('utf8'),
            );
          }
          return resource.buffer;
        }

        throw new Error('Either score or url is required.');
      },
    });
    // page;
  } catch (err) {
    // if (!state.isDev) throw err;
    // return {
    //   DocumentViewer: createErrorScoreComponent(err, 'score.assetTitle'),
    //   page: {
    //     src: '',
    //   },
    // pdf: undefined,
    // meta: score.meta,
    // raw: score.source,
    // };
    return {
      src: '',
    };
  }
}
   */

export interface DocumentResource {
	title: string;
	cacheKey: string;
	render: () => Promise<Buffer>;
}

export async function getDocumentViewer(
	resource: DocumentResource,
	format: Format,
): Promise<Page> {
	try {
		return await emitPdfAsset({
			title: resource.title,
			source: resource.cacheKey,
			render: resource.render,
		});
	} catch (err) {
		console.error('[setCache] Error:', err);
		return { src: '' };
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
	extends DocumentViewerImageProps,
		Pick<DocumentViewerOptions, 'format' | 'crop'> {
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
