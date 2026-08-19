import {
	type AstroComponentFactory,
	createComponent,
	renderComponent,
	renderTemplate,
	unescapeHTML,
} from "astro/runtime/server/index.js";
import { emitAsset } from "astro-emit-asset/emit";
import { resolveDefaults } from "../../../packages/astro-reader/src/utils";
import { hashBuffer } from "../../../packages/astro-reader/src/utils/bufferHelper";
import { imageDimensionsFor } from "../../../packages/astro-reader/src/utils/imageDimensions";
import { renderedErrorHtml } from "../../../packages/astro-reader/src/utils/renderedErrorHtml";
import { renderedHtml } from "../../../packages/astro-reader/src/utils/renderedHtml";
import { getState } from "../state";
import type { Format, ImageResult, Page, Score } from "../types";
import {
	markdownToImage,
	resourceFromUrl,
	type UrlResource,
} from "./markdown-image";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_X = 54;
const PAGE_MARGIN_Y = 64;
const TITLE_FONT_SIZE = 18;
const BODY_FONT_SIZE = 12;
const BODY_LINE_HEIGHT = 18;

export interface GetScoreOptions {
	/**
	 * Output format for `Score`.
	 * @default the `defaults.format` configured on the integration ("svg" unless overridden)
	 */
	format?: Format;

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

export interface GetScoreResult {
	Score: AstroComponentFactory;
	page: Page;
	pdf?: PdfResult;
	// meta: LilypondMetadata;
	// raw: string;
}

export interface ScoreProps
	extends Omit<ScoreImageProps, "format">,
		Pick<GetScoreOptions, "format" | "crop"> {
	/**
	 * A `LilypondScore` from a `.ly`/`.ily`/`.lilypond` import
	 * or a `lilypondLoader()` entry.
	 */
	content?: Score;
	url?: string;
}

export async function getScore(
	score?: Score,
	url?: string,
	options: GetScoreOptions = {},
): Promise<GetScoreResult> {
	const state = getState();
	const {
		resolution,
		cropScale,
		format: defaultFormat,
	} = resolveDefaults(state.defaults);
	const format = options.format ?? defaultFormat;
	const crop = options.crop ?? false;

	try {
		let source: string;
		let resource: UrlResource | undefined;
		let buffer: Buffer | undefined;

		if (score) {
			source = score.source;
		} else if (url) {
			resource = await resourceFromUrl(url);
			buffer = resource.buffer;
			source = hashBuffer(buffer);
		} else {
			throw new Error("Either score or url is required.");
		}

		const page = await emitMyAsset({
			title: score?.assetTitle ?? resource?.name ?? "untitled",
			format,
			source,
			resolution,
			crop,
			sizeScale: crop ? cropScale : 1,
			render: async () => {
				if (score) {
					return markdownToImage(score.source);
				}

				if (resource) {
					if (resource.extension == ".txt") {
						return generateTextPdfAsset(
							resource.name,
							resource.name,
							resource.buffer.toString(),
						);
					}
					return resource.buffer;
				}

				throw new Error("Either score or url is required.");
			},
		});
		return {
			Score: createScoreComponent({ page, alt: "score.alt", format }),
			page,
		};
	} catch (err) {
		if (!state.isDev) throw err;
		return {
			Score: createErrorScoreComponent(err, "score.assetTitle"),
			page: {
				src: "",
			},
			pdf: undefined,
			// meta: score.meta,
			// raw: score.source,
		};
	}
}

export const ScoreTag: AstroComponentFactory = createComponent(
	async (result, props: ScoreProps) => {
		const { content, url, format, crop, ...imageProps } = props;
		const { Score: ContentScore } = await getScore(content, url, {
			format,
			crop,
		});
		return renderTemplate`${renderComponent(result, "Score", ContentScore, imageProps)}`;
	},
);

interface ScoreImageProps {
	format: Format;
	pageLimit?: number;
	class?: string;
	style?: string;
	alt?: string;
}

function createScoreComponent(content: ImageResult): AstroComponentFactory {
	return createComponent((_result, props: ScoreImageProps) => {
		const format = content.format;
		const alt = props.alt ?? content.alt ?? "";
		const html = renderedHtml(content.page, format, alt, {
			class: props.class,
			style: props.style,
			pageLimit: props.pageLimit,
		});
		return renderTemplate`${unescapeHTML(html)}`;
	});
}

/**
 * Dev-only fallback for `getScore()`: renders an inline error block
 * instead of the score.
 */
function createErrorScoreComponent(
	error: unknown,
	title: string,
): AstroComponentFactory {
	return createComponent(() => {
		return renderTemplate`${unescapeHTML(renderedErrorHtml(error, title))}`;
	});
}

const toSafeSegment = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "") || "document";

