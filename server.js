'use strict';

const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PHOTOS    = path.join(DATA_DIR, 'photos');

fs.mkdirSync(PHOTOS, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [] }, null, 2));

app.use(express.json());
app.use(express.static(__dirname));

/* ---- helpers ---- */
function load()     { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function save(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function slug(str)  { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

/* ---- multer ---- */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(PHOTOS, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

/* ================================================================
   API
   ================================================================ */

/* GET all data */
app.get('/api/data', (req, res) => res.json(load()));

/* POST new event */
app.post('/api/events', (req, res) => {
  const data = load();
  const { name, category } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id    = slug(name) + '-' + Date.now();
  const event = { id, name, category: category || 'concert', photos: [] };
  data.events.push(event);
  save(data);
  res.json(event);
});

/* PATCH event (rename / recategorise) */
app.patch('/api/events/:id', (req, res) => {
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  if (req.body.name)     ev.name     = req.body.name;
  if (req.body.category) ev.category = req.body.category;
  save(data);
  res.json(ev);
});

/* DELETE event */
app.delete('/api/events/:id', (req, res) => {
  const data = load();
  const idx  = data.events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const dir = path.join(PHOTOS, req.params.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  data.events.splice(idx, 1);
  save(data);
  res.json({ ok: true });
});

/* POST photos to an event */
app.post('/api/events/:id/photos', upload.array('photos'), (req, res) => {
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  const added = req.files.map(f => `/photos/${req.params.id}/${f.filename}`);
  ev.photos.push(...added);
  save(data);
  res.json({ photos: added });
});

/* DELETE one photo */
app.delete('/api/events/:id/photos/:filename', (req, res) => {
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  const target = `/photos/${req.params.id}/${req.params.filename}`;
  ev.photos    = ev.photos.filter(p => p !== target);
  const file   = path.join(PHOTOS, req.params.id, req.params.filename);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  save(data);
  res.json({ ok: true });
});

/* PUT reorder photos */
app.put('/api/events/:id/photos', (req, res) => {
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  ev.photos = req.body.photos;
  save(data);
  res.json({ ok: true });
});

/* PUT reorder events */
app.put('/api/events', (req, res) => {
  const data = load();
  data.events = req.body.events;
  save(data);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n  Site  →  http://localhost:${PORT}`);
  console.log(`  Admin →  http://localhost:${PORT}/admin.html\n`);
});
