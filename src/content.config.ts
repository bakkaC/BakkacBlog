import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { slug as githubSlug } from 'github-slugger';
import { normalizeContentDate } from './lib/content-date';

const normalizeContentId = (value: string) =>
  collapseDuplicateLeaf(
    value
    .replace(/\.(md|mdx)$/i, '')
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '')
  );

const collapseDuplicateLeaf = (value: string) => {
  const segments = value.split('/').filter(Boolean);
  if (segments.length >= 2 && segments.at(-1) === segments.at(-2)) {
    return segments.slice(0, -1).join('/');
  }

  return segments.join('/');
};

const baseSchema = z.looseObject({
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.preprocess(normalizeContentDate, z.string().optional()),
  tags: z.array(z.string()).optional(),
  parent: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim()
        ? normalizeContentId(value.trim())
        : undefined,
    z.string().optional()
  ),
});

const generateContentId = ({ entry }: { entry: string }) =>
  normalizeContentId(entry);

const notes = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/notes',
    generateId: generateContentId,
  }),
  schema: baseSchema,
});

const thoughts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/thoughts',
    generateId: generateContentId,
  }),
  schema: baseSchema,
});

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/posts',
    generateId: generateContentId,
  }),
  schema: baseSchema,
});

const archived = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/archived',
    generateId: generateContentId,
  }),
  schema: baseSchema,
});

const writing = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/writing',
    generateId: generateContentId,
  }),
  schema: baseSchema,
});

const 八股 = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/八股',
    generateId: generateContentId,
  }),
  schema: baseSchema,
});

export const collections = {
  notes,
  thoughts,
  posts,
  archived,
  writing,
  八股,
};
