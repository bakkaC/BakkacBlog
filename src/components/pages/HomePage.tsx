import type { ReactNode } from 'react';
import { PaperTexture } from '@paper-design/shaders-react';
import { Categories } from '../home/Categories';
import { LatestPosts } from '../home/LatestPosts';
import { ProfileCard } from '../home/ProfileCard';
import type {
  HomeAccordionLatestByCollection,
  HomeCategoryItem,
  HomePostItem,
} from '../home/types';
import { usePaperTextureReveal } from '../../lib/use-paper-texture-reveal';

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
  const paper = usePaperTextureReveal();

  return (
    <main className="homepage-paper-texture relative min-h-[calc(100vh-60px)] overflow-x-clip overflow-y-visible">
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
        className="paper-texture-reveal absolute inset-0 z-0 h-full w-full bg-[#F4F4F4]"
        style={{ opacity: paper.revealed ? undefined : 0 }}
      />
      {/*
        Full-page foliage gobo: above paper, under content. Tall cover + soft
        vertical mask so top/bottom crop never seams.
      */}
      <div className="home-leaf-shadow" aria-hidden="true">
        <img
          src={`${baseUrl}vectors/home-leaf-shadow.png`}
          alt=""
          draggable={false}
        />
      </div>
      <div className="home-light-wash" aria-hidden="true" />
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
    </main>
  );
}
