import { useEffect, useRef, useState, type TransitionEvent } from 'react';

import { useProfileLabelTransform } from '../../lib/profile-label-transform';
import { withBase } from '../../lib/site-taxonomy';
import FallingText from '../FallingText';
import Noise from '../ui/Noise';
import { ProfileLabel } from './ProfileLabel';
import { ProfileIllustration } from './ProfileIllustration';

import { PostMark } from './PostMark';

interface ProfileCardProps {
  baseUrl: string;
  onFoldChange?: (folded: boolean) => void;
}

/**
 * One shared wash keeps every panel's brush language identical. The PNG already
 * carries its own transparency, so it is composited directly over the tint.
 */
const BRUSH_WASH_URL = `${import.meta.env.BASE_URL}vectors/brushfootage.png`;

/**
 * The colour-changing accent lives only on the `BLOG` badge: a full-bleed
 * colour band gave the card a strong contrast but broke its coordination, and
 * the same hue on a patch this small reads as an intentional highlight. The fill
 * keeps the open accordion's own hue and chroma, so the black lettering stays
 * legible on all three. Stated in `oklch` because lightness is the knob each
 * hue needs its own value for: yellow reads darker than red or blue at the same
 * number, so it carries an override.
 */
const ACCENT_TINT_LIGHTNESS = '68%';
/** Yellow reads a step darker than the other two at the same lightness. */
const ACCENT_TINT_LIGHTNESS_YELLOW = '78%';
const accentTint = (tint: { hue: string; chroma: string; lightness?: string }) =>
  `oklch(${tint.lightness ?? ACCENT_TINT_LIGHTNESS} ${tint.chroma} ${tint.hue})`;

/**
 * Fakes a paperclip clamped onto the panel's top edge: the back wires are
 * omitted below the rim so the rectangle appears to cut through the loop.
 */
function AccordionPaperclip({ clipId }: { clipId: string }) {
  const shadowId = `paperclip-front-shadow-${clipId}`;
  const metalId = `paperclip-metal-${clipId}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 80"
      /*
        Rim is y=22 → 27.5% of the viewBox. Lift to that rim, then tilt around
        the rim itself so the clamp stays planted on the panel edge while the
        body leans a little.
      */
      className="pointer-events-none absolute left-1 top-0 z-40 h-14 w-7 md:left-1.5 md:h-16 md:w-8"
      style={{ transform: 'translateY(-27.5%) rotate(14deg)', transformOrigin: '50% 27.5%' }}
      fill="none"
      overflow="visible"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <filter
          id={shadowId}
          x="-50%"
          y="-40%"
          width="200%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0.35" dy="0.9" stdDeviation="0.65" floodColor="rgba(0,0,0,0.34)" />
        </filter>
        {/* Cool steel grey — bright white reads as a UI icon on the tinted panels. */}
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4c8ce" />
          <stop offset="42%" stopColor="#8e949c" />
          <stop offset="100%" stopColor="#6b717a" />
        </linearGradient>
      </defs>

      {/*
        Rim is y=22. Outer loop stays continuous across the rim (no floating gap).
        Only the short inner tip is cut at the rim — that wire continues behind
        the panel and is omitted below.
      */}
      {/* Outer loop: one continuous stroke — crosses the rim with no break. */}
      <g filter={`url(#${shadowId})`} stroke={`url(#${metalId})`} strokeWidth="2.7">
        <path d="M10 13.5 C10 4.8 30 4.8 30 13.5 V57 C30 69.5 10 69.5 10 57 V13.5" />
      </g>
      <g stroke="#e5e7eb" strokeWidth="0.9" opacity="0.68">
        <path d="M10.9 14 C11.2 6.2 28.8 6.2 29.1 14 V56.2 C28.8 67.6 11.2 67.6 10.9 56.2 V14" />
      </g>

      {/* Inner tip stops on the rim; its continuation stays behind the panel. */}
      <g stroke={`url(#${metalId})`} strokeWidth="2.7">
        <path d="M15 22 V16 C15 10.1 25 10.1 25 16 V22" />
      </g>
      <g stroke="#e5e7eb" strokeWidth="0.9" opacity="0.7">
        <path d="M15.85 21.4 V16.3 C16 11.2 24 11.2 24.15 16.3 V21.4" />
      </g>
    </svg>
  );
}

/**
 * Hit target for the dog-ear. Open state sits on the top-left notch; folded
 * state moves to the residual sheet's top-right (the back-face unfold mark).
 */
