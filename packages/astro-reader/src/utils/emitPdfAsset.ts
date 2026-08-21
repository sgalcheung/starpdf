import { emitAsset } from "astro-emit-asset/emit";

export interface EmitPdfAssetOptions {
	title: string;
	source: string;
	render: () => Promise<Buffer>;
}

export async function emitPdfAsset(options: EmitPdfAssetOptions): Promise<PdfResult> {
	const { title, source, render } = options;

	const asset = await emitAsset(`${title}.[hash].pdf`, [source, "pdf"], async () => {
		const data = await render();
		return { data };
	});

	return { src: asset.src };
}

export interface PdfResult {
	src: string;
}
