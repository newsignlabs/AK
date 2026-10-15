import { useState, type CSSProperties } from 'react';
import { m } from 'motion/react';
import { getPhoto, type Photo } from '../lib/content';

type Props = {
  photo: Photo | string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Shared-layout id for lightbox expansion (M7). */
  layoutId?: string;
  /** Crop to fill the parent instead of keeping the photo's own ratio. */
  cover?: boolean;
};

const formats = [
  ['avif', 'image/avif'],
  ['webp', 'image/webp'],
] as const;

export function srcset(p: Photo, ext: string): string {
  return p.widths.map((w) => `/images/${p.id}-${w}.${ext} ${w}w`).join(', ');
}

export function largest(p: Photo, ext = 'jpg'): string {
  return `/images/${p.id}-${p.widths.at(-1)}.${ext}`;
}

/**
 * Responsive photo: AVIF/WebP/JPEG sources, intrinsic size (no CLS) and a
 * blurred LQIP background that fades out once the full image loads.
 */
export function Img({ photo, sizes = '100vw', priority, className = '', style, layoutId, cover }: Props) {
  const p = typeof photo === 'string' ? getPhoto(photo) : photo;
  const [loaded, setLoaded] = useState(false);
  const mid = p.widths.find((w) => w >= 960) ?? p.widths.at(-1);

  return (
    <m.div
      layoutId={layoutId}
      className={`img ${cover ? 'img--cover' : ''} ${loaded ? 'is-loaded' : ''} ${className}`}
      style={{ ...(cover ? {} : { aspectRatio: `${p.w} / ${p.h}` }), backgroundImage: `url(${p.lqip})`, ...style }}
    >
      <picture>
        {formats.map(([ext, type]) => (
          <source key={ext} type={type} srcSet={srcset(p, ext)} sizes={sizes} />
        ))}
        <img
          src={`/images/${p.id}-${mid}.jpg`}
          srcSet={srcset(p, 'jpg')}
          sizes={sizes}
          width={p.w}
          height={p.h}
          alt={p.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onLoad={() => setLoaded(true)}
          ref={(el) => {
            // Cached images can finish before React attaches onLoad (hydration).
            if (el?.complete && el.naturalWidth) setLoaded(true);
          }}
        />
      </picture>
    </m.div>
  );
}
