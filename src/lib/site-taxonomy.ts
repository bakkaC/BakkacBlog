import type { CollectionEntry } from 'astro:content';

import { getContentDateTimestamp } from './content-date';

export type ArticleCollection = 'notes' | 'thoughts' | 'posts';
export type SiteEntry = CollectionEntry<ArticleCollection>;

export const COLLECTION_ROOTS: Record<ArticleCollection, string> = {
  notes: '/notes',
  thoughts: '/thoughts',
  posts: '/posts',
};

export const COLLECTION_LABELS: Record<ArticleCollection, string> = {
  notes: 'Notes',
  thoughts: 'Thoughts',
  posts: 'Posts',
};

export const normalizeBase = (value: string) => (value.endsWith('/') ? value : `${value}/`);

export const withBase = (baseUrl: string, path: string) => {
  const normalizedBase = normalizeBase(baseUrl);
  if (path === '/') {
    return normalizedBase === '/' ? '/' : normalizedBase.slice(0, -1);
  }

  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
};

export const getEntryPath = (entry: SiteEntry) => `${COLLECTION_ROOTS[entry.collection]}/${entry.id}`;

export const sortEntriesByDate = <T extends SiteEntry>(entries: T[]) =>
  [...entries].sort((a, b) => {
    const aDate = getContentDateTimestamp(a.data.date);
    const bDate = getContentDateTimestamp(b.data.date);
    if (aDate !== bDate) return bDate - aDate;
    return a.id.localeCompare(b.id, 'zh-Hans');
  });

export const normalizeTag = (tag: string) => tag.trim();

export const slugifyTag = (tag: string) => {
  const normalized = normalizeTag(tag).toLowerCase();
  const slug = normalized
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'tag';
};

export interface TagBucket {
  tag: string;
  slug: string;
  count: number;
  entries: SiteEntry[];
  collections: ArticleCollection[];
}

export const collectTagBuckets = (entries: SiteEntry[]) => {
  const buckets = new Map<string, TagBucket>();

  for (const entry of sortEntriesByDate(entries)) {
    const tags = [...new Set((entry.data.tags ?? []).map(normalizeTag).filter(Boolean))];

    for (const tag of tags) {
      const slug = slugifyTag(tag);
      const existing = buckets.get(slug);

      if (!existing) {
        buckets.set(slug, {
          tag,
          slug,
          count: 1,
          entries: [entry],
          collections: [entry.collection],
        });
        continue;
      }

      existing.count += 1;
      existing.entries.push(entry);
      if (!existing.collections.includes(entry.collection)) {
        existing.collections.push(entry.collection);
      }
    }
  }

  return [...buckets.values()].sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag, 'zh-Hans');
  });
};
