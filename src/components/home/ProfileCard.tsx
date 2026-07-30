import { useState } from 'react';

import { withBase } from '../../lib/site-taxonomy';
import FallingText from '../FallingText';
import { ProfileLabel } from './ProfileLabel';

interface ProfileCardProps {
  baseUrl: string;
}

export function ProfileCard({ baseUrl }: ProfileCardProps) {
  const [activeIndex, setActiveIndex] = useState(2);
  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(now);
  const dayLabel = String(now.getDate()).padStart(2, '0');
  const yearLabel = now.getFullYear();
  const weekdayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now);

  const accordionItems = [
    { id: 1, title: 'Notes', bgClass: 'bg-blue-400', link: withBase(baseUrl, '/notes') },
    { id: 2, title: 'Thoughts', bgClass: 'bg-yellow-300', link: withBase(baseUrl, '/thoughts') },
    { id: 3, title: 'Blogs', bgClass: 'bg-red-400', link: withBase(baseUrl, '/blog') },
  ];

  return (
    <div
      className="relative flex w-full flex-col items-center gap-20 overflow-visible bg-white p-12 sm:gap-8 sm:p-12 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-8 md:p-8 lg:gap-12 lg:p-16"
      style={{ clipPath: 'polygon(var(--cut-size) 0, 100% 0, 100% 100%, 0 100%, 0 var(--cut-size))' }}
    >
      <svg
        className="pointer-events-none absolute left-0 top-0 text-zinc-200"
        style={{ width: 'var(--cut-size)', height: 'var(--cut-size)' }}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path d="M0 100 L100 0 L100 100 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="pointer-events-none absolute right-6 top-6 h-6 w-6 border-r-2 border-t-2 border-slate-900" />
      <span className="pointer-events-none absolute left-6 bottom-6 h-6 w-6 border-l-2 border-b-2 border-slate-900" />
      <span className="pointer-events-none absolute right-6 bottom-6 h-6 w-6 border-r-2 border-b-2 border-slate-900" />
      <div className="relative z-0 top-28 w-full md:top-32 md:max-w-xs text-black md:shrink-0">
        <div className="relative z-10 -mt-10 mb-20 flex flex-col items-start gap-2 md:absolute md:mt-0 md:-top-52 md:left-0 md:mb-0 md:w-[20rem] lg:-top-60 lg:w-104">
          <div className="max-w-xs md:max-w-60 lg:max-w-xs">
            <p className="text-xs pb-4 text-slate-800 md:text-xs md:leading-5 lg:text-sm lg:leading-6">
              我是 Bakka，一名学生，对 全栈开发、设计、AI Agent 和各种知识都感兴趣。
              爱好是ACGN，音乐和影像，也会在这里记录我的思考。
            </p>
          </div>
          <a
            href="https://github.com/bakkaC"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[10px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z" />
            </svg>
            https://github.com/bakkaC
          </a>
          <div className="inline-flex items-center gap-1 tracking-wider font-mono text-[10px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 256 256"><path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"></path></svg>
            althorchxr@gmail.com
          </div>
        </div>
        <div className="absolute z-10 inline-flex -translate-y-full items-center gap-1 pb-2 tracking-wider font-mono text-[10px]">
          {yearLabel}-{weekdayLabel}
        </div>
        <div className="pointer-events-none absolute bottom-16 -left-12 h-20 w-[calc(100%+6rem)] bg-zinc-200 sm:bottom-18 sm:h-28 md:left-0 md:inset-y-0 md:h-auto md:w-[200vw]" />
        <div className="relative z-10 flex justify-center md:block p-8">
          <ProfileLabel
            monthLabel={monthLabel}
            dayLabel={dayLabel}
            className="relative -top-7 -left-6 block h-20 w-76 max-w-full overflow-visible md:top-1.5 md:left-0 md:w-full"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-88 -left-4 -right-4 z-20 h-56 md:pointer-events-auto md:bottom-0 md:left-8 md:right-8 md:h-48 lg:bottom-12 lg:left-16 lg:right-16 lg:h-56">
        <FallingText
          text="React TailwindCSS TanstackStart Codex PostgreSQL AfterEffects Figma Springboot Vite"
          highlightClass="highlighted"
          trigger="auto"
          gravity={0.56}
          chaosFactor={1.5}
          fontSize="clamp(0.75rem,2.2vw,1.9rem)"
          mouseConstraintStiffness={0.9}
        />
      </div>

      <div className="relative z-10 flex min-h-76 w-full items-center justify-center gap-3 overflow-x-auto md:ml-auto md:w-auto md:flex-1 md:items-start md:justify-end sm:gap-4 sm:min-h-120 lg:min-h-140">
        {accordionItems.map((item, index) => (
          <div
            key={item.id}
            className={`relative h-76 cursor-pointer overflow-hidden rounded-none bg-muted transition-all duration-700 ease-in-out sm:h-120 lg:h-140 ${
              index === activeIndex ? 'w-[16rem] sm:w-88 lg:w-100' : 'w-12 sm:w-16 lg:w-15'
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
            <div className="pointer-events-none absolute inset-0 z-10 bg-black/10" />
            <span
              className={`font-sans absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-2xl font-bold text-white transition-all duration-300 sm:text-3xl lg:text-4xl ${
                index === activeIndex ? 'bottom-6 rotate-0' : 'bottom-16 rotate-90 sm:bottom-24'
              }`}
            >
              {item.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
