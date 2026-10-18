import { useEffect, useRef, useState } from 'react';
import type { ComponentPropsWithRef } from 'react';
import type { PaperTexture as PaperTextureComponent } from '@paper-design/shaders-react';

/** The shader components render their own element type; derive it from `ref`. */
type ShaderElement = NonNullable<ComponentPropsWithRef<typeof PaperTextureComponent>['ref']> extends
  React.Ref<infer T>
  ? T
  : never;

/**
 * Reveals a shader canvas only once it has actually painted.
 *
 * `PaperTexture` mounts a WebGL canvas that is blank until its first frame, so
 * without this the texture pops in abruptly — very visible on a route change,
 * where the rest of the page is already painted. We start the element at
 * opacity 0 and flip it on after the first animation frame following mount,
 * which is when the shader has drawn at least once.
 *
 * Returns a ref to attach to the shader element and whether it is revealed.
 */
export function usePaperTextureReveal() {
  const ref = useRef<ShaderElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let settled = false;

    const reveal = () => {
      if (settled) return;
      settled = true;
      setRevealed(true);
    };

    // Two frames: the first lets the shader compile and draw, the second runs
    // after that draw has been committed to the canvas.
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(reveal);
    });

    // Never leave the texture invisible if the frames never run (background
    // tab, throttled rAF).
    const fallback = window.setTimeout(reveal, 600);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, []);

  return { ref, revealed };
}
