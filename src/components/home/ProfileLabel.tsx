import type { ComponentPropsWithoutRef } from 'react';

interface ProfileLabelProps extends ComponentPropsWithoutRef<'svg'> {
  monthLabel: string;
  dayLabel: string;
  yearLabel: string;
  weekdayLabel: string;
}

export function ProfileLabel({
  monthLabel,
  dayLabel,
  yearLabel,
  weekdayLabel,
  className = 'block h-20 w-full overflow-visible',
  ...props
}: ProfileLabelProps) {
  return (
    <svg viewBox="0 0 320 84" className={className} aria-label="Profile label" {...props}>
      <text
        x="4"
        y="1"
        dominantBaseline="hanging"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '18px',
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {yearLabel}
      </text>
      <line x1="56" y1="10" x2="128" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" />
      <text
        x="156"
        y="1"
        textAnchor="end"
        dominantBaseline="hanging"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {weekdayLabel}
      </text>
      <line x1="180" y1="4" x2="180" y2="72" stroke="currentColor" strokeWidth="4" />
      <text
        x="200"
        y="4"
        dominantBaseline="hanging"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '48px',
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        @Bakkac
      </text>
      <g aria-hidden="true">
        <rect x="200" y="65" width="7" height="7" fill="#ef4444" />
        <rect x="211" y="65" width="7" height="7" fill="#facc15" />
        <rect x="222" y="65" width="7" height="7" fill="#2563eb" />
      </g>
      <text
        x="240"
        y="76"
        dominantBaseline="ideographic"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '13px',
          letterSpacing: '0.015em',
          lineHeight: 1,
        }}
      >
        MY PROFILE &amp; INTERESTS
      </text>
      <text
        x="420"
        y="78"
        dominantBaseline="ideographic"
        textAnchor="end"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '16px',
          lineHeight: 1,
        }}
      >
        ↓
      </text>
      <text
        x="0"
        y="20"
        dominantBaseline="hanging"
        fill="currentColor"
        style={{
          fontFamily: '"Outfit", sans-serif',
          fontSize: '58px',
          fontWeight: 500,
          letterSpacing: '-0.045em',
          lineHeight: 1,
        }}
      >
        {`${monthLabel}.${dayLabel}`}
      </text>
    </svg>
  );
}
