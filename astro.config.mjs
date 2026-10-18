import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'url';
import { remarkWikiLinks } from './src/lib/remark-wiki-links.js';
import { remarkMermaid } from './src/lib/remark-mermaid.js';
import { paperChunkIntegration } from './src/lib/paper-chunk-integration.mjs';
// @ts-check

import tailwindcss from '@tailwindcss/vite';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const siteBase = '/';
const siteUrl = process.env.SITE_URL ?? 'https://bakkac-blog.pages.dev';

export default defineConfig({
  site: siteUrl,
  base: siteBase,
  trailingSlash: 'never',
  output: 'static',
  // Astro 7 defaults to JSX whitespace rules, which strips the space between
  // adjacent inline elements and changes rendered prose. Keep the v6
  // HTML-aware behaviour instead.
  compressHTML: true,
  integrations: [
    mdx(),
    react(),
    paperChunkIntegration(),
    sitemap({
      filter: (page) =>
        !page.endsWith('/rss.xml') && !page.endsWith('/robots.txt'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': srcDir,
        '@components': `${srcDir}/components`,
        '@lib': `${srcDir}/lib`,
        '@styles': `${srcDir}/styles`,
      },
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [
        [remarkWikiLinks, { base: siteBase }],
        remarkMermaid,
      ],
    }),
  },
});
