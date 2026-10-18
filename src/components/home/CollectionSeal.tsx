import type { ReactNode } from 'react';

type SealVariant = 'notes' | 'thoughts' | 'posts';

interface CollectionSealProps {
  label: string;
  variant: SealVariant;
}

const SEAL_STYLES: Record<
  SealVariant,
  {
    accent: string;
    icon: ReactNode;
  }
> = {
  notes: {
    accent: '#5C96DB',
    icon: (
      <svg viewBox="0 0 256 256" aria-hidden="true" className="h-16 w-16 fill-current">
        <path d="M221.28,34.75a64,64,0,0,0-90.49,0L60.69,104A15.9,15.9,0,0,0,56,115.31v73.38L26.34,218.34a8,8,0,0,0,11.32,11.32L67.32,200H140.7A15.92,15.92,0,0,0,152,195.32l0,0,69.23-70A64,64,0,0,0,221.28,34.75ZM142.07,46.06A48,48,0,0,1,211.79,112H155.33l34.35-34.34a8,8,0,0,0-11.32-11.32L120,124.69V67.87ZM72,115.35l32-31.67v57l-32,32ZM140.7,184H83.32l56-56h56.74Z" />
      </svg>
    ),
  },
  thoughts: {
    accent: '#D9AA16',
    icon: (
      <svg viewBox="0 0 256 256" aria-hidden="true" className="h-16 w-16 fill-current">
        <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM51.31,160,136,75.31,152.69,92,68,176.68ZM48,179.31,76.69,208H48Zm48,25.38L79.31,188,164,103.31,180.69,120Zm96-96L147.31,64l24-24L216,84.68Z" />
      </svg>
    ),
  },
  posts: {
    accent: '#E85B61',
    icon: (
      <svg viewBox="0 0 256 256" aria-hidden="true" className="h-16 w-16 fill-current">
        <path d="M231.65,194.55,198.46,36.75a16,16,0,0,0-19-12.39L132.65,34.42a16.08,16.08,0,0,0-12.3,19l33.19,157.8A16,16,0,0,0,169.16,224a16.25,16.25,0,0,0,3.38-.36l46.81-10.06A16.09,16.09,0,0,0,231.65,194.55ZM136,50.15c0-.06,0-.09,0-.09l46.8-10,3.33,15.87L139.33,66Zm6.62,31.47,46.82-10.05,3.34,15.9L146,97.53Zm6.64,31.57,46.82-10.06,13.3,63.24-46.82,10.06ZM216,197.94l-46.8,10-3.33-15.87L212.67,182,216,197.85C216,197.91,216,197.94,216,197.94ZM104,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V48A16,16,0,0,0,104,32ZM56,48h48V64H56Zm0,32h48v96H56Zm48,128H56V192h48v16Z" />
      </svg>
    ),
  },
};

function createBurstPoints(pointCount: number, innerRadius: number, outerRadius: number) {
  const totalPoints = pointCount * 2;
  const center = 160;

  return Array.from({ length: totalPoints }, (_, index) => {
    const angle = (Math.PI * 2 * index) / totalPoints - Math.PI / 2;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

const outerBurstPoints = createBurstPoints(34, 132, 149);
const innerBurstPoints = createBurstPoints(34, 118, 129);

export function CollectionSeal({ label, variant }: CollectionSealProps) {
  const { accent, icon } = SEAL_STYLES[variant];

  return (
    <div className="relative h-35 w-35 sm:h-38 sm:w-38">
      <svg viewBox="0 0 320 320" aria-hidden="true" className="h-full w-full">
        <polygon
          points={outerBurstPoints}
          fill="white"
          stroke={accent}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <polygon
          points={innerBurstPoints}
          fill="white"
          stroke={accent}
          strokeOpacity="0.55"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center" style={{ color: accent }}>
          {icon}
        </div>
      </div>

      <div className="absolute left-1/2 top-[67%] z-20 w-[6.8rem] -translate-x-1/2">
        <div className="rounded-[0.2rem] border border-white/70 bg-[#EEF6FF] px-3 py-1 shadow-[0_10px_18px_rgba(15,23,42,0.10)]">
          <div className="font-sans text-center text-[0.78rem] font-medium tracking-[0.01em] text-slate-900">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
