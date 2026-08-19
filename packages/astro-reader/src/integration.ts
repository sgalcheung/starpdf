import type { AstroConfig, AstroIntegration } from 'astro';
import emitAssetIntegration from 'astro-emit-asset';
import type { DocumentViewer } from './server/DocumentViewer.ts';
import { EXTENSIONS } from './types.ts';
import { altTextFor } from './utils/altTextFor.ts';
import { toMetadata } from './utils/metadata.ts';
import { parseLyHeaderFields } from './utils/parseLyHeader.ts';
import { sourceNameFor } from './utils/sourceNameFor.ts';
import { titleFor } from './utils/titleFor.ts';
import { typeDeclarationsFor } from './utils/typeDeclarationsFor.ts';
import { setState } from './state.ts';

export function astroReader(): AstroIntegration {
  return {
    name: 'astro-reader',
    hooks: {
      'astro:config:setup': async ({
        config,
        command,
        updateConfig,
        logger,
      }) => {
        const isDev = command === 'dev';
        setState({
          binaryPath: '', // binaryPath,
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

        const existingProcessor = config.markdown?.processor;

        if (existingProcessor?.name === 'satteri') {
          // TODO
          // injectMarkdownPlugin(
          //   existingProcessor,
          //   'mdastPlugins',
          //   satteriPlugin(options),
          // );
          updateConfig({ markdown: { processor: existingProcessor } });
          logger?.info('Registered Sätteri mdast plugin');
          return;
        }

        // if (existingProcessor?.name === 'unified') {
        //   injectMarkdownPlugin(existingProcessor, 'remarkPlugins', [
        //     // remarkPlugin, //TODO
        //     options,
        //   ]);
        //   updateConfig({ markdown: { processor: existingProcessor } });
        //   logger?.info('Registered unified remark plugin');
        //   return;
        // }

        throw new Error(
          'astro-lilypond requires a processor-based Astro markdown config. ' +
            'Set `markdown.processor` to `satteri(…)` (Astro 7 default) or ' +
            '`unified(…)` from `@astrojs/markdown-remark`, then add this integration. ' +
            `Detected processor: ${existingProcessor?.name ?? 'none'}.`,
        );
      },

      'astro:config:done': ({ injectTypes }) => {
        injectTypes({
          filename: 'astro-emit-types.d.ts',
          content: typeDeclarationsFor(EXTENSIONS),
        });
      },
    },
  };
}

type VitePlugin = NonNullable<AstroConfig['vite']['plugins']>[number];

function vitePluginImportContent() {
  return {
    name: 'astro-reader',
    enforce: 'pre',
    async transform(source: string, id: string) {
      if (!EXTENSIONS.some((ext) => id.endsWith(ext))) return;

      const sourceName = sourceNameFor(id) ?? '';
      const assetTitle = titleFor(sourceName);
      const meta = toMetadata(parseLyHeaderFields(source));
      const alt = altTextFor(meta);
      const dv: DocumentViewer = {
        source,
        alt,
        sourceName,
        assetTitle,
        meta,
      };
      return {
        code: `export default ${JSON.stringify(dv)}`,
      };
    },
  } satisfies VitePlugin;
}
