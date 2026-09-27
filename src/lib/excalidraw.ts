import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import lzString from 'lz-string';

const projectRoot = process.cwd();
const excalidrawRoot = path.join(projectRoot, 'src/content/Excalidraw');

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

interface ExcalidrawBinaryFile {
  created: number;
  dataURL: string;
  id: string;
  lastRetrieved?: number;
  mimeType: string;
  version?: number;
}

export interface ExcalidrawSceneData {
  appState?: Record<string, unknown>;
  elements: Array<Record<string, unknown>>;
  files: Record<string, ExcalidrawBinaryFile>;
  sourcePath: string;
}

interface ParsedMarkdownScene {
  embeddedFiles: Map<string, string>;
  scene: Record<string, unknown>;
}

export async function loadExcalidrawScene(
  src: string
): Promise<ExcalidrawSceneData> {
  const resolvedPath = await resolveExcalidrawPath(src);
  const raw = await readFile(resolvedPath, 'utf8');

  let scene: Record<string, unknown>;
  let embeddedFiles = new Map<string, string>();

  if (resolvedPath.endsWith('.md') || resolvedPath.endsWith('.mdx')) {
    const parsed = parseMarkdownScene(raw);
    scene = parsed.scene;
    embeddedFiles = parsed.embeddedFiles;
  } else {
    scene = JSON.parse(raw) as Record<string, unknown>;
  }

  const files = await loadBinaryFiles(
    resolvedPath,
    scene.files,
    embeddedFiles
  );

  return {
    sourcePath: path.relative(projectRoot, resolvedPath),
    elements: Array.isArray(scene.elements)
      ? (scene.elements as Array<Record<string, unknown>>)
      : [],
    appState: isRecord(scene.appState)
      ? (scene.appState as Record<string, unknown>)
      : undefined,
    files,
  };
}

async function resolveExcalidrawPath(src: string): Promise<string> {
  const normalized = src.trim();
  if (!normalized) {
    throw new Error('Excalidraw src 不能为空');
  }

  const candidates = [
    path.isAbsolute(normalized) ? normalized : undefined,
    path.resolve(projectRoot, normalized),
    path.resolve(excalidrawRoot, normalized),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  const matched = await findFileByBasename(excalidrawRoot, normalized);
  if (matched) {
    return matched;
  }

  throw new Error(`找不到 Excalidraw 文件: ${src}`);
}

async function findFileByBasename(
  currentDir: string,
  target: string
): Promise<string | null> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      const matched = await findFileByBasename(absolutePath, target);
      if (matched) {
        return matched;
      }
      continue;
    }

    const relativePath = path.relative(excalidrawRoot, absolutePath);
    if (entry.name === target || relativePath === target) {
      return absolutePath;
    }
  }

  return null;
}

function parseMarkdownScene(markdown: string): ParsedMarkdownScene {
  const compressed = markdown.match(/```(?:compressed-json|json)\s+([\s\S]*?)\s+```/);
  if (!compressed?.[1]) {
    throw new Error('未在 Excalidraw markdown 文件中找到压缩绘图数据');
  }

  const sceneText = compressed[0].startsWith('```json')
    ? compressed[1]
    : decompressFromBase64(compressed[1].replace(/\s+/g, ''));
  if (!sceneText) {
    throw new Error('Excalidraw 绘图数据解压失败');
  }

  const scene = JSON.parse(sceneText) as Record<string, unknown>;
  const embeddedSection = markdown.match(/## Embedded Files([\s\S]*?)\n%%/);
  const embeddedFiles = new Map<string, string>();

  if (embeddedSection?.[1]) {
    for (const line of embeddedSection[1].split('\n')) {
      const match = line.trim().match(/^([a-f0-9]+):\s+\[\[(.+?)\]\]$/i);
      if (!match) {
        continue;
      }
      embeddedFiles.set(match[1], match[2]);
    }
  }

  return { scene, embeddedFiles };
}

const { decompressFromBase64 } = lzString;

async function loadBinaryFiles(
  sourcePath: string,
  rawFiles: unknown,
  embeddedFiles: Map<string, string>
): Promise<Record<string, ExcalidrawBinaryFile>> {
  const files: Record<string, ExcalidrawBinaryFile> = {};

  if (isRecord(rawFiles)) {
    for (const [id, value] of Object.entries(rawFiles)) {
      if (!isRecord(value) || typeof value.dataURL !== 'string') {
        continue;
      }

      files[id] = {
        id,
        dataURL: value.dataURL,
        mimeType:
          typeof value.mimeType === 'string'
            ? value.mimeType
            : 'application/octet-stream',
        created:
          typeof value.created === 'number' ? value.created : Date.now(),
        lastRetrieved:
          typeof value.lastRetrieved === 'number'
            ? value.lastRetrieved
            : undefined,
        version: typeof value.version === 'number' ? value.version : undefined,
      };
    }
  }

  for (const [id, relativeAssetPath] of embeddedFiles) {
    if (files[id]) {
      continue;
    }

    const absoluteAssetPath = path.resolve(
      path.dirname(sourcePath),
      relativeAssetPath
    );

    if (!(await pathExists(absoluteAssetPath))) {
      console.warn(
        `[Excalidraw] 嵌入资源不存在，已跳过: ${absoluteAssetPath}`
      );
      continue;
    }

    const buffer = await readFile(absoluteAssetPath);
    const fileStat = await stat(absoluteAssetPath);
    const extension = path.extname(absoluteAssetPath).toLowerCase();
    const mimeType = IMAGE_MIME_TYPES[extension] ?? 'application/octet-stream';

    files[id] = {
      id,
      mimeType,
      created: Math.round(fileStat.mtimeMs),
      lastRetrieved: Math.round(fileStat.mtimeMs),
      dataURL: `data:${mimeType};base64,${buffer.toString('base64')}`,
    };
  }

  return files;
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
