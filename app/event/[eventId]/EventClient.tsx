'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { type PortfolioEvent } from '../../HomeClient';

type LightboxState = { photos: string[]; index: number } | null;

export default function EventClient({ event }: { event: PortfolioEvent }) {
  const [lightbox, setLightbox] = useState<LightboxState>(null);

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
        <div className="event-header">
          <Link href="/" className="back-btn">← Back</Link>
          <h1 className="event-title">{event.name}</h1>
        </div>

        {event.photos.length === 0 ? (
          <div className="empty-state">No photos yet.</div>
        ) : (
          <div className="masonry">
            {event.photos.map((src, i) => (
              <div
                key={src}
                className="masonry-item"
                onClick={() => setLightbox({ photos: event.photos, index: i })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </main>

      {lightbox && (
        <div className="lightbox-backdrop" onClick={closeLightbox}>
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
