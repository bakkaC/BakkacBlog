import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slug as githubSlug } from 'github-slugger';

const CONTENT_ROOT = fileURLToPath(new URL('../content', import.meta.url));

const PUBLISHED_COLLECTIONS = {
  notes: {
    dir: path.join(CONTENT_ROOT, 'notes'),
    routeBase: '/notes',
  },
  thoughts: {
    dir: path.join(CONTENT_ROOT, 'thoughts'),
    routeBase: '/thoughts',
  },
  posts: {
    dir: path.join(CONTENT_ROOT, 'posts'),
    routeBase: '/posts',
  },
};

const COLLECTION_ALIASES = new Map([
  ['note', 'notes'],
  ['notes', 'notes'],
  ['thought', 'thoughts'],
  ['thoughts', 'thoughts'],
  ['post', 'posts'],
  ['posts', 'posts'],
  // Keep legacy `blog:` / `blogs:` prefixes working for older content.
  ['blog', 'posts'],
  ['blogs', 'posts'],
]);

const SKIP_NODE_TYPES = new Set([
  'code',
  'definition',
  'html',
  'inlineCode',
  'link',
  'linkReference',
]);

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

const WIKI_LINK_PATTERN = /(!)?\[\[([^[\]\n]+?)\]\]/g;

export function remarkWikiLinks(options = {}) {
  const base = normalizeBase(options.base ?? '/');

  return (tree, file) => {
    const wikiIndex = buildWikiIndex(base);
    const currentCollection = detectCollectionName(file);

    walkNodes(tree, file, wikiIndex, currentCollection);
  };
}

function walkNodes(node, file, wikiIndex, currentCollection) {
  if (!node || SKIP_NODE_TYPES.has(node.type) || !Array.isArray(node.children)) {
    return;
  }

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];

    rewriteNodeAssetUrl(child, file);

    if (child?.type === 'text' && typeof child.value === 'string') {
      const replacementNodes = parseTextNode(child.value, file, wikiIndex, currentCollection, child);
      if (replacementNodes) {
        node.children.splice(index, 1, ...replacementNodes);
        index += replacementNodes.length - 1;
        continue;
      }
    }

    walkNodes(child, file, wikiIndex, currentCollection);
  }
}

function parseTextNode(value, file, wikiIndex, currentCollection, node) {
  WIKI_LINK_PATTERN.lastIndex = 0;

  if (!WIKI_LINK_PATTERN.test(value)) {
    return null;
  }

  WIKI_LINK_PATTERN.lastIndex = 0;

  const nextNodes = [];
  let lastIndex = 0;
  let match;

  while ((match = WIKI_LINK_PATTERN.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nextNodes.push(createTextNode(value.slice(lastIndex, match.index)));
    }

    const [, embedMarker, rawTarget] = match;
    const embed = Boolean(embedMarker);
    const parsed = parseWikiReference(rawTarget);

    if (embed && isExcalidrawEmbed(parsed.target)) {
      nextNodes.push(buildExcalidrawNode(parsed.target));
      lastIndex = match.index + match[0].length;
      continue;
    }

    const resolved = resolveWikiReference(parsed.target, wikiIndex, currentCollection);

    nextNodes.push(buildWikiNode({
      embed,
      file,
      label: parsed.label,
      node,
      parsedTarget: parsed.target,
      resolved,
      suffix: parsed.suffix,
    }));

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    nextNodes.push(createTextNode(value.slice(lastIndex)));
  }

  return nextNodes;
}

function isExcalidrawEmbed(target) {
  const normalized = target.replaceAll('\\', '');
  return /^excalidraw\//i.test(normalized) && /\.excalidraw(?:\.md)?$/i.test(normalized);
}

function buildExcalidrawNode(target) {
  const normalizedTarget = target
    .replaceAll('\\', '')
    .replace(/^excalidraw\//i, '');

  return {
    type: 'mdxJsxFlowElement',
    name: 'Excalidraw',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'src',
        value: normalizedTarget,
      },
    ],
    children: [],
  };
}

