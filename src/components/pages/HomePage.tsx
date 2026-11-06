import type { ReactNode } from 'react';
import { Categories } from '../home/Categories';
import { LatestPosts } from '../home/LatestPosts';
import { ProfileCard } from '../home/ProfileCard';
import type {
  HomeAccordionLatestByCollection,
  HomeCategoryItem,
  HomePostItem,
} from '../home/types';

interface HomePageProps {
  baseUrl: string;
  latestPosts: HomePostItem[];
  accordionLatest: HomeAccordionLatestByCollection;
  categories: HomeCategoryItem[];
}

export default function HomePage({
  baseUrl,
  latestPosts,
  accordionLatest,
  categories,
}: HomePageProps): ReactNode {
  return (
    <>
      {/*
        Temporarily off so we can judge the page without the foliage gobo /
        key-light wash. Restore `home-leaf-shadow` + `home-light-wash` when done.
      */}
      <section className="relative z-10 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="relative overflow-visible [--cut-size:72px] md:[--cut-size:88px] lg:[--cut-size:120px]">
            <ProfileCard baseUrl={baseUrl} accordionLatest={accordionLatest} />
          </div>

          <div className="mt-8 grid gap-8 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <LatestPosts posts={latestPosts} />
            <Categories categories={categories} />
          </div>
        </div>
      </section>
    </>
  );
}
