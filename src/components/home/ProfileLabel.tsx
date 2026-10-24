import type { ComponentPropsWithoutRef } from 'react';

import { BLOG_LETTERS, BLOG_WORDMARK_BOUNDS } from './blog-wordmark';

interface ProfileLabelProps extends ComponentPropsWithoutRef<'svg'> {
  monthLabel: string;
  dayLabel: string;
  yearLabel: string;
  weekdayLabel: string;
  /**
   * Fill for the `BLOG` badge. Omitted, the badge stays unfilled; the card
   * passes the open accordion's colour so the badge tracks the hovered column.
   */
  badgeFill?: string;
}

/**
 * The date block is a fixed rectangle: the barcode, the date and the header all
 * span `BLOCK_WIDTH` from `x = 0`, so the three rows line up on both edges and
 * fill the frame instead of each ending wherever its text happened to stop.
 *
 * Vertically the barcode hangs off the top edge and the header sits on the
 * bottom edge, with the date optically centred between them.
 *
 * `y` on the text elements is the alphabetic baseline, not a hanging one: the
 * conversion `baseline = y + 0.8em` the hanging mode implies is exactly the kind
 * of implicit offset that makes hand-tuned coordinates drift.
 */
const BLOCK_WIDTH = 128;
const BLOCK_HEIGHT = 74;

const BARCODE_Y = 0;
const BARCODE_HEIGHT = 12;

const DATE_FONT_SIZE = 44;
/** Ink of `Oct.24` runs 31.24 above the baseline and 0.44 below it. */
const DATE_ASCENT = 31.24;
const DATE_DESCENT = 0.44;

/** Header row: smaller than the date, so the dashed rule carries the width. */
const HEADER_FONT_SIZE = 15;
const WEEKDAY_FONT_SIZE = 12;

/**
 * The header's ink is ~10.8 tall and has no descenders, so its baseline doubles
 * as the block's bottom edge. The date is then dropped so its ink is centred in
 * the band between the barcode and the header.
 */
const HEADER_BASELINE = BLOCK_HEIGHT;
const HEADER_ASCENT = 10.65;
/** Midpoint of the free band, shifted down by half the ink so the ink centres. */
const DATE_BASELINE =
  (BARCODE_Y + BARCODE_HEIGHT + HEADER_BASELINE - HEADER_ASCENT) / 2 + (DATE_ASCENT - DATE_DESCENT) / 2;

/** Dashed rule, on the header's optical middle. */
const RULE_Y = HEADER_BASELINE - HEADER_ASCENT / 2;

/**
 * Rendered width of `2026` / `Sat` in Outfit 500 at the sizes above. The face is
 * self-hosted, so the metrics are identical on every device — the rule can sit
 * in the measured gap instead of being hand-nudged per browser. Keep these in
 * sync if the header sizes change.
 */
const YEAR_TEXT_WIDTH = 34.5;
const WEEKDAY_TEXT_WIDTH = 18.1;
/** Breathing room between the header text and the dashed rule. */
const RULE_GAP = 10;

/**
 * The right column is placed on the same 128-unit grid as the date block, with
 * every value measured off the reference layout and divided by its scale (2.5
 * reference pixels per unit). The coordinates are absolute rather than a group
 * offset: a single `translate` can only move the column as a whole, but the
 * divider, the name, the badge and the caption each sit at their own measured
 * position and the alignment only holds if they are stated outright.
 */
const DIVIDER_X = 152.8;
const DIVIDER_TOP = BARCODE_Y;
const DIVIDER_BOTTOM = HEADER_BASELINE;
const DIVIDER_WIDTH = 2.2;

/** Colour chips under the name; the name is pinned to their left edge. */
const CHIP_X = 172.8;
const CHIP_Y = 64.8;
const CHIP_SIZE = 6.8;
const CHIP_STEP = 11;

/**
 * `@Bakkac` sits directly on the page — no fill, no frame. Its baseline is
 * fixed, not derived from the space below it: the ink then lands between the
 * arrows above (bottom 7.2) and the chips below (top 64.8) the way the
 * reference has it, instead of drifting with whatever the neighbours do.
 */
