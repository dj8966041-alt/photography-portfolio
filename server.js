'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { exec } = require('child_process');

const app        = express();
const DATA_FILE  = path.join(__dirname, 'data.json');
const PHOTOS_DIR = path.join(__dirname, 'photos');

fs.mkdirSync(PHOTOS_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE))
  fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [] }, null, 2));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function load()     { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function save(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function slug(s)    { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(PHOTOS_DIR, req.params.id);
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

/* ---- API ---- */

app.get('/api/data', (req, res) => res.json(load()));

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

app.patch('/api/events/:id', (req, res) => {
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  if (req.body.name)     ev.name     = req.body.name;
  if (req.body.category) ev.category = req.body.category;
  save(data);
  res.json(ev);
});

app.delete('/api/events/:id', (req, res) => {
  const data = load();
  const idx  = data.events.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const dir = path.join(PHOTOS_DIR, req.params.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  data.events.splice(idx, 1);
  save(data);
  res.json({ ok: true });
});

app.post('/api/events/:id/photos', upload.array('photos'), (req, res) => {
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  const added = req.files.map(f => `/photos/${req.params.id}/${f.filename}`);
  ev.photos.push(...added);
  save(data);
  res.json({ photos: added });
});

app.delete('/api/events/:id/photo', (req, res) => {
  const { src } = req.body;
  if (!src) return res.status(400).json({ error: 'src required' });
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  ev.photos = ev.photos.filter(p => p !== src);
  const file = path.join(PHOTOS_DIR, req.params.id, path.basename(src));
  if (fs.existsSync(file)) fs.unlinkSync(file);
  save(data);
  res.json({ ok: true });
});

app.put('/api/events/:id/photos', (req, res) => {
  const data = load();
  const ev   = data.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'not found' });
  ev.photos  = req.body.photos;
  save(data);
  res.json({ ok: true });
});

app.put('/api/events', (req, res) => {
  const data  = load();
  data.events = req.body.events;
  save(data);
  res.json({ ok: true });
});

/* ---- Publish to website ---- */
app.post('/api/publish', (req, res) => {
  const cmd = 'git add -A && git diff --cached --quiet || git commit -m "Update portfolio" && git push';
  exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
    if (err && !stderr.includes('nothing to commit')) {
      console.error(stderr);
      return res.json({ ok: false, message: 'Push failed — check terminal for details.' });
    }
    res.json({ ok: true });
  });
});

/* ---- Start ---- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Site  →  http://localhost:${PORT}`);
  console.log(`  Admin →  http://localhost:${PORT}/admin.html\n`);
});
