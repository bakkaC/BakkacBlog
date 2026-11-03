import sharp from 'sharp';

/**
 * Procedural dry-brush wash for the accordion panels.
 *
 * The texture is black with alpha only: `mix-blend-multiply` in the card lets
 * each panel keep its Tailwind colour while the wash supplies painterly
 * tonal variation. The long dimension is proportional to the largest desktop
 * panel, and its 4x1-ish aspect lets `background-size: cover` scale it without
 * obvious directional stretching on narrow panels.
 */
const WIDTH = 1500;
const HEIGHT = 440;
const MAX_ALPHA = 0.33;

const hash = (x, y) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const smooth = (t) =>
  Math.min(Math.max(t, 0), 1) ** 2 * (3 - 2 * Math.min(Math.max(t, 0), 1));

const noise = (x, y) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  return (
    hash(x0, y0) * (1 - tx) * (1 - ty) +
    hash(x0 + 1, y0) * tx * (1 - ty) +
    hash(x0, y0 + 1) * (1 - tx) * ty +
    hash(x0 + 1, y0 + 1) * tx * ty
  );
};

const fbm = (x, y) => noise(x, y) * 0.65 + noise(x * 2.7, y * 2.7) * 0.35;

// A gentle diagonal keeps the wash from reading as wood grain on tall panels.
const angle = (-32 * Math.PI) / 180;
const direction = { x: Math.cos(angle), y: Math.sin(angle) };
const perpendicular = { x: -direction.y, y: direction.x };
const center = { x: WIDTH / 2, y: HEIGHT / 2 };
const LENGTH = 1700;

const strokes = Array.from({ length: 13 }, (_, index) => ({
  offset: (index - 6) * 37 + (hash(index, 7) - 0.5) * 17,
  curveAmplitude: 13 + hash(index, 11) * 15,
  curvePhase: hash(index, 13) * Math.PI * 2,
  width: 18 + hash(index, 17) * 27,
  pressurePhase: hash(index, 19) * Math.PI * 2,
  breakPhase: hash(index, 23) * Math.PI * 2,
  seed: index * 3.7,
}));

const buffer = Buffer.alloc(WIDTH * HEIGHT * 4);

for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    const rx = x - center.x;
    const ry = y - center.y;
    const t = (rx * direction.x + ry * direction.y) / LENGTH;
    const cross = rx * perpendicular.x + ry * perpendicular.y;
    // A faint mottled base keeps the wash continuous; gestures add visible brush.
    let alpha = 0.16 + 0.1 * fbm(x * 0.01, y * 0.02);

    for (const stroke of strokes) {
      const curve =
        Math.sin(t * Math.PI * 1.7 + stroke.curvePhase) * stroke.curveAmplitude;
      const distance = cross - stroke.offset - curve;
      if (Math.abs(distance) > stroke.width) continue;

      // Pressure swells and relaxes along the gesture, like a loaded brush.
      const pressure =
        0.25 +
        0.75 *
          (0.5 + 0.5 * Math.sin(t * Math.PI * 0.85 + stroke.pressurePhase));

      // The brush lifts and lands mid-gesture, creating dry-out interruptions.
      const lift = smooth(
        (Math.sin(t * Math.PI * 1.3 + stroke.breakPhase) + 0.55) / 0.35
      );

      const taper = Math.max(Math.sin(Math.PI * ((t + 0.6) / 1.2)), 0) ** 0.7;
      const width =
        stroke.width *
        (0.6 + 0.4 * taper) *
        (1 + 0.15 * Math.sin(t * 25 + stroke.seed));
      const edge = 1 - smooth(Math.abs(distance) / width);

      // Clumped fbm makes dry gaps, while a finer pass supplies bristle streaks.
      const dryness = smooth((fbm(cross * 0.015, t * 1.3) - 0.45) / 0.25);
      const bristles =
        (0.3 + 0.7 * fbm(cross * 0.025, t * 1.1)) * (1 - dryness * 0.9);
      const speckle = fbm(x * 0.025, y * 0.025);
      alpha += edge * pressure * bristles * (0.55 + 0.45 * speckle);
    }

    const index = (y * WIDTH + x) * 4;
    buffer[index] = 0;
    buffer[index + 1] = 0;
    buffer[index + 2] = 0;
    buffer[index + 3] = Math.round(Math.min(alpha, 1) * MAX_ALPHA * 255);
  }
}

await sharp(buffer, {
  raw: { width: WIDTH, height: HEIGHT, channels: 4 },
})
  .png({ compressionLevel: 9 })
  .toFile('public/vectors/brush-stroke.png');

console.log('public/vectors/brush-stroke.png regenerated');