const NAME_FONT_SIZE = 53;
/** Ink of `@Bakkac` at 53px / 500: 38.16 above the baseline, 4.98 below. */
const NAME_ASCENT = 38.16;
const NAME_DESCENT = 4.98;
/** Advance and side bearings at that size — the badge hangs off the ink edge. */
const NAME_ADVANCE = 212.21;
const NAME_RIGHT_BEARING = 0.95;
const NAME_X = 172.6;
const NAME_BASELINE = 49.2;
/** Right edge of the `c`, measured: the badge is hung off it. */
const NAME_INK_RIGHT = 386.3;

/**
 * Three up-right arrows above the name, level with each other and evenly
 * pitched. Drawn rather than set as glyphs: `↗` is missing from most fonts and
 * would fall back to a different shape on every device.
 */
const ARROW_COUNT = 3;
const ARROW_X = 174;
const ARROW_Y = 0;
const ARROW_WIDTH = 7.6;
const ARROW_HEIGHT = 7.2;
const ARROW_PITCH = 12.8;
const ARROW_STROKE = 1.6;
/** Length of the two head strokes at the tip. */
const ARROW_HEAD = 6.4;

/** `BLOG` badge, hung off the name's ink edge and centred on the arrow row. */
const BADGE_WIDTH = 34;
const BADGE_HEIGHT = 13.2;
const BADGE_STROKE = 1.3;
const BADGE_Y = -2.4;
const BADGE_X = NAME_INK_RIGHT - BADGE_WIDTH;
/**
 * The badge sits a touch high in the reference — its top edge clears the
 * barcode — so it is measured from the block top with a negative offset rather
 * than clamped to zero.
 */
const BADGE_TEXT_WIDTH = 26;
const BADGE_TEXT_HEIGHT = 6.1;
/**
 * Extra tracking between the four letters, in wordmark units. Now back to the
 * face's natural advances: enlarging the badge text opened the letters up on
 * its own, and any added gap reads as a break between them again. The paths keep
 * their advances, so this is the only knob the crowding depends on.
 */
const BADGE_TEXT_TRACKING = 0;
const BADGE_TRACKED_WIDTH = BLOG_WORDMARK_BOUNDS.width + BADGE_TEXT_TRACKING * (BLOG_LETTERS.length - 1);
const BADGE_TEXT_X = BADGE_X + (BADGE_WIDTH - BADGE_TEXT_WIDTH) / 2;
const BADGE_TEXT_Y = BADGE_Y + (BADGE_HEIGHT - BADGE_TEXT_HEIGHT) / 2;
const BADGE_TEXT_SCALE_X = BADGE_TEXT_WIDTH / BADGE_TRACKED_WIDTH;
const BADGE_TEXT_SCALE_Y = BADGE_TEXT_HEIGHT / BLOG_WORDMARK_BOUNDS.height;
/**
 * Advance cursor per letter: each letter is drawn at its own origin and pushed
 * along by its advance plus the tracking, so widening the gaps never distorts
 * the glyph shapes.
 */
const BLOG_LETTER_OFFSETS = BLOG_LETTERS.reduce<number[]>((offsets, letter, index) => {
  if (index === 0) {
    offsets.push(0);
    return offsets;
  }
  offsets.push(offsets[index - 1] + BLOG_LETTERS[index - 1].advance + BADGE_TEXT_TRACKING);
  return offsets;
}, []);

const CAPTION_X = 212.2;
const CAPTION_BASELINE = 72.4;
const CAPTION_FONT_SIZE = 13;
/** Right edge of the down arrow, measured off the drawer's right margin. */
const DOWN_ARROW_X = 391.4;
const DOWN_ARROW_FONT_SIZE = 15.5;

const RULE_LENGTH = BLOCK_WIDTH - WEEKDAY_TEXT_WIDTH - YEAR_TEXT_WIDTH - RULE_GAP * 2;
/**
 * The rule has to break into an exact number of dashes: a fixed `5 4` pattern
 * stops wherever the line does and leaves a partial dash at the end, which reads
 * as a stray tick. Size the dashes off the line instead, with one more dash than
 * gaps so the rule closes on a full dash, and keep the original 5:4 ratio.
 */
