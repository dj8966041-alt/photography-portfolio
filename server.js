'use strict';

require('dotenv').config();

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ================================================================
   STORAGE — Vercel Blob when token present, local filesystem otherwise
   ================================================================ */
const USE_BLOB   = !!process.env.BLOB_READ_WRITE_TOKEN;
const DATA_KEY   = 'portfolio/data.json';
const LOCAL_DATA = path.join(__dirname, 'data.json');
const LOCAL_PHOTOS = path.join(__dirname, 'photos');

if (!USE_BLOB) {
  fs.mkdirSync(LOCAL_PHOTOS, { recursive: true });
  if (!fs.existsSync(LOCAL_DATA))
    fs.writeFileSync(LOCAL_DATA, JSON.stringify({ events: [] }, null, 2));
}

async function loadData() {
  if (USE_BLOB) {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: DATA_KEY });
    if (blobs.length > 0) {
      const r = await fetch(`${blobs[0].url}?t=${Date.now()}`);
      if (r.ok) return r.json();
    }
    return { events: [] };
  }
  try { return JSON.parse(fs.readFileSync(LOCAL_DATA, 'utf8')); }
  catch { return { events: [] }; }
}

async function saveData(data) {
  if (USE_BLOB) {
    const { put } = await import('@vercel/blob');
    await put(DATA_KEY, JSON.stringify(data, null, 2), {
      access: 'public', contentType: 'application/json',
      addRandomSuffix: false, allowOverwrite: true,
    });
  } else {
    fs.writeFileSync(LOCAL_DATA, JSON.stringify(data, null, 2));
  }
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ================================================================
   MULTER
   ================================================================ */
const upload = USE_BLOB
  ? multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })
  : multer({
      storage: multer.diskStorage({
        destination(req, file, cb) {
          const dir = path.join(LOCAL_PHOTOS, req.params.id);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename(req, file, cb) {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
    });

/* ================================================================
   ROUTES
   ================================================================ */
app.get('/api/data', async (req, res) => {
  try { res.json(await loadData()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/events', async (req, res) => {
  try {
    const data = await loadData();
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id    = slug(name) + '-' + Date.now();
    const event = { id, name, category: category || 'concert', photos: [] };
    data.events.push(event);
    await saveData(data);
    res.json(event);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/events/:id', async (req, res) => {
  try {
    const data = await loadData();
    const ev   = data.events.find(e => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    if (req.body.name)     ev.name     = req.body.name;
    if (req.body.category) ev.category = req.body.category;
    await saveData(data);
    res.json(ev);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const data = await loadData();
    const idx  = data.events.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    const ev   = data.events[idx];
    if (USE_BLOB && ev.photos.length > 0) {
      const { del } = await import('@vercel/blob');
      await del(ev.photos);
    } else if (!USE_BLOB) {
      const dir = path.join(LOCAL_PHOTOS, req.params.id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
    data.events.splice(idx, 1);
    await saveData(data);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/events/:id/photos', upload.array('photos'), async (req, res) => {
  try {
    const data = await loadData();
    const ev   = data.events.find(e => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    let added;
    if (USE_BLOB) {
      const { put } = await import('@vercel/blob');
      added = await Promise.all(req.files.map(async file => {
        const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
        const name = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
        const blob = await put(`photos/${req.params.id}/${name}`, file.buffer, {
          access: 'public', contentType: file.mimetype, addRandomSuffix: false,
        });
        return blob.url;
      }));
    } else {
      added = req.files.map(f => `/photos/${req.params.id}/${f.filename}`);
    }
    ev.photos.push(...added);
    await saveData(data);
    res.json({ photos: added });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/events/:id/photo', async (req, res) => {
  try {
    const { src } = req.body;
    if (!src) return res.status(400).json({ error: 'src required' });
    const data = await loadData();
    const ev   = data.events.find(e => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    ev.photos = ev.photos.filter(p => p !== src);
    if (USE_BLOB) {
      const { del } = await import('@vercel/blob');
      await del(src);
    } else {
      const file = path.join(LOCAL_PHOTOS, req.params.id, path.basename(src));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    await saveData(data);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/events/:id/photos', async (req, res) => {
  try {
    const data = await loadData();
    const ev   = data.events.find(e => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: 'not found' });
    ev.photos  = req.body.photos;
    await saveData(data);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/events', async (req, res) => {
  try {
    const data  = await loadData();
    data.events = req.body.events;
    await saveData(data);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ================================================================
   START
   ================================================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Site  →  http://localhost:${PORT}`);
  console.log(`  Admin →  http://localhost:${PORT}/admin.html\n`);
});
