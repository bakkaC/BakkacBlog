import type { ReactNode } from 'react';
import { PaperTexture } from '@paper-design/shaders-react';
import { PostMark } from '../home/PostMark';
import { Categories } from '../home/Categories';
import { LatestPosts } from '../home/LatestPosts';
import { ProfileCard } from '../home/ProfileCard';
import type { HomeCategoryItem, HomePostItem } from '../home/types';
import { usePaperTextureReveal } from '../../lib/use-paper-texture-reveal';

interface HomePageProps {
  baseUrl: string;
  latestPosts: HomePostItem[];
  categories: HomeCategoryItem[];
}

export default function HomePage({
  baseUrl,
  latestPosts,
  categories,
}: HomePageProps): ReactNode {
  const paper = usePaperTextureReveal();

  return (
    <main className="homepage-paper-texture relative min-h-[calc(100vh-60px)] overflow-hidden">
      {/*
        Same shader as the collection pages' `PaperTextureBackground`; only the
        tint differs. Keeping both call sites on the same `PaperTexture` import
        keeps Vite emitting a single shared chunk.
      */}
      <PaperTexture
        ref={paper.ref}
        fit="contain"
        scale={0.9}
        blending={1}
        distortion={0.3}
        clip={false}
        angle={300}
        seed={4}
        roughness={0.4}
        roughnessSize={0.5}
        roughnessRows={0}
        fiber={0.39}
        fiberSize={0.5}
        folds={0}
        foldSizeX={1}
        foldSizeY={1}
        foldOffsetX={0}
        foldOffsetY={0}
        wrinkles={1}
        wrinkleSize={0.65}
        drops={0.08}
        colorBack="#00000000"
        colorPaper="#FFFFFFC2"
        colorShadow="#CCCCCC66"
        className="paper-texture-reveal absolute inset-0 h-full w-full bg-[#F4F4F4]"
        style={{ opacity: paper.revealed ? undefined : 0 }}
      />
      <section className="relative z-10 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="relative [--cut-size:72px] md:[--cut-size:88px] lg:[--cut-size:120px]">
            {/* <svg
              aria-hidden="true"
              viewBox="0 0 32 32"
              width="48"
              height="48"
              className="pointer-events-none absolute z-30 text-white"
              style={{
                left: 'min(max(0.5rem, calc(var(--cut-size) * 0.11)), 1rem)',
                top: 'min(max(0.5rem, calc(var(--cut-size) * 0.11)), 1rem)',
                width: 'min(max(3rem, calc(var(--cut-size) * 0.6)), 4.5rem)',
                height: 'min(max(3rem, calc(var(--cut-size) * 0.6)), 4.5rem)',
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            >
              <polygon points="1,1 1,23 23,1" fill="currentColor" stroke="black" strokeWidth="0.8" />
            </svg> */}
            <PostMark className="pointer-events-none absolute left-22 top-4 z-20 w-28 translate-x-0 text-slate-900 sm:left-26 sm:top-6 sm:w-32 md:left-28 md:top-5 md:w-32 lg:left-36 lg:top-8 lg:w-44" />
            <ProfileCard baseUrl={baseUrl} />
          </div>

          <div className="mt-8 grid gap-8 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <LatestPosts posts={latestPosts} />
            <Categories categories={categories} />
          </div>
        </div>
      </section>
    </main>
  );
}