function buildWikiNode({ embed, file, label, node, parsedTarget, resolved, suffix }) {
  if (resolved.kind === 'content') {
    const visibleLabel = label || resolved.entry.title;
    const previewText = resolved.entry.preview;
    const properties = {
      className: ['wiki-link'],
    };

    if (previewText) {
      properties['data-wiki-title'] = resolved.entry.title;
      properties['data-wiki-preview'] = previewText;
    }

    return {
      type: 'link',
      url: `${resolved.entry.url}${suffix}`,
      title: previewText ? `${resolved.entry.title}\n${previewText}` : resolved.entry.title,
      children: [createTextNode(visibleLabel)],
      data: {
        hProperties: properties,
      },
    };
  }

  if (resolved.kind === 'asset') {
    const rewrittenUrl = rewriteLegacyAssetUrl(resolved.url, file);
    const assetName = path.posix.basename(rewrittenUrl);
    const visibleLabel = label || assetName;

    if (embed && isImagePath(rewrittenUrl)) {
      return {
        type: 'image',
        url: rewrittenUrl,
        alt: visibleLabel,
        data: {
          hProperties: {
            className: ['wiki-embed'],
          },
        },
      };
    }

    return {
      type: 'link',
      url: rewrittenUrl,
      children: [createTextNode(visibleLabel)],
      data: {
        hProperties: {
          className: ['wiki-link'],
        },
      },
    };
  }

  const reason =
    resolved.kind === 'ambiguous'
      ? `Ambiguous wiki link: ${parsedTarget}`
      : `Missing wiki link: ${parsedTarget}`;

  file.message(reason, node);

  return {
    type: 'html',
    value: `<span class="wiki-link wiki-link--missing" title="${escapeAttribute(reason)}">${escapeHtml(label || parsedTarget)}</span>`,
  };
}