function DogEarHit({
  folded,
  onToggle,
}: {
  folded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={!folded}
      aria-controls="profile-card-panel"
      aria-label={folded ? '展开名片' : '对折名片'}
      onClick={onToggle}
      className={`absolute top-0 z-50 cursor-pointer border-0 bg-transparent p-0 ${
        folded ? 'right-0 left-auto' : 'left-0'
      }`}
      style={{
        width: 'var(--cut-size)',
        height: 'var(--cut-size)',
      }}
    />
  );
}

type DogEarCorner = 'top-left' | 'top-right';

/** Unfold-ear peel duration; keep in sync with `.profile-card-dog-ear-*` CSS. */
const DOG_EAR_MS = 520;
/** Card flip duration; keep in sync with `.profile-card-fold` transform. */
const FOLD_MS = 820;
/** Leaf fade after unfold lands; keep in sync with `.profile-card-fold` opacity. */
const LEAF_FADE_MS = 160;
/** Dwell on the folded ear before the load-time unfold demo. */
const INTRO_HOLD_MS = 720;

/**
 * Small folded tip. Size is CSS-driven (0 → --cut-size) from the corner so the
 * crease marches diagonally as the square grows. Top-left uses `--left-ear-open`;
 * top-right uses `--ear-open`.
 */
