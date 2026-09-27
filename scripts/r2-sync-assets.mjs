#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const imageExtensions = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

const imageMimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const workspaceRoot = process.cwd();
const contentRoot = path.join(workspaceRoot, 'src/content');
const externalAssetCollections = new Set([
  'archived',
  'blogs',
  'notes',
  'thoughts',
  'writing',
  '八股',
]);
const bucket = process.env.R2_BUCKET ?? 'bakkac-blog-assets';
const publicUrl = trimTrailingSlash(
  process.env.R2_PUBLIC_URL ??
    'https://pub-3e7309b325c44f1aa89203b2c221c2ac.r2.dev'
);
const keyPrefix = normalizeKey(process.env.R2_KEY_PREFIX ?? '');
const cacheControl =
  process.env.R2_CACHE_CONTROL ?? 'public, max-age=86400';
const dryRun = process.argv.includes('--dry-run') || process.env.R2_DRY_RUN === '1';
const skipUpload = process.argv.includes('--skip-upload') || process.env.R2_SKIP_UPLOAD === '1';

if (!publicUrl) {
  exitWithConfigError('缺少 R2_PUBLIC_URL，例如：R2_PUBLIC_URL=https://img.example.com');
}

const documentFiles = await findFiles(
  contentRoot,
  (filePath) => filePath.endsWith('.md') || filePath.endsWith('.mdx')
);
const assetFiles = await findFiles(
  contentRoot,
  (filePath) => isImageFile(filePath) && isExternalAssetPath(filePath)
);
let uploadedCount = 0;
let skippedCount = 0;
let replacedCount = 0;
let missingCount = 0;

if (!skipUpload) {
  const assetsToUpload = await mapWithConcurrency(
    assetFiles,
    12,
    async (assetPath) => ({
      assetPath,
      shouldUpload: await shouldUploadAsset(
        assetPath,
        buildObjectKey(assetPath)
      ),
    })
  );

  for (const { assetPath, shouldUpload } of assetsToUpload) {
    if (!shouldUpload) {
      skippedCount += 1;
      continue;
    }

    uploadAsset(assetPath, buildObjectKey(assetPath));
    uploadedCount += 1;
  }
}

for (const documentFile of documentFiles) {
  const original = await readFile(documentFile, 'utf8');
  const images = findMarkdownImages(original);
  let next = original;
  let offset = 0;

  for (const image of images) {
    const destination = parseDestination(image.destination);

    if (!destination || shouldSkipDestination(destination.url)) {
      continue;
    }

    const assetPath = resolveAssetPath(documentFile, destination.url);

    if (
      !assetPath ||
      !isImageFile(assetPath) ||
      !isExternalAssetPath(assetPath)
    ) {
      continue;
    }

    if (!existsSync(assetPath)) {
      missingCount += 1;
      console.warn(
        `找不到图片：${relativePath(assetPath)}，引用自 ${relativePath(documentFile)}`
      );
      continue;
    }

    const objectKey = buildObjectKey(assetPath);
    const nextUrl = buildPublicUrl(objectKey);
    const nextRawDestination = formatDestination(
      nextUrl,
      destination.wrapWithAngleBrackets,
      destination.suffix
    );
    const nextImageMarkdown =
      image.raw.slice(0, image.destinationStartInRaw) +
      nextRawDestination +
      image.raw.slice(image.destinationEndInRaw);

    const start = image.start + offset;
    const end = image.end + offset;
    next = next.slice(0, start) + nextImageMarkdown + next.slice(end);
    offset += nextImageMarkdown.length - image.raw.length;
    replacedCount += 1;
  }

  if (next !== original && !dryRun) {
    await writeFile(documentFile, next);
  }
}

const modeLabel = dryRun ? 'dry-run：' : '';
console.log(
  `${modeLabel}完成。上传 ${skipUpload ? 0 : uploadedCount} 个，跳过 ${skipUpload ? 0 : skippedCount} 个未变化对象，替换 ${replacedCount} 处，缺失 ${missingCount} 个。`,
);

function exitWithConfigError(message) {
  console.error(message);
  console.error(
    '用法：R2_BUCKET=你的bucket R2_PUBLIC_URL=https://img.example.com pnpm r2:assets',
  );
  process.exit(1);
}

async function findFiles(directory, filter) {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...(await findFiles(entryPath, filter)));
    } else if (entry.isFile() && filter(entryPath)) {
      result.push(entryPath);
    }
  }

  return result;
}

function findMarkdownImages(markdown) {
  const result = [];
  let cursor = 0;

  while (cursor < markdown.length) {
    const imageStart = markdown.indexOf('![', cursor);

    if (imageStart === -1) {
      break;
    }

    const labelEnd = markdown.indexOf(']', imageStart + 2);

    if (labelEnd === -1 || markdown[labelEnd + 1] !== '(') {
      cursor = imageStart + 2;
      continue;
    }

    const destinationStart = labelEnd + 2;
    const destinationEnd = findClosingParen(markdown, destinationStart);

    if (destinationEnd === -1) {
      cursor = destinationStart;
      continue;
    }

    result.push({
      start: imageStart,
      end: destinationEnd + 1,
      raw: markdown.slice(imageStart, destinationEnd + 1),
      destination: markdown.slice(destinationStart, destinationEnd),
      destinationStartInRaw: destinationStart - imageStart,
      destinationEndInRaw: destinationEnd - imageStart,
    });
    cursor = destinationEnd + 1;
  }

  return result;
}

