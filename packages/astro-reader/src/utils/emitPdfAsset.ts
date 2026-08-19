import { emitAsset } from "astro-emit-asset/emit";
import type { Format, Page } from "../types.ts";
import { imageDimensionsFor } from "./imageDimensions.ts";

type PageMeta = {
	width: number | undefined;
	height: number | undefined;
};

export interface EmitAssetOptions {
	title: string;
	format: Format;
	source: string;
	// resolution: number;
	// crop: boolean;
	// sizeScale: number;
	render: () => Promise<Buffer>;
}

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
