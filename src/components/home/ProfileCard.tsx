import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TransitionEvent,
} from 'react';

import { BOOT_READY, BOOT_STAGE_ARMED } from '../../lib/boot-veil';
import { useProfileLabelTransform } from '../../lib/profile-label-transform';
import { withBase } from '../../lib/site-taxonomy';
import Noise from '../ui/Noise';
import type { HomeAccordionLatestByCollection } from './types';
import { ProfileLabel } from './ProfileLabel';
import { ProfileIllustration } from './ProfileIllustration';

import { PostMark } from './PostMark';

/** Physics text only arms after unfold — keep matter-js off the first paint. */
const FallingText = lazy(() => import('../FallingText'));

function signalStageArmed(): void {
  document.documentElement.dataset.bootStageArmed = '1';
  document.dispatchEvent(new CustomEvent(BOOT_STAGE_ARMED));
}

function waitForBootReady(): Promise<void> {
  const veil = document.querySelector<HTMLElement>('.boot-veil');
  if (!veil || veil.dataset.bootVeilState === 'done') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    document.addEventListener(BOOT_READY, () => resolve(), { once: true });
  });
}

/**
 * Uniform visual scale for the whole card (fonts, art, gaps, hit targets).
 * Keep desktop at 1 — non-1 `transform: scale` subpixel-rasters type and
 * makes accordion labels look soft. Prefer tighter padding/width if the card
 * ever needs to feel smaller again.
 */
const PROFILE_CARD_SCALE_DESKTOP = 1;
const PROFILE_CARD_SCALE_MOBILE = 1;
/** Matches Tailwind `md`. */
const PROFILE_CARD_SCALE_MQ = '(min-width: 768px)';
/** Mobile flip back — a hair darker than page paper (#f4f4f4), lighter than zinc-200. */
const PROFILE_CARD_MOBILE_BACK = '#f1f1f3';
/** Live profile card tilt (clockwise). */
const PROFILE_CARD_TILT_DEG = 1;
/** Gray underlay tilt (counter-clockwise) — a bit more than the live card. */
const PROFILE_UNDERLAY_TILT_DEG = 3;
/**
 * Room for the tilt AABB so rotated corners are not clipped by the height
 * shell. Sized for the larger underlay angle.
 */
const PROFILE_CARD_TILT_PAD_PX = 36;

