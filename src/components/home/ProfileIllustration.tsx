import { withBase } from '../../lib/site-taxonomy';

interface ProfileIllustrationProps {
  baseUrl: string;
  className?: string;
}

export function ProfileIllustration({ baseUrl, className }: ProfileIllustrationProps) {
  return (
    <div className={`relative aspect-316/211 ${className ?? ''}`} aria-hidden="true">
      <img
        src={withBase(baseUrl, '/vectors/profile-illustration.webp')}
        alt=""
        aria-hidden="true"
        width={4488}
        height={2634}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        data-boot-critical=""
        className="pointer-events-none absolute max-w-none"
        style={{
          left: '-29.4%',
          top: '-213.7%',
          width: '473.4%',
          height: 'auto',
        }}
      />
    </div>
  );
}
