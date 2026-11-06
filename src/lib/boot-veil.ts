/**
 * Dismisses the first-paint loader veil.
 *
 * The veil *is* the first screen: it covers the page until fonts, critical
 * images, Astro islands, and (on the homepage) the profile-card stage pose are
 * ready. Only then does it fade out and fire `bakkac:boot-ready` so intro
 * animations can start on a fully painted scene.
 *
 * Layout also inlines the same MAX_WAIT ceiling so a late module download
 * cannot leave the visitor stuck before this file runs.
 */

/** Hard ceiling so a slow network can never leave the page covered forever. */
const MAX_WAIT = 4000;

/** Give the compositor a beat to paint the fully-hidden state before teardown. */
const CLEANUP_DELAY = 360;

/** Brief pause after fonts settle so the real face paints under the veil. */
const FONT_SETTLE_DELAY = 80;

export const BOOT_STAGE_ARMED = 'bakkac:stage-armed';
export const BOOT_READY = 'bakkac:boot-ready';

function waitForEvent(name: string): Promise<void> {
  return new Promise((resolve) => {
    document.addEventListener(name, () => resolve(), { once: true });
  });
}

function waitForAstroPageLoad(): Promise<void> {
  return new Promise((resolve) => {
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
}

async function waitForFonts(): Promise<void> {
  if (!document.fonts) return;

  await Promise.all([
    document.fonts.load('58px "DIN 2014"').catch(() => undefined),
    document.fonts.load('500 58px "Outfit"').catch(() => undefined),
    document.fonts.load('16px "Outfit"').catch(() => undefined),
  ]);
  await document.fonts.ready;
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, FONT_SETTLE_DELAY);
  });
}

function collectCriticalImageUrls(): string[] {
  const urls = new Set<string>();

  for (const link of document.querySelectorAll<HTMLLinkElement>(
    'link[rel="preload"][as="image"]',
  )) {
    if (link.href) urls.add(link.href);
  }

  for (const img of document.querySelectorAll<HTMLImageElement>(
    'img[data-boot-critical]',
  )) {
    const src = img.currentSrc || img.src;
    if (src) urls.add(src);
  }

  return [...urls];
}

async function decodeImageUrl(url: string): Promise<void> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    if (typeof img.decode === 'function') {
      await img.decode();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
    });
  } catch {
    // Missing or corrupt assets must not pin the veil.
  }
}

async function waitForCriticalImages(): Promise<void> {
  const urls = collectCriticalImageUrls();
  if (!urls.length) return;
  await Promise.all(urls.map(decodeImageUrl));
}

/**
 * Build parks the main stylesheet on `media="print"` so it is not
 * render-blocking. Promote any still-parked sheets and wait until each link
 * either has a CSSOM or has failed — otherwise the veil can lift onto an
 * unstyled page if `window.load` races the print→all flip.
 */
function waitForScreenStylesheets(): Promise<void> {
  const links = [
    ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
  ];
  if (!links.length) return Promise.resolve();

  return Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          const settle = () => {
            if (link.media === 'print') link.media = 'all';
            resolve();
          };

          if (link.sheet) {
            settle();
            return;
          }

          link.addEventListener('load', settle, { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}

/**
 * Homepage ProfileCard dispatches `bakkac:stage-armed` once the folded intro
 * pose is committed. Other pages never fire it — race a short microtask poll
 * so we only wait when a listener is expected (an island that will arm).
 */
function waitForStageArmedIfNeeded(): Promise<void> {
  // If something already armed before this module ran, proceed.
  if (document.documentElement.dataset.bootStageArmed === '1') {
    return Promise.resolve();
  }

  // Only the homepage mounts a stage that arms. Detect via the profile card
  // root (SSR markup) so collection pages do not wait forever.
  const needsStage = Boolean(document.getElementById('profile-card-panel'));
  if (!needsStage) return Promise.resolve();

  return waitForEvent(BOOT_STAGE_ARMED);
}

function waitUntilReady(): Promise<void> {
  const ready = (async () => {
    // Fonts + any SSR/preload images + async CSS can start immediately.
    const fonts = waitForFonts();
    const styles = waitForScreenStylesheets();
    const earlyImages = waitForCriticalImages();
    await waitForAstroPageLoad();
    // Hydrated islands may have added more `data-boot-critical` marks.
    await Promise.all([
      fonts,
      styles,
      earlyImages,
      waitForCriticalImages(),
      waitForStageArmedIfNeeded(),
    ]);
  })();

  return Promise.race([
    ready,
    new Promise<void>((resolve) => window.setTimeout(resolve, MAX_WAIT)),
  ]);
}

export function dismissBootVeil(): void {
  const veil = document.querySelector<HTMLElement>('.boot-veil');
  if (!veil || veil.dataset.bootVeilState === 'done') return;

  waitUntilReady().then(
    () => {
      veil.dataset.bootVeilState = 'done';
      document.dispatchEvent(new CustomEvent(BOOT_READY));
      window.setTimeout(() => veil.remove(), CLEANUP_DELAY);
    },
    () => {
      veil.dataset.bootVeilState = 'done';
      document.dispatchEvent(new CustomEvent(BOOT_READY));
      window.setTimeout(() => veil.remove(), CLEANUP_DELAY);
    },
  );
}