interface ProfileCardProps {
  baseUrl: string;
  accordionLatest: HomeAccordionLatestByCollection;
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
  mode = 'fold',
}: {
  folded: boolean;
  onToggle: () => void;
  /** Desktop half-fold vs mobile full-card flip. */
  mode?: 'fold' | 'flip';
}) {
  const openLabel = mode === 'flip' ? '翻转名片' : '对折名片';
  const closedLabel = mode === 'flip' ? '翻回正面' : '展开名片';

  return (
    <button
      type="button"
      aria-expanded={!folded}
      aria-controls="profile-card-panel"
      aria-label={folded ? closedLabel : openLabel}
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
function DogEarMark({
  corner,
  className = '',
  tipColor = '#fff',
}: {
  corner: DogEarCorner;
  className?: string;
  /** Match the sheet this tip sits on (white front / grain back). */
  tipColor?: string;
}) {
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
          background: tipColor,
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

/** Quiet WIP stamp for card backs — leaves room for future back-face content. */
function ProfileCardBackWipMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-[72%] flex justify-center px-6 md:inset-0 md:top-auto md:h-full md:items-center ${className}`}
    >
      <span
        className="inline-flex items-center border border-dashed border-zinc-500/80 px-4 py-2 text-base font-medium text-black md:text-lg"
        style={{
          fontFamily:
            '"Songti SC", "Songti TC", "Noto Serif SC", "Source Han Serif SC", SimSun, serif',
        }}
      >
        WIP · 开发中
      </span>
    </div>
  );
}

export function ProfileCard({ baseUrl, accordionLatest, onFoldChange }: ProfileCardProps) {
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
  /** Unscaled card root; wrapper height is offsetHeight × cardScale. */
  const scaleRef = useRef<HTMLDivElement>(null);
  const [scaleLayoutHeight, setScaleLayoutHeight] = useState<number>();
  const [cardScale, setCardScale] = useState(PROFILE_CARD_SCALE_MOBILE);
  /** `md+` keeps the underlay stack + half-fold; below that is upright full-card flip. */
  const [isMdUp, setIsMdUp] = useState(false);
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
      latest: accordionLatest.notes,
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
      latest: accordionLatest.thoughts,
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
      latest: accordionLatest.posts,
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
    const media = window.matchMedia(PROFILE_CARD_SCALE_MQ);
    const sync = () => {
      setIsMdUp(media.matches);
      setCardScale(media.matches ? PROFILE_CARD_SCALE_DESKTOP : PROFILE_CARD_SCALE_MOBILE);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  /*
    `transform: scale` does not shrink layout box. Measure the unscaled card and
    pin the outer wrapper to scaled height so the latest-posts block sits snug.
  */
  useLayoutEffect(() => {
    const node = scaleRef.current;
    if (!node || !stageReady) return;

    const sync = () => {
      setScaleLayoutHeight(node.offsetHeight * cardScale);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [stageReady, folded, foldSettled, holdRightHalf, leftEarOpen, earOpen, cardScale, isMdUp]);

  useEffect(() => {
    // Mobile: keep foldSettled in lockstep; ear peels after the flip lands
    // (handleFoldTransitionEnd + fallback timer below).
    if (!isMdUp) {
      setFoldSettled(folded);
      if (!folded) {
        setEarOpen(false);
        return;
      }
      setLeftEarOpen(false);
      if (introPlaying) return;
      if (prefersReducedMotion()) {
        setEarOpen(true);
        return;
      }
      const timer = window.setTimeout(() => setEarOpen(true), FOLD_MS + 40);
      return () => window.clearTimeout(timer);
    }
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
  }, [folded, introPlaying, isMdUp]);

  useEffect(() => {
    if (!isMdUp) return;
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
  }, [foldSettled, introPlaying, isMdUp]);

  // Start FallingText only once the sheet is fully open after intro/unfold.
  useEffect(() => {
    if (!stageReady || introPlaying) return;
    if (!isMdUp) {
      if (!folded) setFallingActive(true);
      return;
    }
    if (!folded && !holdRightHalf && leftEarOpen) {
      setFallingActive(true);
    }
  }, [stageReady, introPlaying, folded, holdRightHalf, leftEarOpen, isMdUp]);

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
    if (!isMdUp) {
      setFolded(false);
      return;
    }
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
    if (!isMdUp) {
      if (folded) {
        // Close the back-face ear first, then flip to the front.
        if (earOpen && !prefersReducedMotion()) {
          setEarOpen(false);
          earTimerRef.current = window.setTimeout(beginUnfold, DOG_EAR_MS);
          return;
        }
        beginUnfold();
        return;
      }
      setLeftEarOpen(false);
      beginFold();
      return;
    }
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

  /*
    Boot sequence (under the loader veil, then after it lifts):
    1. Arm in useLayoutEffect — snap folded pose + clear `invisible` before
       the browser paints the hydrated frame (SSR starts invisible so the open
       pose cannot flash; without layout-phase arming the veil can lift onto a
       blank page).
    2. Play — once `bakkac:boot-ready` fires, run the unfold demo.
  */
  useLayoutEffect(() => {
    const md = window.matchMedia(PROFILE_CARD_SCALE_MQ).matches;
    setIsMdUp(md);
    setCardScale(md ? PROFILE_CARD_SCALE_DESKTOP : PROFILE_CARD_SCALE_MOBILE);

    if (prefersReducedMotion()) {
      setLeftEarOpen(true);
      setStageReady(true);
      signalStageArmed();
      return;
    }

    setFoldInstant(true);
    setLeftEarOpen(false);
    setFolded(true);
    setIntroPlaying(true);
    setEarOpen(true);
    setFoldSettled(true);
    setStageReady(true);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let cancelled = false;
    const md = window.matchMedia(PROFILE_CARD_SCALE_MQ).matches;

    const armFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        signalStageArmed();

        void waitForBootReady().then(() => {
          if (cancelled) return;
          setFoldInstant(false);
          introTimerRef.current = window.setTimeout(() => {
            setEarOpen(false);
            introTimerRef.current = window.setTimeout(() => {
              beginUnfoldRef.current();
              introTimerRef.current = window.setTimeout(
                () => {
                  setIntroPlaying(false);
                },
                md ? FOLD_MS + LEAF_FADE_MS + 40 : FOLD_MS + 40,
              );
            }, DOG_EAR_MS);
          }, INTRO_HOLD_MS);
        });
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(armFrame);
      clearIntroTimer();
    };
  }, []);

  const handleFoldTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return;
    if (event.target !== event.currentTarget) return;
    if (!isMdUp) {
      if (folded) {
        // Peel the back-face ear after the flip lands.
        requestAnimationFrame(() => setEarOpen(true));
        return;
      }
      setLeftEarOpen(true);
      return;
    }
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
          <Suspense fallback={null}>
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
          </Suspense>
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
                  {...(index === activeIndex ? { 'data-boot-critical': '' } : {})}
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
                    {...(index === activeIndex ? { 'data-boot-critical': '' } : {})}
                  />
                  <img
                    src={item.captionArt}
                    alt={item.captions.join(', ')}
                    className="relative z-10 block h-auto w-full"
                    {...(index === activeIndex ? { 'data-boot-critical': '' } : {})}
                  />
                </div>
              </div>
              {/*
                Mobile keeps only the # mark — the LATEST teaser needs the wider
                open panel and reads as clutter under ~768px. When a latest
                entry exists, hide this # from `md` up so the teaser owns it.
              */}
              <span
                className={`pointer-events-none absolute left-[74%] top-[76%] z-30 whitespace-nowrap font-sans text-[10px] text-white transition-opacity duration-700 ease-in-out md:text-xs ${
                  item.latest ? 'md:hidden' : ''
                } ${index === activeIndex ? 'opacity-100' : 'opacity-0'}`}
              >
                #{String(item.id).padStart(2, '0')}
              </span>
              {item.latest ? (
                <a
                  href={item.latest.href}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`最新：${item.latest.title}`}
                  className={`absolute inset-x-[8%] top-[72%] z-30 hidden overflow-hidden text-left text-white transition-opacity duration-300 ease-in-out md:block ${
                    /*
                      Full panel inset so the divider runs edge-to-edge. Nowrap +
                      truncate keep collapse from reflowing while the panel clips.
                    */
                    index === activeIndex
                      ? 'md:pointer-events-auto md:opacity-100'
                      : 'md:pointer-events-none md:opacity-0'
                  }`}
                >
                  <span className="flex w-full items-baseline justify-between gap-3 whitespace-nowrap border-b-2 border-dashed border-white/40 pb-1 text-white">
                    <span className="flex items-baseline gap-x-1 font-sans text-[9px] font-medium leading-none md:text-[10px]">
                      <span>LATEST</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.latest.dateLabel}</span>
                    </span>
                    <span className="shrink-0 font-sans text-[10px] leading-none md:text-xs">
                      #{String(item.id).padStart(2, '0')}
                    </span>
                  </span>
                  <span className="mt-2.5 flex min-w-0 items-center gap-2">
                    <span className="flex min-w-0 max-w-[58%] shrink items-center gap-1">
                      <span className="min-w-0 truncate text-[13px] font-semibold leading-none md:text-sm lg:text-[15px]">
                        {item.latest.title}
                      </span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="size-3.5 shrink-0 text-white md:size-4"
                      >
                        <path
                          d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {item.latest.tags.length > 0 ? (
                      <span className="min-w-0 flex-1 truncate text-right font-sans text-[9px] leading-none text-white md:text-[10px]">
                        {item.latest.tags.map((tag) => `#${tag}`).join(' · ')}
                      </span>
                    ) : null}
                  </span>
                </a>
              ) : null}
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
                  // Desktop: right-edge + origin-top keeps the pre-rotate pose.
                  // Mobile: center-rotate like the upright title, then 8px left
                  // so the topic script sits with the collapsed strip.
                  left: isMdUp ? '100%' : 'calc(50% - 8px)',
                  top: '50%',
                  height: '16%',
                  width: 'auto',
                  transform: isMdUp
                    ? 'translateX(-50%) rotate(90deg)'
                    : 'translate(-50%, -50%) rotate(90deg)',
                  transformOrigin: isMdUp ? 'center top' : 'center',
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

  const tiltPad = isMdUp ? PROFILE_CARD_TILT_PAD_PX * cardScale : 0;
  const shellHeight =
    scaleLayoutHeight == null ? undefined : scaleLayoutHeight + tiltPad * 2;
  const cardTiltDeg = isMdUp ? PROFILE_CARD_TILT_DEG : 0;

  const renderFrontSheet = (opts: {
    motion: boolean;
    clipPrefix: string;
    showIllustration?: boolean;
  }) => (
    <div className="profile-card-sheet relative flex w-full flex-col items-center gap-20 overflow-visible bg-white p-12 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-8 md:p-8 lg:gap-12 lg:p-16">
      {renderCardInterior(opts)}
    </div>
  );

  return (
    /*
      Scale shell (identity for now). Outer height still tracks measured size
      (+ tilt pad on desktop) so following sections clear the stack.
    */
    <div
      className="relative w-full overflow-visible"
      style={{ height: shellHeight, paddingTop: tiltPad }}
    >
      <div
        ref={scaleRef}
        className={`relative w-full origin-top ${stageReady ? '' : 'invisible'}`}
        style={{
          transform: `scale(${cardScale})`,
          transformOrigin: 'top center',
        }}
      >
        <div className="relative w-full">
          {/*
            Desktop only: underlay −3° under the live +1° card. Mobile drops the
            under-sheet and stays upright — the grain/lineart move to the flip back.
          */}
          {isMdUp ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 overflow-visible"
              style={{
                transform: `rotate(${-PROFILE_UNDERLAY_TILT_DEG}deg)`,
                transformOrigin: 'center center',
                /* drop-shadow follows the notched silhouette. */
                filter: 'drop-shadow(10px 14px 14px rgba(15, 23, 42, 0.22))',
              }}
            >
              {/*
                Static dog-ear sheet — same open left-ear polygon as the live card,
                no animation. Tip + crease are just the folded corner graphics.
              */}
              <div
                className="absolute inset-0 overflow-hidden bg-zinc-100"
                style={{
                  clipPath:
                    'polygon(var(--cut-size) 0, 100% 0, 100% 100%, 0 100%, 0 var(--cut-size))',
                }}
              >
                <Noise
                  patternRefreshInterval={0}
                  patternAlpha={22}
                  className="mix-blend-multiply opacity-40"
                />
                {/*
                  Line art on the under-sheet's left half — visible in the left
                  panel when the live card is folded away, and in tilt peeks.
                */}
                <img
                  src={`${baseUrl}vectors/home-underlay-lineart.png`}
                  alt=""
                  draggable={false}
                  width={758}
                  height={815}
                  decoding="async"
                  data-boot-critical=""
                  className="pointer-events-none absolute top-[8%] left-[3%] w-[56%] max-w-none select-none object-contain opacity-80 md:top-[6%] md:w-[50%] lg:w-[46%]"
                />
              </div>
              <span
                className="absolute top-0 left-0 z-10 bg-white"
                style={{
                  width: 'var(--cut-size)',
                  height: 'var(--cut-size)',
                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                }}
              />
              <svg
                className="absolute top-0 left-0 z-10 text-zinc-300"
                style={{ width: 'var(--cut-size)', height: 'var(--cut-size)' }}
                viewBox="0 0 100 100"
              >
                <path
                  d="M0 100 L100 0 L100 100 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          ) : null}

          {!isMdUp ? (
            /*
              Mobile: upright full-card Y-flip. Front is the live sheet; back is
              the former underlay grain with line art in the upper half.
            */
            <div
              id="profile-card-panel"
              className={`profile-card-mobile-flip relative z-10 ${
                leftEarOpen ? 'profile-card-stage--left-ear-open' : ''
              } ${earOpen ? 'profile-card-stage--ear-open' : ''} ${
                foldInstant ? 'profile-card-stage--fold-instant' : ''
              }`}
            >
              <div
                className={`profile-card-mobile-flip__inner ${folded ? 'is-flipped' : ''} ${
                  foldInstant ? 'is-instant' : ''
                }`}
                onTransitionEnd={handleFoldTransitionEnd}
              >
                <div
                  className="profile-card-mobile-flip__face profile-card-mobile-flip__face--front"
                  aria-hidden={folded}
                >
                  <DogEarHit folded={false} onToggle={toggleFold} mode="flip" />
                  {renderFrontSheet({
                    motion: true,
                    clipPrefix: 'sheet-',
                    showIllustration: true,
                  })}
                </div>
                <div
                  className="profile-card-mobile-flip__face profile-card-mobile-flip__face--back"
                  aria-hidden={!folded}
                >
                  {/*
                    Grain sheet clips a top-right notch as the ear opens. Tip
                    matches the back fill so there is no white triangle — only
                    the dashed crease + page showing through the cut.
                  */}
                  <div
                    className="profile-card-mobile-back-sheet absolute inset-0 overflow-hidden"
                    style={{ background: PROFILE_CARD_MOBILE_BACK }}
                  >
                    <Noise
                      patternRefreshInterval={0}
                      patternAlpha={22}
                      className="mix-blend-multiply opacity-40"
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[58%] items-start justify-center px-3 pt-3">
                      <img
                        src={`${baseUrl}vectors/home-underlay-lineart.png`}
                        alt=""
                        draggable={false}
                        width={758}
                        height={815}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full max-w-none select-none object-contain object-top opacity-80"
                      />
                    </div>
                    <ProfileCardBackWipMark />
                  </div>
                  <DogEarHit folded onToggle={toggleFold} mode="flip" />
                  <DogEarMark corner="top-right" tipColor={PROFILE_CARD_MOBILE_BACK} />
                </div>
              </div>
            </div>
          ) : (
            /*
              Left-to-right fold: both halves share the same interior. The left leaf
              peels around the midline; after the flip the left stage is empty page
              background and the right stage is covered by the paper underside.
            */
            <div
              className="relative z-10"
              style={{
                transform: `rotate(${cardTiltDeg}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <div
                id="profile-card-panel"
                className={`profile-card-stage relative [perspective:1600px] ${
                  folded ? 'profile-card-stage--folded' : ''
                } ${foldSettled ? 'profile-card-stage--underside-settled' : ''} ${
                  earOpen ? 'profile-card-stage--ear-open' : ''
                } ${leftEarOpen ? 'profile-card-stage--left-ear-open' : ''} ${
                  holdRightHalf ? 'profile-card-stage--hold-right-half' : ''
                } ${foldInstant ? 'profile-card-stage--fold-instant' : ''}`}
              >
                <DogEarHit folded={folded} onToggle={toggleFold} />

                {/* Residual sheet: under the leaf while flipping; ear-peek above after settle. */}
                <div className="profile-card-pane profile-card-pane--right" aria-hidden={folded}>
                  <div className="profile-card-pane__content">
                    {renderFrontSheet({
                      motion: true,
                      clipPrefix: 'sheet-',
                      showIllustration: true,
                    })}
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
                      {renderFrontSheet({
                        motion: false,
                        clipPrefix: 'fold-',
                        showIllustration: !foldSettled,
                      })}
                    </div>
                  </div>
                  <div className="profile-card-fold__face profile-card-fold__face--back">
                    <DogEarMark corner="top-right" />
                    <ProfileCardBackWipMark />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