const RULE_DASH_COUNT = 6;
const RULE_SPACE_RATIO = 4 / 5;
const RULE_DASH =
  RULE_LENGTH / (RULE_DASH_COUNT + (RULE_DASH_COUNT - 1) * RULE_SPACE_RATIO);
const RULE_SPACE = RULE_DASH * RULE_SPACE_RATIO;
/** Trim the float noise so the markup reads `5.54 4.432`, not `5.540000000000001`. */
const RULE_DASHARRAY = `${RULE_DASH.toFixed(3)} ${RULE_SPACE.toFixed(3)}`;

/** Guard bars at each end, plus the body they frame. */
const GUARD_WIDTH = 1.6;
const BARCODE_MODULES = 96;

interface BarcodeBar {
  x: number;
  width: number;
}

/**
 * Decorative barcode derived from the date, so the same day always renders the
 * same pattern. A hash-seeded PRNG keeps it stable between the server render
 * and hydration — no `Math.random`, no clock.
 */
function buildBarcode(seed: string): BarcodeBar[] {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let state = hash || 1;
  const nextRun = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    // Mostly hairline bars with the occasional wide one — the thin/thick mix a
    // printed barcode has. Single-width runs would read as a dashed rule.
    return state % 5 < 2 ? 2 : 1;
  };

  // Alternate bar/space runs until the modules are spoken for. Bars sit at even
  // indices, so an even run count means we stopped on a space — drop it.
  const runs: number[] = [];
  let consumed = 0;
  while (consumed < BARCODE_MODULES) {
    const run = Math.min(nextRun(), BARCODE_MODULES - consumed);
    runs.push(run);
    consumed += run;
  }
  if (runs.length % 2 === 0) runs.pop();

  const bodyWidth = BLOCK_WIDTH - GUARD_WIDTH * 2;
  const scale = bodyWidth / runs.reduce((sum, run) => sum + run, 0);
  const bars: BarcodeBar[] = [
    { x: 0, width: GUARD_WIDTH },
    { x: BLOCK_WIDTH - GUARD_WIDTH, width: GUARD_WIDTH },
  ];

  let cursor = GUARD_WIDTH;
  runs.forEach((run, index) => {
    const width = run * scale;
    if (index % 2 === 0) bars.push({ x: cursor, width });
    cursor += width;
  });

  return bars;
}

