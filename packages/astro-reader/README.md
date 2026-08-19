# `astro-reader`

This is an [Astro integration](https://docs.astro.build/en/guides/integrations-guide/) that a lightweight PDF reader built with Astro and Starlight.

## Usage

### Prerequisites

- Node.js 22.12.0 or later
- npm, pnpm, or yarn
- Basic knowledge of Astro and Starlight

### Installation

Install the integration **automatically** using the Astro CLI:

```bash
pnpm astro add astro-reader
```

```bash
npx astro add astro-reader
```

```bash
yarn astro add astro-reader
```

Or install it **manually**:

1. Install the required dependencies

```bash
pnpm add astro-reader
```

```bash
npm install astro-reader
```

```bash
yarn add astro-reader
```

2. Add the integration to your astro config

```diff
+import integration from "astro-reader";

export default defineConfig({
  integrations: [
+    integration(),
  ],
});
```

### Configuration

TODO:configuration

## Contributing

This package is structured as a monorepo:

- `playground` contains code for testing the package
- `package` contains the actual package

Install dependencies using pnpm:

```bash
pnpm i --frozen-lockfile
```

Start the playground and package watcher:

```bash
pnpm dev
```

You can now edit files in `package`. Please note that making changes to those files may require restarting the playground dev server.

## Licensing

[MIT Licensed](https://github.com/sgalcheung/astro-reader/blob/main/LICENSE). Made with ❤️ by [Sgal Cheung](https://github.com/sgalcheung).

## Acknowledgements

- Created using [astro-integration-template](https://github.com/florian-lefebvre/astro-integration-template).
