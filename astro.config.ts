import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import compress from 'astro-compress';
import type { AstroIntegration } from 'astro';

import astrowind from './vendor/integration';
import { fetchAssets } from './src/utils/assets';
import { fetchSharedUi } from './src/utils/fetch-shared-ui';

import { readingTimeRemarkPlugin, responsiveTablesRehypePlugin, lazyImagesRehypePlugin } from './src/utils/frontmatter';

// Fetch JellyRock branding assets + shared-ui from GitHub at build time
const jellyrockAssets: () => AstroIntegration = () => ({
  name: 'jellyrock-assets',
  hooks: {
    'astro:config:setup': async () => {
      await fetchAssets();
      await fetchSharedUi();
    },
  },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'static',

  integrations: [
    jellyrockAssets(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
    mdx(),
    icon({
      include: {
        tabler: ['*'],
      },
    }),

    compress({
      CSS: true,
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),

    astrowind({
      config: './src/config.yaml',
    }),
  ],

  image: {
    domains: ['cdn.pixabay.com'],
  },

  markdown: {
    remarkPlugins: [readingTimeRemarkPlugin],
    rehypePlugins: [responsiveTablesRehypePlugin, lazyImagesRehypePlugin],
  },

  vite: {
    build: {
      // Never inline bundled scripts: Astro inlines any under 4 kB by default, and the
      // site's CSP (`script-src 'self'`, ADR-0006) blocks inline scripts in production.
      // Returning undefined keeps the default for every other asset type.
      assetsInlineLimit: (filePath: string) => (filePath.endsWith('.js') ? false : undefined),
    },
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },
});
