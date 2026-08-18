'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CORRECT_PIN = '010712';

type PortfolioEvent = {
  id: string;
  name: string;
  category: string;
  photos: string[];
};

/* ─── Toast ──────────────────────────────────────────────────────── */
function useToast() {
  const [msg, setMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string) => {
    setMsg(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(''), 3000);
  }, []);

  return { msg, toast };
}

/* ─── PIN Gate ───────────────────────────────────────────────────── */
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const tryPin = () => {
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem('admin_unlocked', '1');
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div className="pin-gate">
      <div className="pin-box">
        <h2>Admin Panel</h2>
        <input
          className="pin-input"
          type="password"
          placeholder="••••••"
          value={pin}
          maxLength={6}
          onChange={e => { setPin(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && tryPin()}
          autoFocus
        />
        <p className="pin-error">{error}</p>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={tryPin}>
          Enter
        </button>
      </div>
    </div>
  );
}

/* ─── Event Card ─────────────────────────────────────────────────── */
function EventCard({
  event,
  onUpdate,
  onDelete,
  onPhotoDelete,
  onPhotosUpload,
  dragHandlers,
}: {
  event: PortfolioEvent;
  onUpdate: (id: string, patch: Partial<PortfolioEvent>) => void;
  onDelete: (id: string) => void;
  onPhotoDelete: (id: string, src: string) => void;
  onPhotosUpload: (id: string, files: FileList) => void;
  dragHandlers: {
    onDragStart: (id: string) => void;
    onDragOver: (e: React.DragEvent, id: string) => void;
    onDrop: (e: React.DragEvent, id: string) => void;
    onDragEnd: () => void;
  };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(event.name);
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    if (name === event.name) return;
    setSaving(true);
    await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    onUpdate(event.id, { name });
    setSaving(false);
  };

  const saveCategory = async (cat: string) => {
    await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat }),
    });
    onUpdate(event.id, { category: cat });
  };

  return (
    <div
      className="event-card"
      draggable
      onDragStart={() => dragHandlers.onDragStart(event.id)}
      onDragOver={e => dragHandlers.onDragOver(e, event.id)}
      onDrop={e => dragHandlers.onDrop(e, event.id)}
      onDragEnd={dragHandlers.onDragEnd}
    >
      <div className="event-card-header" onClick={() => setOpen(o => !o)}>
        <span className="drag-handle" onMouseDown={e => e.stopPropagation()}>⠿</span>
        <span className="event-card-name">{event.name || 'Untitled'}</span>
        <span className="event-card-category">{event.category}</span>
        <span className={`event-card-chevron${open ? ' open' : ''}`}>▾</span>
      </div>

      {open && (
        <div className="event-card-body">
          <input
            className="event-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            placeholder="Event name"
          />
          {saving && <span style={{ fontSize: '0.75rem', color: '#888' }}>Saving…</span>}

          <div className="category-row">
            <label>Category:</label>
            <select
              className="category-select"
              value={event.category}
              onChange={e => saveCategory(e.target.value)}
            >
              <option value="concert">Concert</option>
              <option value="sport">Sport</option>
            </select>
          </div>

          <div className="photo-grid">
            {event.photos.map(src => (
              <div key={src} className="photo-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
                <button
                  className="delete-photo-btn"
                  onClick={() => onPhotoDelete(event.id, src)}
                  title="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="upload-label" title="Add photos">
              <span>+</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => e.target.files && onPhotosUpload(event.id, e.target.files)}
              />
            </label>
          </div>

          <div className="event-actions">
            <button className="btn btn-danger" onClick={() => onDelete(event.id)}>
              Delete Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Admin Dashboard ────────────────────────────────────────────── */
function AdminDashboard() {
  const [events, setEvents] = useState<PortfolioEvent[]>([]);
  const [publishing, setPublishing] = useState(false);
  const { msg: toastMsg, toast } = useToast();
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((d: { events: PortfolioEvent[] }) => setEvents(d.events ?? []))
      .catch(() => toast('Could not load events'));
  }, [toast]);

  /* Drag-to-reorder */
  const handleDragStart = (id: string) => { dragId.current = id; };
  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId.current || dragId.current === overId) return;
    setEvents(prev => {
      const from = prev.findIndex(e => e.id === dragId.current);
      const to   = prev.findIndex(e => e.id === overId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    dragId.current = overId;
  };
  const handleDrop = async (e: React.DragEvent, _overId: string) => {
    e.preventDefault();
  };
  const handleDragEnd = () => {
    dragId.current = null;
    // Persist new order
    fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }).catch(() => {});
  };

  /* Add event */
  const addEvent = async () => {
    const res  = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Event', category: 'concert' }) });
    const data = await res.json() as { ok: boolean; event: PortfolioEvent };
    if (data.ok) setEvents(prev => [...prev, data.event]);
  };

  /* Update event in state */
  const onUpdate = (id: string, patch: Partial<PortfolioEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  /* Delete event */
  const onDelete = async (id: string) => {
    if (!confirm('Delete this event and all its photos?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e.id !== id));
    toast('Event deleted');
  };

  /* Delete photo */
  const onPhotoDelete = async (id: string, src: string) => {
    await fetch(`/api/events/${id}/photo`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src }),
    });
    setEvents(prev => prev.map(e =>
      e.id === id ? { ...e, photos: e.photos.filter(p => p !== src) } : e
    ));
  };

  /* Upload photos */
  const onPhotosUpload = async (id: string, files: FileList) => {
    const form = new FormData();
    for (const file of Array.from(files)) form.append('photos', file);
    const res  = await fetch(`/api/events/${id}/photos`, { method: 'POST', body: form });
    const data = await res.json() as { ok: boolean; added: string[] };
    if (data.ok) {
      setEvents(prev => prev.map(e =>
        e.id === id ? { ...e, photos: [...e.photos, ...data.added] } : e
      ));
      toast(`${data.added.length} photo(s) added`);
    }
  };

  /* Publish */
  const publish = async () => {
    setPublishing(true);
    try {
      const res  = await fetch('/api/publish', { method: 'POST' });
      const data = await res.json() as { ok: boolean; message?: string };
      toast(data.ok ? 'Published! Live in ~30 seconds.' : (data.message ?? 'Publish failed'));
    } catch {
      toast('Could not reach server');
    }
    setPublishing(false);
  };

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-header-right">
          <a href="/" target="_blank" className="btn btn-view">View Site ↗</a>
          <button className="btn btn-publish" onClick={publish} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish to Website'}
          </button>
        </div>
      </header>

      <div className="admin-body">
        <button className="btn btn-primary btn-add-event" onClick={addEvent}>
          + Add Event
        </button>

        {events.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
            No events yet. Click "+ Add Event" to get started.
          </p>
        )}

        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onPhotoDelete={onPhotoDelete}
            onPhotosUpload={onPhotosUpload}
            dragHandlers={{
              onDragStart: handleDragStart,
              onDragOver: handleDragOver,
              onDrop: handleDrop,
              onDragEnd: handleDragEnd,
            }}
          />
        ))}
      </div>

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('admin_unlocked') === '1') setUnlocked(true);
  }, []);

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;
  return <AdminDashboard />;
}