export function ProfileLabel({
  monthLabel,
  dayLabel,
  yearLabel,
  weekdayLabel,
  badgeFill,
  className = 'block h-20 w-full overflow-visible',
  ...props
}: ProfileLabelProps) {
  const dateLabel = `${monthLabel}.${dayLabel}`;
  const barcode = buildBarcode(`${yearLabel}${monthLabel}${dayLabel}`);

  return (
    <svg viewBox="0 0 320 84" className={className} aria-label="Profile label" {...props}>
      <g aria-hidden="true" fill="currentColor" opacity="0.75" shapeRendering="crispEdges">
        {barcode.map((bar) => (
          <rect
            key={bar.x}
            x={bar.x}
            y={BARCODE_Y}
            width={bar.width}
            height={BARCODE_HEIGHT}
          />
        ))}
      </g>
      {/*
        `textLength` pins the date to the frame: month names differ in width
        (`Jul.28` is ~24 units narrower than `Sep.09`), so without it the right
        edge would drift day to day. `lengthAdjust="spacing"` makes up the
        difference in tracking only, leaving the glyph shapes untouched.
      */}
      <text
        x="0"
        y={DATE_BASELINE}
        textLength={BLOCK_WIDTH}
        lengthAdjust="spacing"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: `${DATE_FONT_SIZE}px`,
          fontWeight: 500,
          letterSpacing: '-0.045em',
          lineHeight: 1,
        }}
      >
        {dateLabel}
      </text>
      <text
        x="0"
        y={HEADER_BASELINE}
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: `${HEADER_FONT_SIZE}px`,
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {yearLabel}
      </text>
      <line
        x1={YEAR_TEXT_WIDTH + RULE_GAP}
        y1={RULE_Y}
        x2={BLOCK_WIDTH - WEEKDAY_TEXT_WIDTH - RULE_GAP}
        y2={RULE_Y}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={RULE_DASHARRAY}
      />
      <text
        x={BLOCK_WIDTH}
        y={HEADER_BASELINE}
        textAnchor="end"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: `${WEEKDAY_FONT_SIZE}px`,
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {weekdayLabel}
      </text>

      <line
        x1={DIVIDER_X}
        y1={DIVIDER_TOP}
        x2={DIVIDER_X}
        y2={DIVIDER_BOTTOM}
        stroke="currentColor"
        strokeWidth={DIVIDER_WIDTH}
      />
      <g
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={ARROW_STROKE}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      >
        {Array.from({ length: ARROW_COUNT }, (_, index) => (
          <g key={index} transform={`translate(${ARROW_X + index * ARROW_PITCH} ${ARROW_Y})`}>
            {/*
              Shaft, then the two head strokes at the tip. Inset by half the
              stroke so the *ink* fills the measured 7.6 × 7.2 box instead of
              spilling half a stroke past it.
            */}
            <path
              d={`M${ARROW_STROKE / 2} ${ARROW_HEIGHT - ARROW_STROKE / 2} L${
                ARROW_WIDTH - ARROW_STROKE / 2
              } ${ARROW_STROKE / 2} M${ARROW_WIDTH - ARROW_HEAD} ${ARROW_STROKE / 2} H${
                ARROW_WIDTH - ARROW_STROKE / 2
              } V${ARROW_HEIGHT - ARROW_STROKE / 2}`}
            />
          </g>
        ))}
      </g>
      <g aria-hidden="true">
        <rect
          x={BADGE_X}
          y={BADGE_Y}
          width={BADGE_WIDTH}
          height={BADGE_HEIGHT}
          fill={badgeFill ?? 'none'}
          stroke="currentColor"
          strokeWidth={BADGE_STROKE}
        />
        <g
          transform={`translate(${BADGE_TEXT_X} ${BADGE_TEXT_Y}) scale(${BADGE_TEXT_SCALE_X} ${BADGE_TEXT_SCALE_Y})`}
          fill="currentColor"
          fillRule="nonzero"
        >
          {BLOG_LETTERS.map((letter, index) => (
            <path
              key={letter.d.slice(0, 12)}
              d={letter.d}
              transform={`translate(${BLOG_LETTER_OFFSETS[index] - BLOG_WORDMARK_BOUNDS.x} ${-BLOG_WORDMARK_BOUNDS.y})`}
            />
          ))}
        </g>
      </g>
      <text
        x={NAME_X}
        y={NAME_BASELINE}
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: `${NAME_FONT_SIZE}px`,
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        @Bakkac
      </text>
      <g aria-hidden="true">
        <rect x={CHIP_X} y={CHIP_Y} width={CHIP_SIZE} height={CHIP_SIZE} fill="#ef4444" />
        <rect x={CHIP_X + CHIP_STEP} y={CHIP_Y} width={CHIP_SIZE} height={CHIP_SIZE} fill="#facc15" />
        <rect x={CHIP_X + CHIP_STEP * 2} y={CHIP_Y} width={CHIP_SIZE} height={CHIP_SIZE} fill="#2563eb" />
      </g>
      <text
        x={CAPTION_X}
        y={CAPTION_BASELINE}
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: `${CAPTION_FONT_SIZE}px`,
          fontWeight: 500,
          letterSpacing: '0.01em',
          lineHeight: 1,
        }}
      >
        MY PROFILE &amp; INTERESTS
      </text>
      <text
        x={DOWN_ARROW_X}
        y={CAPTION_BASELINE}
        textAnchor="end"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: `${DOWN_ARROW_FONT_SIZE}px`,
          lineHeight: 1,
        }}
      >
        ↓
      </text>
    </svg>
  );
}
