import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { getContentDateTimestamp, parseContentDate } from '../lib/content-date';

export const prerender = true;

const normalizeBase = (value: string) => (value.endsWith('/') ? value : `${value}/`);
const withBase = (baseUrl: string, path: string) => {
  const normalizedBase = normalizeBase(baseUrl);
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
};

type FeedItem = {
  title: string;
  description?: string;
  link: string;
  pubDate?: Date;
  categories?: string[];
};

export async function GET(context: APIContext) {
  const baseUrl = import.meta.env.BASE_URL;

  const [notes, thoughts, blogs] = await Promise.all([
    getCollection('notes'),
    getCollection('thoughts'),
    getCollection('blogs'),
  ]);

  const items: FeedItem[] = [
    ...notes.map((entry) => ({
      title: entry.data.title ?? entry.slug,
      description: entry.data.description,
      link: withBase(baseUrl, `/notes/${entry.slug}`),
      pubDate: parseContentDate(entry.data.date),
      categories: entry.data.tags,
    })),
    ...thoughts.map((entry) => ({
      title: entry.data.title ?? entry.slug,
      description: entry.data.description,
      link: withBase(baseUrl, `/thoughts/${entry.slug}`),
      pubDate: parseContentDate(entry.data.date),
      categories: entry.data.tags,
    })),
    ...blogs.map((entry) => ({
      title: entry.data.title ?? entry.slug,
      description: entry.data.description,
      link: withBase(baseUrl, `/blog/${entry.slug}`),
      pubDate: parseContentDate(entry.data.date),
      categories: entry.data.tags,
    })),
  ].sort((a, b) => {
    const aTime = getContentDateTimestamp(a.pubDate);
    const bTime = getContentDateTimestamp(b.pubDate);
    return bTime - aTime;
  });

  return rss({
    title: "CdCore's Blog",
    description: '记录前端开发、工程实践与随想杂记',
    site: context.site ?? new URL('https://cdhxr.github.io'),
    items: items.map((item) => ({
      title: item.title,
      description: item.description ?? '',
      link: item.link,
      ...(item.pubDate ? { pubDate: item.pubDate } : {}),
      categories: item.categories ?? [],
    })),
    customData: `<language>zh-cn</language>`,
  });
}
