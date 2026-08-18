'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export type PortfolioEvent = {
  id: string;
  name: string;
  category: string;
  photos: string[];
};

type LightboxState = {
  photos: string[];
  index: number;
} | null;

export default function HomeClient({ events }: { events: PortfolioEvent[] }) {
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  const openLightbox = (photos: string[], index: number) => {
    setLightbox({ photos, index });
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const prevPhoto = useCallback(() => {
    setLightbox(lb => lb ? { ...lb, index: (lb.index - 1 + lb.photos.length) % lb.photos.length } : lb);
  }, []);

  const nextPhoto = useCallback(() => {
    setLightbox(lb => lb ? { ...lb, index: (lb.index + 1) % lb.photos.length } : lb);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, closeLightbox, prevPhoto, nextPhoto]);

  return (
    <>
      <header className="site-header">
        <Link href="/" className="site-name">Diego Jauregui</Link>
        <Link href="/" className="nav-home">Home</Link>
      </header>

      <main className="page-content">
        {events.length === 0 ? (
          <div className="empty-state">No events yet.</div>
        ) : (
          <div className="masonry">
            {events.map(event => {
              const cover = event.photos[0];
              return (
                <div
                  key={event.id}
                  className="masonry-item"
                  onClick={() => cover
                    ? window.location.href = `/event/${event.id}`
                    : window.location.href = `/event/${event.id}`
                  }
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={event.name} loading="lazy" />
                  ) : (
                    <div className="placeholder">📷</div>
                  )}
                  <div className="caption">{event.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {lightbox && (
        <div
          className="lightbox-backdrop"
          onClick={closeLightbox}
        >
          <button className="lightbox-close" onClick={closeLightbox}>×</button>
          <button className="lightbox-arrow prev" onClick={e => { e.stopPropagation(); prevPhoto(); }}>‹</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="lightbox-img"
            src={lightbox.photos[lightbox.index]}
            alt=""
            onClick={e => e.stopPropagation()}
          />
          <button className="lightbox-arrow next" onClick={e => { e.stopPropagation(); nextPhoto(); }}>›</button>
        </div>
      )}
    </>
  );
}
