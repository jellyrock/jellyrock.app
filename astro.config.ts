import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';
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
  // Astro 7 defaults to 'jsx', which drops the whitespace between elements on separate lines
  // ("Maintainer ·@cewert", "Error404"). true is the lossless compression Astro 5 used.
  compressHTML: true,

  integrations: [
    jellyrockAssets(),
    sitemap(),
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
    // Our remark/rehype plugins need the unified processor; Astro 7 defaults to Sätteri.
    processor: unified({
      remarkPlugins: [readingTimeRemarkPlugin],
      rehypePlugins: [responsiveTablesRehypePlugin, lazyImagesRehypePlugin],
    }),
  },

  vite: {
    plugins: [tailwindcss()],
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
