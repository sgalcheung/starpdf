import {
  type AstroComponentFactory,
  createComponent,
  renderComponent,
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
import { hashBuffer } from '../utils/bufferHelper.ts';
import { emitMyAsset } from '../utils/emitPdfAsset.ts';
import { generateTextPdfAsset } from '../utils/generatePdf.ts';
import { resolveDefaults } from '../utils/index.ts';
import type { Metadata } from '../utils/metadata.ts';
import { renderedErrorHtml } from '../utils/renderedErrorHtml.ts';
import { renderedHtml } from '../utils/renderedHtml.ts';

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

export async function getDocumentViewer(
  content?: DocumentViewer,
  url?: string,
  format:Format='svg'
): Promise<Page> {
  

  try {
    let source: string;
    let resource: UrlResource | undefined;
    let buffer: Buffer | undefined;

    if (content) {
      source = content.source;
    } else if (url) {
      resource = await resourceFromUrl(url);
      buffer = resource.buffer;
      source = hashBuffer(buffer);
    } else {
      throw new Error('Either content or url is required.');
    }

    return await emitMyAsset({
      title: content?.assetTitle ?? resource?.name ?? 'untitled',
      format,
      source,
      // resolution,
      // crop,
      // sizeScale: crop ? cropScale : 1,
      render: async () => {
        if (content) {
          return markdownToImage(content.source);
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
    return{
      src:''
    }
  }
}

function createErrorScoreComponent(
  error: unknown,
  title: string,
): AstroComponentFactory {
  return createComponent(() => {
    return renderTemplate`${unescapeHTML(renderedErrorHtml(error, title))}`;
  });
}

export interface DocumentViewer {
  source: string;
  alt: string;
  sourceName?: string;
  assetTitle: string;
  meta: Metadata;
}

interface DocumentViewerProps
  extends
    DocumentViewerImageProps,
    Pick<DocumentViewerOptions, 'format' | 'crop'> {
  content: DocumentViewer;
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
   * Output format for `Score`.
   * @default the `defaults.format` configured on the integration ("svg" unless overridden)
   */
  format?: 'svg' | 'png' | 'pdf';

  /**
   * Crop `Score` to a single tightly-fit image instead of full pages.
   * @default false
   */
  crop?: boolean;

  /**
   * Render a downloadable PDF of the same score, returned as `pdf`.
   * @default false
   */
  pdf?: boolean;
}

export interface GetDocumentViewerResult {
  DocumentViewer: AstroComponentFactory;
  page: Page;
  pdf?: PdfResult;
}

export interface PdfResult {
  src: string;
}