function resolveWikiReference(target, wikiIndex, currentCollection) {
  const prefixedTarget = parseCollectionPrefix(target);

  if (prefixedTarget) {
    const resolved = resolveWithinCollection(prefixedTarget.collection, prefixedTarget.target, wikiIndex);
    return resolved ?? resolveAssetReference(target);
  }

  const currentExact = currentCollection
    ? uniqueCandidates(wikiIndex.byCollectionExact.get(currentCollection)?.get(normalizeLookupKey(target)) ?? [])
    : [];
  if (currentExact.length === 1) {
    return { kind: 'content', entry: currentExact[0] };
  }

  const exactMatches = uniqueCandidates(wikiIndex.globalExact.get(normalizeLookupKey(target)) ?? []);
  if (exactMatches.length === 1) {
    return { kind: 'content', entry: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return { kind: 'ambiguous', entries: exactMatches };
  }

  const currentBasename = currentCollection
    ? uniqueCandidates(wikiIndex.byCollectionBasename.get(currentCollection)?.get(normalizeLookupKey(target)) ?? [])
    : [];
  if (currentBasename.length === 1) {
    return { kind: 'content', entry: currentBasename[0] };
  }
  if (currentBasename.length > 1) {
    return { kind: 'ambiguous', entries: currentBasename };
  }

  const basenameMatches = uniqueCandidates(wikiIndex.globalBasename.get(normalizeLookupKey(target)) ?? []);
  if (basenameMatches.length === 1) {
    return { kind: 'content', entry: basenameMatches[0] };
  }
  if (basenameMatches.length > 1) {
    return { kind: 'ambiguous', entries: basenameMatches };
  }

  const currentTitle = currentCollection
    ? uniqueCandidates(wikiIndex.byCollectionTitle.get(currentCollection)?.get(normalizeLookupKey(target)) ?? [])
    : [];
  if (currentTitle.length === 1) {
    return { kind: 'content', entry: currentTitle[0] };
  }
  if (currentTitle.length > 1) {
    return { kind: 'ambiguous', entries: currentTitle };
  }

  const titleMatches = uniqueCandidates(wikiIndex.globalTitle.get(normalizeLookupKey(target)) ?? []);
  if (titleMatches.length === 1) {
    return { kind: 'content', entry: titleMatches[0] };
  }
  if (titleMatches.length > 1) {
    return { kind: 'ambiguous', entries: titleMatches };
  }

  return resolveAssetReference(target);
}

function resolveWithinCollection(collection, target, wikiIndex) {
  const key = normalizeLookupKey(target);
  const exactMatches = uniqueCandidates(wikiIndex.byCollectionExact.get(collection)?.get(key) ?? []);
  if (exactMatches.length === 1) {
    return { kind: 'content', entry: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return { kind: 'ambiguous', entries: exactMatches };
  }

  const basenameMatches = uniqueCandidates(wikiIndex.byCollectionBasename.get(collection)?.get(key) ?? []);
  if (basenameMatches.length === 1) {
    return { kind: 'content', entry: basenameMatches[0] };
  }
  if (basenameMatches.length > 1) {
    return { kind: 'ambiguous', entries: basenameMatches };
  }

  const titleMatches = uniqueCandidates(wikiIndex.byCollectionTitle.get(collection)?.get(key) ?? []);
  if (titleMatches.length === 1) {
    return { kind: 'content', entry: titleMatches[0] };
  }
  if (titleMatches.length > 1) {
    return { kind: 'ambiguous', entries: titleMatches };
  }

  return null;
}

function resolveAssetReference(target) {
  if (!looksLikeRelativeFile(target)) {
    return { kind: 'missing' };
  }

  return {
    kind: 'asset',
    url: target,
  };
}

function buildWikiIndex(base) {
  const index = {
    byCollectionBasename: new Map(),
    byCollectionExact: new Map(),
    byCollectionTitle: new Map(),
    globalBasename: new Map(),
    globalExact: new Map(),
    globalTitle: new Map(),
  };

  for (const [collection, config] of Object.entries(PUBLISHED_COLLECTIONS)) {
    const exactMap = new Map();
    const basenameMap = new Map();
    const titleMap = new Map();

    for (const filePath of listContentFiles(config.dir)) {
      const relativePath = toPosixPath(path.relative(config.dir, filePath));
      const sourcePath = relativePath.replace(/\.(md|mdx)$/i, '');
      const sourceBasename = path.posix.basename(sourcePath);
      const slug = normalizeContentSlug(sourcePath);
      const basename = path.posix.basename(slug);
      const metadata = readEntryMetadata(filePath, sourceBasename);
      const entry = {
        basename,
        collection,
        preview: metadata.preview,
        slug,
        sourceBasename,
        sourcePath,
        title: metadata.title,
        url: withBase(base, `${config.routeBase}/${slug}`),
      };

      addToIndex(exactMap, normalizeLookupKey(slug), entry);
      addToIndex(exactMap, normalizeLookupKey(sourcePath), entry);
      addToIndex(basenameMap, normalizeLookupKey(basename), entry);
      addToIndex(basenameMap, normalizeLookupKey(sourceBasename), entry);
      addToIndex(titleMap, normalizeLookupKey(metadata.title), entry);

      addToIndex(index.globalExact, normalizeLookupKey(slug), entry);
      addToIndex(index.globalExact, normalizeLookupKey(sourcePath), entry);
      addToIndex(index.globalBasename, normalizeLookupKey(basename), entry);
      addToIndex(index.globalBasename, normalizeLookupKey(sourceBasename), entry);
      addToIndex(index.globalTitle, normalizeLookupKey(metadata.title), entry);
    }

    index.byCollectionExact.set(collection, exactMap);
    index.byCollectionBasename.set(collection, basenameMap);
    index.byCollectionTitle.set(collection, titleMap);
  }

  return index;
}

function addToIndex(map, key, entry) {
  if (!key) {
    return;
  }

  const entries = map.get(key);
  if (entries) {
    entries.push(entry);
    return;
  }

  map.set(key, [entry]);
}

function readEntryMetadata(filePath, sourceBasename) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { body, frontmatter } = splitFrontmatter(raw);
  const title = readFrontmatterValue(frontmatter, 'title') || sourceBasename;
  const preview = createExcerpt(body);

  return {
    preview,
    title,
  };
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {
      body: raw,
      frontmatter: '',
    };
  }

  return {
    body: raw.slice(match[0].length),
    frontmatter: match[1],
  };
}

function readFrontmatterValue(frontmatter, key) {
  if (!frontmatter) {
    return '';
  }

  const pattern = new RegExp(`^${escapeRegExp(key)}:\\s*(.+?)\\s*$`, 'm');
  const match = frontmatter.match(pattern);
  if (!match) {
    return '';
  }

  return normalizeFrontmatterValue(match[1]);
}

function normalizeFrontmatterValue(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unquoted.trim();
}

