import type { ComponentPropsWithoutRef } from 'react';

interface ProfileLabelProps extends ComponentPropsWithoutRef<'svg'> {
  monthLabel: string;
  dayLabel: string;
}

export function ProfileLabel({
  monthLabel,
  dayLabel,
  className = 'block h-20 w-full overflow-visible',
  ...props
}: ProfileLabelProps) {
  return (
    <svg viewBox="0 0 320 84" className={className} aria-label="Profile label" {...props}>
      <text
        x="0"
        y="20"
        dominantBaseline="hanging"
        fill="currentColor"
        style={{ fontFamily: '"DIN 2014", "Outfit", sans-serif', fontSize: '58px', lineHeight: 1 }}
      >
        {`${monthLabel}.${dayLabel}`}
      </text>
      <line x1="176" y1="12" x2="176" y2="56" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="192"
        y="12"
        dominantBaseline="hanging"
        fill="currentColor"
        style={{ fontFamily: '"Outfit", sans-serif', fontSize: '26px', fontWeight: 500, lineHeight: 1 }}
      >
        Bakka
      </text>
      <text
        x="192"
        y="60"
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
        x="360"
        y="62"
        dominantBaseline="ideographic"
        fill="currentColor"
        style={{ fontFamily: '"Outfit", sans-serif', fontSize: '16px', lineHeight: 1 }}
      >
        ↓
      </text>
    </svg>
  );
}
