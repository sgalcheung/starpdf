// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import cloudflare from '@astrojs/cloudflare';

import type { AstroIntegration, AstroIntegrationLogger } from 'astro';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setState } from './src/state';
import emitAssetIntegration from 'astro-emit-asset';
import { typeDeclarationsFor } from './src/utils/typeDeclarationsFor';
import { resolveDefaults } from './src/utils';
import { includePathsFor } from './src/utils/includePathsFor';
import { sourceNameFor } from './src/utils/sourceNameFor';
import { titleFor } from './src/utils/titleFor';
import { parseLyHeaderFields } from './src/utils/parseLyHeader';
import { toMetadata } from './src/utils/metadata';
import { altTextFor } from './src/utils/altTextFor';
import type { Score } from './src/types';
import { readRawContent } from './src/utils/readRawContent';

interface PluginOptions {
  // defaults?: LilypondDefaults;
  timeout?: number;
  binaryPath?: string;
  isDev?: boolean;
  logger?: Pick<AstroIntegrationLogger, 'warn' | 'error'>;
  includePaths?: string[];
}

function injectMarkdownPlugin(
  processor: { options: object },
  key: string,
  plugin: unknown,
): void {
  if (!processor.options) {
    processor.options = {};
  }
  const options = processor.options as Record<string, unknown[]>;
  options[key] = [...(options[key] ?? []), plugin];
}

function myIntegration(options: PluginOptions): AstroIntegration {
  return {
    name: 'my-astro-integration',
    hooks: {
      'astro:config:setup': async ({
        config,
        command,
        updateConfig,
        logger,
      }) => {
        const isDev = command === 'dev';
        options.isDev = isDev;
        options.logger = logger;

        const includePaths = (options.includePaths ?? []).map((path) =>
          fileURLToPath(new URL(path, config.root)),
        );
        options.includePaths = includePaths;
        setState({
          binaryPath: '', // binaryPath,
          defaults: undefined, // options.defaults,
          timeout: options.timeout,
          isDev,
          logger,
          includePaths,
        });

        updateConfig({
          integrations: [emitAssetIntegration()],
          vite: {
            plugins: [
              {
                name: 'vite-plugin-astro-pdf',
                enforce: 'pre',
                async transform(source, id) {
                  if (!EXTENSIONS.some((ext) => id.endsWith(ext))) return;
                  // const { version } = resolveDefaults(options.defaults);
                  const filePath = id.split('?', 1)[0];
                  const content = await readRawContent(pathToFileURL(filePath));
                  const includePaths = includePathsFor(
                    id,
                    options.includePaths,
                  );
                  const sourceName = sourceNameFor(id);
                  const assetTitle = titleFor(sourceName);
                  const meta = toMetadata(parseLyHeaderFields(source));
                  const alt = altTextFor(meta);
                  const score: Score = {
                    source: content,
                    alt,
                    sourceName,
                    includePaths,
                    assetTitle,
                    meta,
                  };
                  return {
                    code: `export default ${JSON.stringify(score)}`,
                  };
                },
              },
            ],
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

        if (existingProcessor?.name === 'unified') {
          injectMarkdownPlugin(existingProcessor, 'remarkPlugins', [
            // remarkPlugin, //TODO
            options,
          ]);
          updateConfig({ markdown: { processor: existingProcessor } });
          logger?.info('Registered unified remark plugin');
          return;
        }

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

// https://astro.build/config
export default defineConfig({
  site: 'https://sgalcheung.github.io',
  base: '/starlight-reader',
  integrations: [
    myIntegration({}),
    starlight({
      title: 'Starlight PDF Viewer',
      routeMiddleware: './src/routeMiddleware.ts',
      pagefind: false,
      social: [
        {
          icon: 'github',
          label: 'GitLab',
          href: 'https://github.com/sgalcheung/starlight-reader',
        },
      ],
    }),
    react(),
  ],

  // adapter: cloudflare(),
  vite: {
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/pdfjs-dist/cmaps/**/*',
            dest: 'cmaps',
            rename: { stripBase: 3 },
          },
        ],
      }),
    ],
  },
});
export const EXTENSIONS = ['.md'] as const;
