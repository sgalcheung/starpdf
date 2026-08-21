import fs from "node:fs/promises";
import path from "node:path";

import type { AstroConfig, AstroIntegration } from "astro";
import emitAssetIntegration from "astro-emit-asset";

import type { DocumentViewer } from "./server/DocumentViewer.ts";
import { setState } from "./state.ts";
import { EXTENSIONS } from "./types.ts";
import { altTextFor } from "./utils/altTextFor.ts";
import { hashBuffer } from "./utils/bufferHelper.ts";
import { toMetadata } from "./utils/metadata.ts";
import { sourceNameFor } from "./utils/sourceNameFor.ts";
import { titleFor } from "./utils/titleFor.ts";
import { typeDeclarationsFor } from "./utils/typeDeclarationsFor.ts";

export function astroReader(): AstroIntegration {
	return {
		name: "astro-reader",
		hooks: {
			"astro:config:setup": async ({ config, command, updateConfig, logger }) => {
				const isDev = command === "dev";
				setState({
					binaryPath: "", // binaryPath,
					defaults: undefined, // options.defaults,
					timeout: undefined,
					isDev,
					logger,
				});

				updateConfig({
					integrations: [emitAssetIntegration()],
					vite: {
						plugins: [vitePluginImportContent()],
					},
				});

				// const existingProcessor = config.markdown?.processor;

				// if (existingProcessor?.name === "satteri") {
				// TODO
				// injectMarkdownPlugin(
				//   existingProcessor,
				//   'mdastPlugins',
				//   satteriPlugin(options),
				// );
				// 	updateConfig({ markdown: { processor: existingProcessor } });
				// 	logger?.info("Registered Sätteri mdast plugin");
				// 	return;
				// }

				// if (existingProcessor?.name === 'unified') {
				//   injectMarkdownPlugin(existingProcessor, 'remarkPlugins', [
				//     // remarkPlugin, //TODO
				//     options,
				//   ]);
				//   updateConfig({ markdown: { processor: existingProcessor } });
				//   logger?.info('Registered unified remark plugin');
				//   return;
				// }

				// throw new Error(
				// 	"astro-lilypond requires a processor-based Astro markdown config. " +
				// 		"Set `markdown.processor` to `satteri(…)` (Astro 7 default) or " +
				// 		"`unified(…)` from `@astrojs/markdown-remark`, then add this integration. " +
				// 		`Detected processor: ${existingProcessor?.name ?? "none"}.`,
				// );
			},

			"astro:config:done": ({ injectTypes }) => {
				injectTypes({
					filename: "astro-reader-types.d.ts",
					content: typeDeclarationsFor(EXTENSIONS),
				});
			},
		},
	};
}

type VitePlugin = NonNullable<AstroConfig["vite"]["plugins"]>[number];

function vitePluginImportContent() {
	return {
		name: "vite-plugin-astro-reader-content-loader",
		enforce: "pre",
		async load(id: string) {
			if (!id.endsWith(".pdf") || id.includes("?")) {
				return null;
			}

			const stat = await fs.stat(id);
			const mtimeMs = stat.mtimeMs;
			const size = stat.size;

			const sourceKey = `${mtimeMs}-${size}`;

			const assetTitle = titleFor(id);

			return `
        export default {
          isLocalPdf: true,
          filePath: ${JSON.stringify(id)},
          sourceHash: ${JSON.stringify(sourceKey)},
          assetTitle: ${JSON.stringify(assetTitle)}
        };
      `;
		},
	} satisfies VitePlugin;
}
