import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Resolves a placeholder in the built HTML into the real, content-hashed URL of
 * the paper-texture chunk.
 *
 * Home and the collection pages both import `PaperTexture`, so Vite emits it as
 * one shared chunk, and preloading it from the layout warms it for every page.
 * The filename is content-hashed, so the layout emits a placeholder and this
 * integration fills it in on `astro:build:done`, once both the JS bundle and the
 * page HTML have been written.
 */

const PLACEHOLDER = '/__PAPER_TEXTURE_CHUNK__';

function findHtmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findHtmlFiles(full));
    } else if (entry.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

export function paperChunkIntegration() {
  return {
    name: 'paper-chunk-integration',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const astroDir = join(dir.pathname, '_astro');

        let chunkName;
        try {
          chunkName = readdirSync(astroDir).find(
            (name) => /paper-texture[.-]/.test(name) && name.endsWith('.js'),
          );
        } catch {
          return;
        }
        if (!chunkName) return;

        const url = `/_astro/${chunkName}`;

        for (const file of findHtmlFiles(dir.pathname)) {
          const source = readFileSync(file, 'utf8');
          if (!source.includes(PLACEHOLDER)) continue;
          writeFileSync(file, source.split(PLACEHOLDER).join(url));
        }
      },
    },
  };
}