const escapePdfText = (value: string) =>
	value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const wrapText = (value: string, maxCharsPerLine: number) => {
	const normalized = value.replace(/\r\n/g, "\n").trim() || " ";
	const paragraphs = normalized.split(/\n+/);
	const lines: string[] = [];

	for (const paragraph of paragraphs) {
		const words = paragraph.split(/\s+/);
		let current = "";

		for (const word of words) {
			const candidate = current ? `${current} ${word}` : word;
			if (candidate.length <= maxCharsPerLine) {
				current = candidate;
				continue;
			}

			if (current) {
				lines.push(current);
			}

			if (word.length > maxCharsPerLine) {
				for (let i = 0; i < word.length; i += maxCharsPerLine) {
					lines.push(word.slice(i, i + maxCharsPerLine));
				}
				current = "";
			} else {
				current = word;
			}
		}

		if (current) {
			lines.push(current);
		}
	}

	return lines.length ? lines : [" "];
};

function buildMinimalPdf({
	title,
	content,
}: {
	title: string;
	content: string;
}) {
	const safeTitle = (title || "Document").trim() || "Document";
	const titleLines = wrapText(safeTitle, 38);
	const bodyLines = wrapText(content, 78);
	const allLines = [...titleLines, "", ...bodyLines];
	const maxBodyLines = Math.max(1, allLines.length);

	const streamLines: string[] = [];
	let currentY = PAGE_HEIGHT - PAGE_MARGIN_Y;

	const appendText = (fontSize: number, text: string, x: number, y: number) => {
		streamLines.push("BT");
		streamLines.push(
			`/${fontSize === TITLE_FONT_SIZE ? "F1" : "F1"} ${fontSize} Tf`,
		);
		streamLines.push(`${x} ${y} Td`);
		streamLines.push(`(${escapePdfText(text)}) Tj`);
		streamLines.push("ET");
	};

	appendText(
		TITLE_FONT_SIZE,
		titleLines[0] ?? safeTitle,
		PAGE_MARGIN_X,
		currentY,
	);
	currentY -= TITLE_FONT_SIZE + 10;

	for (const line of allLines.slice(1)) {
		if (currentY < PAGE_MARGIN_Y) {
			break;
		}

		appendText(BODY_FONT_SIZE, line, PAGE_MARGIN_X, currentY);
		currentY -= BODY_LINE_HEIGHT;
	}

	const stream = streamLines.join("\n");
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
		`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	];

	let pdf = "%PDF-1.4\n";
	const offsets: number[] = [0];

	for (let i = 0; i < objects.length; i += 1) {
		offsets.push(Buffer.byteLength(pdf, "latin1"));
		pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
	}

	const xrefOffset = Buffer.byteLength(pdf, "latin1");
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (let i = 0; i < objects.length; i += 1) {
		pdf += `${String(offsets[i + 1]).padStart(10, "0")} 00000 n \n`;
	}
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

	return Buffer.from(pdf, "latin1");
}

export function generateTextPdfAsset(
	assetKey: string,
	title: string,
	content: string,
) {
	// const safeKey = toSafeSegment(assetKey);

	// const { src } = await emitAsset(
	//   `${safeKey}.pdf`,
	//   [safeKey, title, content],
	//   () => ({
	//     data: buildMinimalPdf({ title, content }),
	//   }),
	// );
	// return src;
	return buildMinimalPdf({ title, content });
}

export interface EmitPdfAssetOptions {
	title: string;
	source: string;
	render: () => Promise<Buffer[]>;
}

export interface EmitAssetOptions {
	title: string;
	format: Format;
	source: string;
	resolution: number;
	crop: boolean;
	sizeScale: number;
	render: () => Promise<Buffer>;
}

export async function emitPdfAsset(
	options: EmitPdfAssetOptions,
): Promise<PdfResult> {
	// if (!options.binaryPath) {
	//   throw new Error(
	//     'astro-lilypond: please add the `lilypond()` integration to your Astro config.',
	//   );
	// }

	const { title, source, render } = options;

	const asset = await emitAsset(
		`${title}.[hash].pdf`,
		[source, "pdf"],
		async () => {
			const [data] = await render();
			return { data };
		},
	);

	return { src: asset.src };
}

export interface PdfResult {
	src: string;
}

type PageMeta = {
	width: number | undefined;
	height: number | undefined;
};

type GeneratedPage = { data: Buffer; meta: PageMeta };

export async function emitMyAsset(options: EmitAssetOptions): Promise<Page> {
	// if (!options.binaryPath) {
	// 	throw new Error(
	// 		"astro-lilypond: please add the `lilypond()` integration to your Astro config.",
	// 	);
	// }

	const { title, format, source, resolution, crop, sizeScale, render } =
		options;

	const asset = await emitAsset<PageMeta>(
		`${title}.[hash].${format}`,
		[source, format, resolution, crop, sizeScale],
		async (): Promise<GeneratedPage> => {
			const buffer = await render();
			const dimensions = imageDimensionsFor(format, buffer);
			return {
				data: buffer,
				meta: {
					width: dimensions ? dimensions.width * sizeScale : undefined,
					height: dimensions ? dimensions.height * sizeScale : undefined,
				},
			};
		},
	);

	return {
		src: asset.src,
		width: asset.meta.width,
		height: asset.meta.height,
	};
}
