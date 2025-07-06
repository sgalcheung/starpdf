// @ts-check
import { defineConfig } from "astro/config";

import starlight from "@astrojs/starlight";

import netlify from "@astrojs/netlify";

import react from "@astrojs/react";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Starlight PDF Viewer",
      routeMiddleware: "./src/routeMiddleware.ts",
      social: [
        {
          icon: "github",
          label: "GitLab",
          href: "https://github.com/sgalcheung/starpdf",
        },
      ],
    }),
    react(),
  ],

  adapter: netlify(),
  vite: {
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/pdfjs-dist/cmaps/**/*",
            dest: "cmaps",
          },
        ],
      }),
    ],
  },
});