function findClosingParen(markdown, start) {
  let depth = 0;
  let inAngleBrackets = false;

  for (let index = start; index < markdown.length; index += 1) {
    const char = markdown[index];
    const previous = markdown[index - 1];

    if (previous === '\\') {
      continue;
    }

    if (char === '<') {
      inAngleBrackets = true;
      continue;
    }

    if (char === '>') {
      inAngleBrackets = false;
      continue;
    }

    if (inAngleBrackets) {
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      if (depth === 0) {
        return index;
      }

      depth -= 1;
    }
  }

  return -1;
}

function parseDestination(rawDestination) {
  const trimmed = rawDestination.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('<')) {
    const end = trimmed.indexOf('>');

    if (end === -1) {
      return null;
    }

    return {
      url: trimmed.slice(1, end),
      wrapWithAngleBrackets: true,
      suffix: trimmed.slice(end + 1),
    };
  }

  const titleStart = trimmed.search(/\s["']/);
  const url = titleStart === -1 ? trimmed : trimmed.slice(0, titleStart);

  return {
    url,
    wrapWithAngleBrackets: false,
    suffix: trimmed.slice(url.length),
  };
}

function shouldSkipDestination(url) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(url) ||
    url.startsWith('//') ||
    url.startsWith('#') ||
    url.startsWith('/')
  );
}

function resolveAssetPath(mdxFile, rawUrl) {
  const withoutHash = rawUrl.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  let decodedUrl = withoutQuery;

  try {
    decodedUrl = decodeURIComponent(withoutQuery);
  } catch {
    decodedUrl = withoutQuery;
  }

  const candidates = [
    path.resolve(path.dirname(mdxFile), decodedUrl),
    path.resolve(getContentSectionRoot(mdxFile), decodedUrl),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function isImageFile(filePath) {
  return imageExtensions.has(path.extname(filePath).toLowerCase());
}

function buildObjectKey(filePath) {
  const relativeAssetPath = relativePath(filePath);
  return normalizeKey(path.posix.join(keyPrefix, relativeAssetPath));
}

function buildPublicUrl(objectKey) {
  return `${publicUrl}/${encodeObjectKey(objectKey)}`;
}

function encodeObjectKey(objectKey) {
  return objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function formatDestination(url, wrapWithAngleBrackets, suffix) {
  return `${wrapWithAngleBrackets ? `<${url}>` : url}${suffix}`;
}

function uploadAsset(filePath, objectKey) {
  const objectTarget = `${bucket}/${objectKey}`;

  if (dryRun) {
    console.log(`[dry-run] upload ${relativePath(filePath)} -> ${objectTarget}`);
    return;
  }

  const localWrangler = path.join(workspaceRoot, 'node_modules/.bin/wrangler');
  const command = existsSync(localWrangler) ? localWrangler : 'pnpm';
  const args = existsSync(localWrangler)
    ? [
        'r2',
        'object',
        'put',
        objectTarget,
        '--file',
        filePath,
        '--remote',
        '--content-type',
        getImageMimeType(filePath),
        '--cache-control',
        cacheControl,
      ]
    : [
        'dlx',
        'wrangler',
        'r2',
        'object',
        'put',
        objectTarget,
        '--file',
        filePath,
        '--remote',
        '--content-type',
        getImageMimeType(filePath),
        '--cache-control',
        cacheControl,
      ];

  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function shouldUploadAsset(filePath, objectKey) {
  const file = await readFile(filePath);
  const localEtag = createHash('md5').update(file).digest('hex');
  const expectedContentType = getImageMimeType(filePath);

  try {
    const response = await fetch(buildPublicUrl(objectKey), {
      method: 'HEAD',
      cache: 'no-store',
    });
    const remoteEtag = response.headers.get('etag')?.replaceAll('"', '');
    const remoteSize = Number(response.headers.get('content-length'));
    const remoteContentType = response.headers.get('content-type');
    const remoteCacheControl = response.headers.get('cache-control');
    const matches =
      response.ok &&
      remoteEtag === localEtag &&
      remoteSize === file.byteLength &&
      remoteContentType === expectedContentType &&
      remoteCacheControl === cacheControl;

    if (matches) {
      console.log(`[skip] ${relativePath(filePath)}`);
      return false;
    }
  } catch (error) {
    console.warn(
      `无法检查远端对象，将重新上传 ${relativePath(filePath)}：${error instanceof Error ? error.message : String(error)}`
    );
  }

  return true;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    )
  );
  return results;
}

function isExternalAssetPath(filePath) {
  const relative = path.relative(contentRoot, filePath);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }

  const [collection, ...segments] = relative.split(path.sep);
  return externalAssetCollections.has(collection) && segments.includes('assets');
}

function getImageMimeType(filePath) {
  return (
    imageMimeTypes.get(path.extname(filePath).toLowerCase()) ??
    'application/octet-stream'
  );
}

function relativePath(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join('/');
}

function getContentSectionRoot(filePath) {
  const relativeToContent = path.relative(contentRoot, filePath);
  const [section] = relativeToContent.split(path.sep);
  return section ? path.join(contentRoot, section) : contentRoot;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeKey(value) {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