function createExcerpt(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[\[([^[\]\n]+?)\]\]/g, ' ')
    .replace(/\[\[([^[\]|]+?)(?:\|([^[\]]+))?\]\]/g, '$2$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, ' ')
    .replace(/^>\s?/gm, ' ')
    .replace(/^[-*+]\s+/gm, ' ')
    .replace(/^\d+\.\s+/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function listContentFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...listContentFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function parseWikiReference(rawTarget) {
  const separatorIndex = rawTarget.indexOf('|');
  const target = separatorIndex === -1 ? rawTarget : rawTarget.slice(0, separatorIndex);
  const label = separatorIndex === -1 ? '' : rawTarget.slice(separatorIndex + 1).trim();

  const hashIndex = target.indexOf('#');
  if (hashIndex === -1) {
    return {
      label,
      suffix: '',
      target: target.trim(),
    };
  }

  return {
    label,
    suffix: target.slice(hashIndex).trim(),
    target: target.slice(0, hashIndex).trim(),
  };
}

function parseCollectionPrefix(target) {
  const match = target.match(/^([A-Za-z]+):(.*)$/);
  if (!match) {
    return null;
  }

  const collection = COLLECTION_ALIASES.get(match[1].toLowerCase());
  if (!collection) {
    return null;
  }

  return {
    collection,
    target: match[2].trim(),
  };
}

function detectCollectionName(file) {
  const filePath = getRemarkFilePath(file);
  const match = filePath.match(/\/src\/content\/([^/]+)\//);
  return match?.[1] || '';
}

function rewriteNodeAssetUrl(node, file) {
  if (!node || typeof node.url !== 'string') {
    return;
  }

  node.url = rewriteLegacyAssetUrl(node.url, file);
}

function rewriteLegacyAssetUrl(url, file) {
  const normalized = url.trim();
  if (!normalized.startsWith('assets/')) {
    return url;
  }

  const filePath = getRemarkFilePath(file);
  const collectionRoot = getCollectionRootPath(filePath);
  if (!filePath || !collectionRoot) {
    return url;
  }

  const currentDir = path.posix.dirname(filePath);
  const relativeDir = path.posix.relative(collectionRoot, currentDir);
  if (!relativeDir) {
    return url;
  }

  const segments = relativeDir.split('/').filter(Boolean);
  if (!segments.length) {
    return url;
  }

  return `${segments.map(() => '..').join('/')}/${normalized}`;
}

function getRemarkFilePath(file) {
  return (file.path || file.history?.[0] || '').replace(/\\/g, '/');
}

function getCollectionRootPath(filePath) {
  const match = filePath.match(/^(.*\/src\/content\/[^/]+)\//);
  return match?.[1] || '';
}

function looksLikeRelativeFile(target) {
  const normalized = target.trim();
  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith('./') ||
    normalized.startsWith('../') ||
    normalized.startsWith('assets/')
  ) {
    return true;
  }

  const extension = path.posix.extname(normalized).toLowerCase();
  return Boolean(extension) && extension !== '.md' && extension !== '.mdx';
}

function isImagePath(target) {
  return IMAGE_EXTENSIONS.has(path.posix.extname(target).toLowerCase());
}

function withBase(base, routePath) {
  if (routePath === '/') {
    return base === '/' ? '/' : base.slice(0, -1);
  }

  const normalizedPath = routePath.startsWith('/') ? routePath.slice(1) : routePath;
  return `${base}${normalizedPath}`;
}

function normalizeBase(base) {
  if (!base || base === '/') {
    return '/';
  }

  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function normalizeLookupKey(value) {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.(md|mdx)$/i, '')
    .toLowerCase();
}

function normalizeContentSlug(value) {
  return collapseDuplicateLeaf(
    value
      .split('/')
      .map((segment) => githubSlug(segment))
      .join('/')
      .replace(/\/index$/, '')
  );
}

function collapseDuplicateLeaf(value) {
  const segments = value.split('/').filter(Boolean);
  if (segments.length >= 2 && segments.at(-1) === segments.at(-2)) {
    return segments.slice(0, -1).join('/');
  }

  return segments.join('/');
}

function uniqueCandidates(entries) {
  return [...new Map(entries.map((entry) => [`${entry.collection}:${entry.slug}`, entry])).values()];
}

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep);
}

function createTextNode(value) {
  return {
    type: 'text',
    value,
  };
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', '&quot;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
