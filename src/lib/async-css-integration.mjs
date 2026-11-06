import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Rewrites render-blocking stylesheet links into a non-blocking form.
 *
 * First paint is covered by the tiny inline boot-veil CSS in Layout.astro. The
 * ~90KB Tailwind bundle must not hold that paint hostage on a blank (white)
 * viewport. `media="print"` keeps the link a real stylesheet (so `window.load`
 * still waits) without matching the screen, then `onload` promotes it to `all`
 * under the veil.
 */

const STYLESHEET_LINK =
  /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g;

function rewriteStylesheets(html) {
  return html.replace(STYLESHEET_LINK, (_match, href) => {
    return (
      `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'">` +
      `<noscript><link rel="stylesheet" href="${href}"></noscript>`
    );
  });
}

function collectHtmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectHtmlFiles(full));
    } else if (entry.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

export function asyncCssIntegration() {
  return {
    name: 'async-css-integration',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'async-css-html',
                transformIndexHtml: {
                  order: 'post',
                  handler(html) {
                    return rewriteStylesheets(html);
                  },
                },
              },
            ],
          },
        });
      },
      'astro:build:done': ({ dir }) => {
        for (const file of collectHtmlFiles(dir.pathname)) {
          const source = readFileSync(file, 'utf8');
          const next = rewriteStylesheets(source);
          if (next !== source) writeFileSync(file, next);
        }
      },
    },
  };
}
