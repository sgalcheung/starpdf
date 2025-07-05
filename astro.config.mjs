// @ts-check
import { defineConfig } from "astro/config";

import starlight from "@astrojs/starlight";

import netlify from "@astrojs/netlify";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Starlight PDF Viewer",
      routeMiddleware: "./src/routeMiddleware.ts",
    }),
    react(),
  ],

  adapter: netlify()
});
