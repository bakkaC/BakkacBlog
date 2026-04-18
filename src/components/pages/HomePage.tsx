import type { ReactNode } from 'react';
import { useState } from 'react';
import { ArrowDown, ExternalLink } from 'lucide-react';
import { Tiles } from '../ui/tiles';
import Noise from '../ui/Noise';
import FallingText from '../FallingText';

interface HomePageProps {
  baseUrl: string;
}

const withBase = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (path === '/') return normalizedBase;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
};

export default function HomePage({ baseUrl }: HomePageProps): ReactNode {
  const [activeIndex, setActiveIndex] = useState(2);

  const avatarSrc = withBase(baseUrl, '/kumiko.jpg');

  const accordionItems = [
    {
      id: 1,
      title: 'Notes',
      bgClass: 'bg-blue-400',
      link: withBase(baseUrl, '/notes'),
    },
    {
      id: 2,
      title: 'Thoughts',
      bgClass: 'bg-yellow-300',
      link: withBase(baseUrl, '/thoughts'),
    },
    {
      id: 3,
      title: 'Blogs',
      bgClass: 'bg-red-400',
      link: withBase(baseUrl, '/blog'),
    },
  ];

  const profileLinks = [
    {
      id: 'github',
      label: 'github',
      href: 'https://github.com/cdhxr',
      icon: <ExternalLink className="h-3 w-3" />,
    },
    {
      id: 'bilibili',
      label: 'bilibili',
      href: 'https://space.bilibili.com/244330808?spm_id_from=333.1007.0.0',
      icon: <ExternalLink className="h-3 w-3" />,
    },
    {
      id: 'x',
      label: 'X',
      href: 'https://x.com/chxr14550208',
      icon: <ExternalLink className="h-3 w-3" />,
    },
  ];

  return (
    <main className="relative min-h-[calc(100vh-60px)] bg-slate-50 flex items-center">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Tiles rows={50} cols={20} tileSize="lg" />
        <Noise
          patternSize={50}
          patternScaleX={0.1}
          patternScaleY={0.1}
          patternRefreshInterval={0}
          patternAlpha={5}
        />
      </div>
      {/* <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.85),rgba(255,255,255,0.35)_55%,rgba(232,223,208,0.35)_100%)] opacity-80 mix-blend-multiply"
      /> */}

      <section className="w-full h-full relative z-10">
        <div className="w-full py-0 mb-0 sm:py-10 sm:mb-6">
          <div className="mx-auto max-w-7xl w-full">
            <div className="relative bg-white p-12 md:p-8 flex w-full flex-col items-center gap-20 sm:p-12 sm:gap-8 md:flex-row md:flex-nowrap md:items-start md:justify-start md:gap-40 lg:p-16 lg:gap-80">
              <span className="pointer-events-none absolute left-6 top-6 h-6 w-6 border-l-2 border-t-2 border-slate-900" />
              <span className="pointer-events-none absolute right-6 top-6 h-6 w-6 border-r-2 border-t-2 border-slate-900" />
              <span className="pointer-events-none absolute left-6 bottom-6 h-6 w-6 border-l-2 border-b-2 border-slate-900" />
              <span className="pointer-events-none absolute right-6 bottom-6 h-6 w-6 border-r-2 border-b-2 border-slate-900 " />
              <div className="w-full max-w-xs text-slate-800 md:shrink-0">
                <div className="flex items-center gap-4 text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  <img
                    src={avatarSrc}
                    alt="CandieCore 头像"
                    className="h-10 w-10 md:h-16 md:w-16 rounded-full object-cover border border-slate-300"
                  />
                  CandieCore
                </div>
                <div className="mt-4 text-base text-slate-500 sm:mt-6 sm:text-lg">
                  Love Creating ｜ althorchxr@gmail.com
                </div>
                <div className="mt-6 flex flex-col gap-3 font-mono sm:mt-14 sm:gap-6 lg:mt-20">
                  {profileLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex w-full items-center gap-3 text-sm text-slate-900 transition-colors sm:w-auto sm:text-base sm:text-slate-500 sm:hover:text-slate-900"
                    >
                      <span className="relative inline-flex w-full items-center justify-start gap-2 whitespace-nowrap pb-1 sm:w-72 lg:w-80">
                        <span className="absolute bottom-0 left-0 h-px w-full bg-slate-500 transition-all duration-300 sm:w-0 sm:group-hover:w-full" />
                        <span className="relative text-left">{link.label}</span>
                        <span className="ml-auto opacity-100 translate-x-0 transition-all duration-300 sm:opacity-0 sm:translate-x-1 sm:group-hover:opacity-100 sm:group-hover:translate-x-0">
                          {link.icon}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
                <div className="mt-4 md:mt-8 flex items-center gap-2 text-xs uppercase  text-slate-500">
                  <span>Favorite Stack / Tool</span>
                  <ArrowDown className="h-4 w-4" />
                </div>
              </div>
              
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-88 w-full max-w-xs md:max-w-xl z-10 h-56 transform md:left-8 md:translate-x-0 lg:left-16 md:bottom-12 md:pointer-events-auto">
                <FallingText
                  text="React TailwindCSS TanstackStart Codex PostgreSQL AfterEffects Figma "
                  highlightClass="highlighted"
                  trigger="auto"
                  backgroundColor="transparent"
                  wireframes={false}
                  gravity={0.56}
                  chaosFactor={1.5}
                  fontSize="clamp(0.875rem,3vw,1.9rem)"
                  mouseConstraintStiffness={0.9}
                />
              </div>

              <div className="flex w-full items-center justify-center gap-3 overflow-x-auto min-h-76 md:flex-1 md:items-start sm:gap-4 sm:min-h-120 lg:min-h-140">
                {accordionItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={` relative h-76 rounded-none overflow-hidden cursor-pointer bg-muted transition-all duration-700 ease-in-out sm:h-120 lg:h-140 ${
                      index === activeIndex
                        ? 'w-[16rem] sm:w-88 lg:w-100'
                        : 'w-12 sm:w-16 lg:w-15'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (index === activeIndex) {
                        window.location.href = item.link;
                      } else {
                        setActiveIndex(index);
                      }
                    }}
                  >
                    <div className={`absolute inset-0 z-0 ${item.bgClass}`} />
                    <div className="absolute inset-0 z-10 bg-black/10 pointer-events-none" />
                    <span
                      className={`absolute z-20 left-1/2 -translate-x-1/2 text-2xl font-bold text-white whitespace-nowrap transition-all duration-300 sm:text-3xl lg:text-4xl ${
                        index === activeIndex
                          ? 'bottom-6 rotate-0'
                          : 'bottom-16 rotate-90 sm:bottom-24'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
