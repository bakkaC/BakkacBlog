import type { HomeCategoryItem } from './types';

interface CategoriesProps {
  categories: HomeCategoryItem[];
}

export function Categories({ categories }: CategoriesProps) {
  return (
    <section>
      <div className="flex items-center gap-3 text-xs uppercase text-slate-500">
        <span>Categories</span>
        <span className="h-px flex-1 bg-slate-300" />
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm leading-7 text-slate-700">
        {categories.map((category) => (
          <a
            key={category.tag}
            href={category.href}
            className="inline-flex items-baseline gap-2 transition-colors hover:text-slate-950"
          >
            <span className="font-medium">#{category.tag}</span>
            <span className="text-xs text-slate-400">{category.count}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
