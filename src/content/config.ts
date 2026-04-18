import { defineCollection, z } from 'astro:content';
import { normalizeContentDate } from '../lib/content-date';

const baseSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    date: z.preprocess(normalizeContentDate, z.string().optional()),
    tags: z.array(z.string()).optional(),
  })
  .passthrough();

const notes = defineCollection({ type: 'content', schema: baseSchema });
const thoughts = defineCollection({ type: 'content', schema: baseSchema });
const blogs = defineCollection({ type: 'content', schema: baseSchema });
const archived = defineCollection({ type: 'content', schema: baseSchema });
const writing = defineCollection({ type: 'content', schema: baseSchema });
const Excalidraw = defineCollection({ type: 'content', schema: baseSchema });

export const collections = {
  notes,
  thoughts,
  blogs,
  archived,
  writing,
  Excalidraw,
};
