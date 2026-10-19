/**
 * Dismisses the first-paint loader veil.
 *
 * The veil markup and its visuals live in `src/layouts/Layout.astro` and
 * `src/styles/global.css`. This module only owns the timing: it waits until the
 * page is actually ready, then fades the veil out and tears it down.
 *
 * The veil is purely CSS (a static grain layer + a keyframe-animated dot), so
 * it does not run a JS animation loop and costs nothing while the page loads.
 */

/** Hard ceiling, so a slow network can never leave the page covered. */
const MAX_WAIT = 2600;

/** Give the compositor a beat to paint the fully-hidden state before teardown. */
const CLEANUP_DELAY = 360;

/**
 * Resolves when the page is plausibly painted and interactive.
 *
 * We wait on Astro's `astro:page-load`, which fires after the initial
 * `client:load` islands have hydrated — the home and collection pages are
 * client-rendered, so until that happens the page is still visibly settling.
 * `document.fonts.ready` is raced in because the display face comes from a
 * third-party CDN and a late swap under the veil would be jarring.
 */
function waitUntilReady(): Promise<void> {
  const fontsReady = document.fonts?.ready ?? Promise.resolve();

  const hydrated = new Promise<void>((resolve) => {
    // Astro dispatches this once the initial islands are up. If this script
    // runs after it already fired (module scripts can be late on a warm
    // cache), fall back to `load` instead of waiting forever.
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    document.addEventListener('astro:page-load', done, { once: true });

    if (document.readyState === 'complete') {
      // Let any queued `astro:page-load` listener run first, then settle.
      window.setTimeout(done, 0);
    } else {
      window.addEventListener('load', () => window.setTimeout(done, 0), {
        once: true,
      });
    }
  });

  return Promise.race([
    Promise.all([fontsReady, hydrated]).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, MAX_WAIT)),
  ]);
}

export function dismissBootVeil(): void {
  const veil = document.querySelector<HTMLElement>('.boot-veil');
  if (!veil || veil.dataset.bootVeilState === 'done') return;

  waitUntilReady().then(
    () => {
      veil.dataset.bootVeilState = 'done';
      window.setTimeout(() => veil.remove(), CLEANUP_DELAY);
    },
    () => {
      // `waitUntilReady` never rejects, but guard anyway.
      veil.dataset.bootVeilState = 'done';
      window.setTimeout(() => veil.remove(), CLEANUP_DELAY);
    },
  );
}
