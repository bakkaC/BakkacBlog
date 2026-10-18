import { useEffect, useState } from 'react';
import type { ComponentPropsWithoutRef, ComponentType, SVGProps } from 'react';

interface ProfileIllustrationProps extends ComponentPropsWithoutRef<'svg'> {}

type IllustrationComponent = ComponentType<SVGProps<SVGSVGElement>>;

// The composite is ~3.4MB of inline SVG. Keeping it out of the SSR payload and
// out of the island bundle keeps the home page's critical path small; the
// illustration fades in when the chunk lands.
let cachedIllustration: IllustrationComponent | null = null;
let inflight: Promise<IllustrationComponent> | null = null;

function loadIllustration(): Promise<IllustrationComponent> {
  if (cachedIllustration) return Promise.resolve(cachedIllustration);
  if (!inflight) {
    inflight = import('./CombinedIllustration').then((module) => {
      cachedIllustration = module.default;
      return cachedIllustration;
    });
  }
  return inflight;
}

/**
 * Scales the merged Paper composite so the bench matches the previous standalone
 * bench size. The offset keeps the ground plane aligned with the old layout.
 */
export function ProfileIllustration({ className }: ProfileIllustrationProps) {
  const [Illustration, setIllustration] = useState<IllustrationComponent | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadIllustration()
      .then((component) => {
        if (!cancelled) setIllustration(() => component);
      })
      .catch(() => {
        // Leave the composite absent rather than failing the whole card.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fade in on the next frame so the composite never pops into the finished card.
  useEffect(() => {
    if (!Illustration) return;
    const frame = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(frame);
  }, [Illustration]);

  return (
    <div className={`relative aspect-316/211 ${className ?? ''}`} aria-hidden="true">
      {Illustration ? (
        <Illustration
          className="pointer-events-none absolute max-w-none transition-opacity duration-700 ease-out"
          style={{
            left: '-29.4%',
            top: '-213.7%',
            width: '473.4%',
            height: 'auto',
            opacity: revealed ? 1 : 0,
          }}
        />
      ) : null}
    </div>
  );
}
