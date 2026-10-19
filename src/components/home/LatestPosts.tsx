import type { HomePostItem } from './types';

interface LatestPostsProps {
  posts: HomePostItem[];
}

export function LatestPosts({ posts }: LatestPostsProps) {
  return (
    <section>
      <div className="flex items-center gap-3 text-xs uppercase text-slate-500">
        <span>Latest Posts</span>
        <span className="h-px flex-1 bg-slate-300" />
      </div>

      <div className="mt-5 space-y-3">
        {posts.map((post) => {
          const tags = post.tags.slice(0, 3);
          const hiddenCount = Math.max(post.tags.length - tags.length, 0);
          const tagText = `${tags.map((tag) => `#${tag}`).join(' · ')}${hiddenCount ? ` · +${hiddenCount}` : ''}`;
          const compactTagText = post.tags[0] ? `#${post.tags[0]}` : '';

          return (
            <a key={post.href} href={post.href} className="block pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-baseline gap-2 sm:gap-3">
                  <h3 className="truncate text-base font-medium tracking-tight text-slate-950 transition-colors hover:text-slate-700">
                    {post.title}
                  </h3>
                  {compactTagText ? (
                    <span className="hidden shrink-0 whitespace-nowrap text-[11px] leading-6 text-slate-500 sm:inline md:hidden">
                      {compactTagText}
                    </span>
                  ) : null}
                  {post.tags.length ? (
                    <span className="hidden shrink-0 whitespace-nowrap text-xs leading-6 text-slate-500 md:inline">
                      {tagText}
                    </span>
                  ) : null}
                </div>
                <span className="shrink-0 text-right text-[11px] text-slate-500 sm:text-xs">
                  {post.dateLabel}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