function DogEarMark({ corner, className = '' }: { corner: DogEarCorner; className?: string }) {
  const isTopLeft = corner === 'top-left';

  return (
    <>
      <span
        aria-hidden="true"
        className={`profile-card-dog-ear-tip pointer-events-none absolute top-0 z-40 ${
          isTopLeft
            ? 'profile-card-dog-ear-tip--top-left left-0'
            : 'profile-card-dog-ear-tip--top-right right-0'
        } ${className}`}
        style={{
          // Tip that remains on the sheet (not the cutout that reveals below).
          clipPath: isTopLeft
            ? 'polygon(100% 0, 100% 100%, 0 100%)'
            : 'polygon(0 0, 100% 100%, 0 100%)',
          background: '#fff',
        }}
      />
      <svg
        className={`profile-card-dog-ear-crease pointer-events-none absolute top-0 z-40 text-zinc-300 ${
          isTopLeft
            ? 'profile-card-dog-ear-crease--top-left left-0'
            : 'profile-card-dog-ear-crease--top-right right-0'
        }`}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path
          d={isTopLeft ? 'M0 100 L100 0 L100 100 Z' : 'M0 0 L100 100 L0 100 Z'}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  );
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ProfileCard({ baseUrl, onFoldChange }: ProfileCardProps) {
  const [folded, setFolded] = useState(false);
  /*
    After the 3D leaf lands, raise the residual sheet and peel the top-right
    unfold ear open. Peek stays correct without punching a hole through
    preserve-3d (which would composite to the page paper and kill the peel).
  */
  const [foldSettled, setFoldSettled] = useState(false);
  /** Top-right unfold ear (after the card lands folded). */
  const [earOpen, setEarOpen] = useState(false);
  /** Top-left open-state ear (mirrored grow; open while the card is expanded). */
  const [leftEarOpen, setLeftEarOpen] = useState(true);
  /*
    While the reverse flip runs, keep the live sheet clipped to the right half
    so the full card does not flash underneath the swinging leaf.
  */
  const [holdRightHalf, setHoldRightHalf] = useState(false);
  /** Hide until we know whether to mount folded for the intro (avoids a flash). */
  const [stageReady, setStageReady] = useState(false);
  /** Load-time unfold demo is driving the ear / fold — ignore user toggles. */
  const [introPlaying, setIntroPlaying] = useState(false);
  /** Snap into folded pose without playing the fold transition. */
  const [foldInstant, setFoldInstant] = useState(false);
  /*
    FallingText stays mounted through the fold flip and only unmounts once the
    card has landed folded — avoids a pop-out the moment the user clicks fold.
  */
  const [fallingActive, setFallingActive] = useState(false);
  const earTimerRef = useRef<number | null>(null);
  const introTimerRef = useRef<number | null>(null);
  const beginUnfoldRef = useRef<() => void>(() => {});
  const [activeIndex, setActiveIndex] = useState(2);
  const labelTransform = useProfileLabelTransform();
  const fallingLabels = [
    'UI/UX',
    'AI Agent',
    'Motion',
    'Fullstack Dev',
    'Graphic Designer',
    'Product Engineer',
    'Anime',
    'GalGame',
    'Manga',
    'Ranobe',
    'Movie',
  ];
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    weekday: 'short',
  }).formatToParts(now);
  const getDatePart = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((part) => part.type === type)?.value ?? '';
  const monthLabel = getDatePart('month');
  const dayLabel = getDatePart('day');
  const yearLabel = getDatePart('year');
  const weekdayLabel = getDatePart('weekday');

  const accordionItems = [
    {
      id: 1,
      title: 'Notes',
      captions: ['Tech Notes', 'Learning Record'],
      captionArt: `${baseUrl}vectors/home-notes-label.svg`,
      topicArt: `${baseUrl}vectors/home-notes-topic.svg`,
      bgClass: 'bg-blue-500/80',
      /** Hue and chroma of `blue-500`. */
      tint: { hue: '259.8', chroma: '0.188' },
      art: `${baseUrl}vectors/notes-cover.svg`,
      link: withBase(baseUrl, '/notes'),
    },
    {
      id: 2,
      title: 'Thoughts',
      captions: ['Musings', 'Domain Articales'],
      captionArt: `${baseUrl}vectors/home-thoughts-label.svg`,
      topicArt: `${baseUrl}vectors/home-thoughts-topic.svg`,
      bgClass: 'bg-yellow-400/80',
      /** Hue and chroma of `yellow-400`. */
      tint: { hue: '91.9', chroma: '0.173', lightness: ACCENT_TINT_LIGHTNESS_YELLOW },
      art: `${baseUrl}vectors/london-new-york-flight.svg`,
      link: withBase(baseUrl, '/thoughts'),
    },
    {
      id: 3,
      title: 'Posts',
      captions: ['life Memos', 'Immsaneous Diaries'],
      captionArt: `${baseUrl}vectors/home-posts-label.svg`,
      topicArt: `${baseUrl}vectors/home-posts-topic.svg`,
      bgClass: 'bg-red-500/80',
      /** Hue and chroma of `red-500`. */
      tint: { hue: '25.3', chroma: '0.208' },
      art: `${baseUrl}vectors/brockmann.svg`,
      link: withBase(baseUrl, '/posts'),
    },
  ];

  const activeTint = accordionItems[activeIndex].tint;

  const clearEarTimer = () => {
    if (earTimerRef.current != null) {
      window.clearTimeout(earTimerRef.current);
      earTimerRef.current = null;
    }
  };

  const clearIntroTimer = () => {
    if (introTimerRef.current != null) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearEarTimer();
      clearIntroTimer();
    },
    [],
  );

  useEffect(() => {
    onFoldChange?.(folded);
  }, [folded, onFoldChange]);

  useEffect(() => {
    if (!folded) {
      setFoldSettled(false);
      setEarOpen(false);
      return;
    }
    setLeftEarOpen(false);
    // Intro owns settle / ear timing after the instant folded snap.
    if (introPlaying) return;
    // Reduced-motion skips the transform transition, so settle immediately.
    if (prefersReducedMotion()) {
      setFoldSettled(true);
      return;
    }
    // Fallback if transitionend is missed (tab backgrounded, etc.).
    const timer = window.setTimeout(() => setFoldSettled(true), 900);
    return () => window.clearTimeout(timer);
  }, [folded, introPlaying]);

  useEffect(() => {
    if (!foldSettled) {
      setEarOpen(false);
      return;
    }
    // Intro grows the right ear on its own schedule.
    if (introPlaying) return;
    if (prefersReducedMotion()) {
      setEarOpen(true);
      return;
    }
    // Next frame so the closed-ear clip-path paints before we open it.
    const id = window.requestAnimationFrame(() => setEarOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, [foldSettled, introPlaying]);

  // Start FallingText only once the sheet is fully open after intro/unfold.
  useEffect(() => {
    if (!stageReady || introPlaying) return;
    if (!folded && !holdRightHalf && leftEarOpen) {
      setFallingActive(true);
    }
  }, [stageReady, introPlaying, folded, holdRightHalf, leftEarOpen]);

  // Keep it through the fold flip; drop only after the card has landed folded.
  useEffect(() => {
    if (foldSettled) setFallingActive(false);
  }, [foldSettled]);

  const finishUnfoldReveal = () => {
    // Reveal the full sheet under the still-opaque landed leaf, then open the
    // left ear after the leaf has faded — avoids a pop flash on the left half.
    setHoldRightHalf(false);
    clearEarTimer();
    if (prefersReducedMotion()) {
      setLeftEarOpen(true);
      return;
    }
    earTimerRef.current = window.setTimeout(() => setLeftEarOpen(true), LEAF_FADE_MS);
  };

  const beginUnfold = () => {
    setHoldRightHalf(true);
    setFoldSettled(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFolded(false));
    });
    // Fallback if transitionend is missed (transitionend also calls this).
    clearEarTimer();
    if (prefersReducedMotion()) {
      finishUnfoldReveal();
      return;
    }
    earTimerRef.current = window.setTimeout(finishUnfoldReveal, FOLD_MS);
  };
  beginUnfoldRef.current = beginUnfold;

  const beginFold = () => {
    setFolded(true);
  };

  const toggleFold = () => {
    if (introPlaying) return;
    clearEarTimer();
    if (folded) {
      // Close the top-right ear first, then reverse the card flip.
      if (earOpen && !prefersReducedMotion()) {
        setEarOpen(false);
        earTimerRef.current = window.setTimeout(beginUnfold, DOG_EAR_MS);
        return;
      }
      beginUnfold();
      return;
    }
    // Close the top-left ear first, then start the card flip.
    if (leftEarOpen && !prefersReducedMotion()) {
      setLeftEarOpen(false);
      earTimerRef.current = window.setTimeout(beginFold, DOG_EAR_MS);
      return;
    }
    beginFold();
  };

  // Every load: mount already folded with the right ear open, then auto-unfold.
  useEffect(() => {
    let cancelled = false;

    if (prefersReducedMotion()) {
      setStageReady(true);
      return;
    }

    // Skip the folded-ear grow — start from "ear already peeled".
    setFoldInstant(true);
    setLeftEarOpen(false);
    setEarOpen(true);
    setFoldSettled(true);
    setFolded(true);
    setIntroPlaying(true);
    setStageReady(true);

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        setFoldInstant(false);
        introTimerRef.current = window.setTimeout(() => {
          setEarOpen(false);
          introTimerRef.current = window.setTimeout(() => {
            beginUnfoldRef.current();
            introTimerRef.current = window.setTimeout(() => {
              setIntroPlaying(false);
            }, FOLD_MS + LEAF_FADE_MS + 40);
          }, DOG_EAR_MS);
        }, INTRO_HOLD_MS);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      clearIntroTimer();
    };
  }, []);

  const handleFoldTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return;
    if (event.target !== event.currentTarget) return;
    if (folded) {
      setFoldSettled(true);
      return;
    }
    clearEarTimer();
    finishUnfoldReveal();
  };

  const renderCardInterior = (opts: { motion: boolean; clipPrefix: string; showIllustration?: boolean }) => (
    <>
          <DogEarMark corner="top-left" />
          {/* Wordmark rides with the sheet so it folds away instead of lingering on the page. */}
          <PostMark className="pointer-events-none absolute left-22 top-4 z-20 w-28 translate-x-0 text-slate-900 sm:left-26 sm:top-6 sm:w-32 md:left-28 md:top-5 md:w-32 lg:left-36 lg:top-8 lg:w-44" />
      <span className="pointer-events-none absolute right-6 top-6 z-30 h-6 w-6 border-r-2 border-t-2 border-slate-900" />
      <span className="pointer-events-none absolute left-6 bottom-6 h-6 w-6 border-l-2 border-b-2 border-slate-900" />
      <span className="pointer-events-none absolute right-6 bottom-6 h-6 w-6 border-r-2 border-b-2 border-slate-900" />
      <div className="relative z-0 top-28 w-full md:top-32 md:max-w-xs text-black md:shrink-0">
        <div className="relative z-10 -mt-10 mb-20 flex flex-col items-start gap-2 md:absolute md:mt-0 md:-top-52 md:left-0 md:mb-0 md:w-[20rem] lg:-top-60 lg:w-104">
          <div className="max-w-xs md:max-w-60 lg:max-w-xs">
            <p className="text-xs pb-4 text-slate-800 md:text-xs md:leading-5 lg:text-sm lg:leading-6">
              我是马鹿🫎，对 全栈开发、设计、AI Agent 和各种知识都感兴趣。
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
          Today is a beautiful day
        </div>
        <div className="absolute z-0 inline-flex -translate-y-full items-center gap-1 pb-2 tracking-wider font-mono text-[10px]">
          {opts.showIllustration !== false ? (
            <ProfileIllustration
              baseUrl={baseUrl}
              className="pointer-events-none absolute z-0 aspect-316/211 h-auto w-36 translate-x-52 translate-y-2 md:w-[clamp(10rem,18vw,15rem)] md:translate-x-48 md:translate-y-2 lg:translate-x-88 lg:translate-y-2"
            />
          ) : null}
        </div>
        <div className="pointer-events-none absolute bottom-16 -left-12 h-20 w-[calc(100%+6rem)] bg-zinc-200 md:left-0 md:inset-y-0 md:h-auto md:w-[200vw]" />
        <div className="pointer-events-none absolute bottom-8 -left-12 h-8 w-[calc(100%+6rem)] overflow-hidden bg-zinc-100/55 md:-bottom-10 md:left-0 md:h-10 md:w-[200vw] lg:-bottom-20 lg:h-20" aria-hidden="true">
          <Noise patternRefreshInterval={0} patternAlpha={18} className="mix-blend-multiply opacity-30" />
        </div>
        <div className="relative z-10 flex justify-center md:block p-8">
          <ProfileLabel
            monthLabel={monthLabel}
            dayLabel={dayLabel}
            yearLabel={yearLabel}
            weekdayLabel={weekdayLabel}
            badgeFill={accentTint(activeTint)}
            transform={labelTransform}
            className="relative -top-7 -left-6 block h-20 w-76 max-w-full overflow-visible md:top-0 md:left-0 md:w-full"
          />
        </div>
      </div>

      {opts.motion && fallingActive ? (
        /*
          Armed after unfold; stays mounted for the whole fold flip and only
          clears once foldSettled — so clicking fold does not pop the words away.
        */
        <div
          className="pointer-events-none absolute bottom-76 -left-4 -right-4 z-20 h-56 md:bottom-0 md:left-8 md:right-8 md:h-48 lg:bottom-12 lg:left-16 lg:right-16 lg:h-56"
          aria-hidden="true"
        >
          <FallingText
            words={fallingLabels}
            highlightClass="highlighted"
            trigger="auto"
            gravity={0.56}
            chaosFactor={1.5}
            fontSize="clamp(0.75rem,2.2vw,1.9rem)"
            mouseConstraintStiffness={0.9}
            interactive={false}
          />
        </div>
      ) : null}

      {/* Mobile: pull past the card's own padding so the panels meet the corner marks. Width must grow with the negative margins, or `w-full` just shifts the box left. */}
      {/*
        `overflow-x-auto` forces the cross-axis to clip too, so paperclip tops
        would be shaved off. Reserve enough room for the tilted clip + shadow,
        then cancel it with a matching negative margin so parent height is unchanged.
      */}
      <div className="relative z-10 -mx-6 -mb-6 -mt-8 flex min-h-70 w-[calc(100%+3rem)] items-center justify-center gap-3 overflow-x-auto pt-8 md:mx-0 md:ml-auto md:mb-0 md:-mt-9 md:w-auto md:flex-1 md:items-start md:justify-end md:gap-4 md:min-h-120 md:pt-9 lg:min-h-140">
        {accordionItems.map((item, index) => (
          <div
            key={item.id}
            className={`relative h-70 cursor-pointer overflow-visible rounded-none bg-transparent backdrop-blur-md backdrop-saturate-150 transition-all duration-700 ease-in-out md:h-120 lg:h-140 ${
              index === activeIndex ? 'w-[16rem] md:w-88 lg:w-100' : 'w-12 md:w-16 lg:w-15'
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
            {/* Clip washes and art to the panel; the paperclip stays outside so its top loop can clear the rim. */}
            <div className="absolute inset-0 overflow-hidden">
              <div className={`absolute inset-0 z-0 ${item.bgClass}`} />
              <div
                className="pointer-events-none absolute inset-0 z-[1] bg-cover opacity-50 invert"
                style={{ backgroundImage: `url(${BRUSH_WASH_URL})` }}
              />
              <div className="pointer-events-none absolute inset-0 z-10 bg-black/10" />
              {/* `max-h-full` keeps the square art letterboxed inside the shorter mobile panel instead of being clipped. */}
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex aspect-square w-full items-center justify-center transition-opacity duration-700 ease-in-out ${
                  index === activeIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={item.art}
                  alt=""
                  className="h-full w-full object-contain"
                />
                {/*
                  Match `text.svg`: script topic sits under the caption block
                  (`TECH NOTES` / `LEARNING RECORD`), not behind the bottom title.
                */}
                <div className="pointer-events-none absolute left-[27%] top-[11.5%] z-30 w-[65%] isolate">
                  <img
                    src={item.topicArt}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -z-10 max-w-none select-none"
                    style={{
                      left: '-6%',
                      top: '-30%',
                      width: '150%',
                      height: '200%',
                      opacity: 1,
                    }}
                  />
                  <img
                    src={item.captionArt}
                    alt={item.captions.join(', ')}
                    className="relative z-10 block h-auto w-full"
                  />
                </div>
              </div>
              <span
                className={`pointer-events-none absolute left-[74%] top-[76%] z-30 whitespace-nowrap font-sans text-[10px] tracking-wider text-white transition-opacity duration-700 ease-in-out md:text-xs ${
                  index === activeIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                #{String(item.id).padStart(2, '0')}
              </span>
              {/*
                Collapsed-only script watermark: static upright-to-vertical pose,
                no rotate tween. Sized from panel height so expanding width does
                not enlarge it. Visible when collapsed, gone when expanded.
              */}
              <img
                src={item.topicArt}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute z-20 max-w-none select-none transition-opacity duration-700 ease-in-out"
                style={{
                  left: '100%',
                  top: '50%',
                  height: '16%',
                  width: 'auto',
                  transform: 'translateX(-50%) rotate(90deg)',
                  transformOrigin: 'center top',
                  filter: 'brightness(0.8) saturate(1.15)',
                  opacity: index === activeIndex ? 0 : 1,
                }}
              />
              <div
                className={`absolute left-1/2 z-30 -translate-x-1/2 transition-all duration-300 ${
                  index === activeIndex ? 'bottom-[8%] rotate-0 md:bottom-6' : 'bottom-[21%] rotate-90 md:bottom-24'
                }`}
              >
                <span className="relative z-10 whitespace-nowrap font-sans text-2xl font-bold text-white md:text-3xl lg:text-4xl">
                  {item.title}
                </span>
              </div>
            </div>
            <AccordionPaperclip clipId={`${opts.clipPrefix}${item.id}`} />
          </div>
        ))}
      </div>
    </>
  );

  return (
    /*
      Left-to-right fold: both halves share the same interior. The left leaf
      peels around the midline; after the flip the left stage is empty page
      background and the right stage is covered by the paper underside.
    */
    <div
      id="profile-card-panel"
      className={`profile-card-stage relative [perspective:1600px] ${
        stageReady ? '' : 'invisible'
      } ${folded ? 'profile-card-stage--folded' : ''} ${
        foldSettled ? 'profile-card-stage--underside-settled' : ''
      } ${earOpen ? 'profile-card-stage--ear-open' : ''} ${
        leftEarOpen ? 'profile-card-stage--left-ear-open' : ''
      } ${holdRightHalf ? 'profile-card-stage--hold-right-half' : ''} ${
        foldInstant ? 'profile-card-stage--fold-instant' : ''
      }`}
    >
      <DogEarHit folded={folded} onToggle={toggleFold} />

      {/* Residual sheet: under the leaf while flipping; ear-peek above after settle. */}
      <div className="profile-card-pane profile-card-pane--right" aria-hidden={folded}>
        <div className="profile-card-pane__content">
          <div className="profile-card-sheet relative flex w-full flex-col items-center gap-20 overflow-visible bg-white p-12 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-8 md:p-8 lg:gap-12 lg:p-16">
            {renderCardInterior({ motion: true, clipPrefix: 'sheet-', showIllustration: true })}
          </div>
        </div>
      </div>

      {/* Left folding leaf — stays mounted so the peel animation remains visible. */}
      <div
        className="profile-card-fold"
        aria-hidden="true"
        onTransitionEnd={handleFoldTransitionEnd}
      >
        <div className="profile-card-fold__face profile-card-fold__face--front">
          <div className="profile-card-pane__content">
            <div className="profile-card-sheet relative flex w-full flex-col items-center gap-20 overflow-visible bg-white p-12 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-8 md:p-8 lg:gap-12 lg:p-16">
              {renderCardInterior({
                motion: false,
                clipPrefix: 'fold-',
                showIllustration: !foldSettled,
              })}
            </div>
          </div>
        </div>
        <div className="profile-card-fold__face profile-card-fold__face--back">
          <DogEarMark corner="top-right" />
        </div>
      </div>
    </div>
  );
}
