'use strict';

const homeView   = document.getElementById('homeView');
const eventView  = document.getElementById('eventView');
const homeGrid   = document.getElementById('homeGrid');
const eventGrid  = document.getElementById('eventGrid');
const homeLink   = document.getElementById('homeLink');
const navSection = document.getElementById('navSection');

let allEvents = [];

/* ================================================================
   INIT — fetch data from server
   ================================================================ */
async function init() {
  try {
    const res  = await fetch('/api/data');
    const data = await res.json();
    allEvents  = data.events || [];
  } catch {
    allEvents = [];
  }

  buildHome();

  const hash = location.hash.slice(1);
  if (hash) {
    const ev = allEvents.find(e => e.id === hash);
    if (ev) openEvent(ev);
  }
}

/* ================================================================
   HOME GRID
   ================================================================ */
function buildHome() {
  homeGrid.innerHTML = '';

  if (allEvents.length === 0) {
    homeGrid.innerHTML = '<p style="padding:4rem 1rem;color:#999;text-align:center;font-size:0.9rem;">No events yet — add some in the <a href="/admin.html" style="color:inherit">admin panel</a>.</p>';
    return;
  }

  allEvents.forEach(ev => {
    const cover = ev.photos[0] || null;
    if (!cover) return; // skip events with no photos

    const item = document.createElement('div');
    item.className = 'masonry-item';

    const img = document.createElement('img');
    img.src     = cover;
    img.alt     = ev.name;
    img.loading = 'lazy';

    const cap = document.createElement('div');
    cap.className   = 'masonry-caption';
    cap.textContent = ev.name;

    item.append(img, cap);
    item.addEventListener('click', () => openEvent(ev));
    homeGrid.appendChild(item);
  });

  let footer = document.querySelector('.site-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'site-footer';
    document.getElementById('homeView').appendChild(footer);
  }
  footer.textContent = `Copyright Diego Jauregui ${new Date().getFullYear()}. All rights reserved.`;
}

/* ================================================================
   EVENT VIEW
   ================================================================ */
function openEvent(ev) {
  navSection.textContent = ev.name;
  eventGrid.innerHTML = '';

  ev.photos.forEach((src, i) => {
    const item = document.createElement('div');
    item.className = 'masonry-item';

    const img = document.createElement('img');
    img.src     = src;
    img.alt     = `${ev.name} — ${i + 1}`;
    img.loading = 'lazy';

    item.appendChild(img);
    item.addEventListener('click', () => openLightbox(ev.photos, i));
    eventGrid.appendChild(item);
  });

  homeView.classList.remove('active');
  eventView.classList.add('active');
  window.scrollTo(0, 0);
  history.pushState({ eventId: ev.id }, ev.name, `#${ev.id}`);
}

function goHome() {
  navSection.textContent = '';
  eventView.classList.remove('active');
  homeView.classList.add('active');
  window.scrollTo(0, 0);
  history.pushState({}, 'Diego Jauregui', ' ');
}

homeLink.addEventListener('click', e => { e.preventDefault(); goHome(); });
document.getElementById('navHome').addEventListener('click', e => { e.preventDefault(); goHome(); });

window.addEventListener('popstate', () => {
  const hash = location.hash.slice(1);
  if (!hash) {
    goHome();
  } else {
    const ev = allEvents.find(e => e.id === hash);
    if (ev) openEvent(ev);
  }
});

/* ================================================================
   LIGHTBOX
   ================================================================ */
const lightbox = document.getElementById('lightbox');
const lbImg    = document.getElementById('lbImg');
const lbCtr    = document.getElementById('lbCounter');

let lb = { photos: [], index: 0 };

function openLightbox(photos, index) {
  lb = { photos, index };
  renderLb();
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderLb() {
  lbImg.src = lb.photos[lb.index];
  lbCtr.textContent = `${lb.index + 1} / ${lb.photos.length}`;
}

function closeLb() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  lbImg.src = '';
}

function lbNav(dir) {
  lb.index = (lb.index + dir + lb.photos.length) % lb.photos.length;
  renderLb();
}

document.getElementById('lbClose').addEventListener('click', closeLb);
document.getElementById('lbPrev').addEventListener('click',  () => lbNav(-1));
document.getElementById('lbNext').addEventListener('click',  () => lbNav(1));
lbImg.addEventListener('click', () => lbNav(1));
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLb(); });

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')     closeLb();
  if (e.key === 'ArrowLeft')  lbNav(-1);
  if (e.key === 'ArrowRight') lbNav(1);
});

let tsX = 0;
lightbox.addEventListener('touchstart', e => { tsX = e.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tsX;
  if (Math.abs(dx) > 50) lbNav(dx < 0 ? 1 : -1);
}, { passive: true });

/* ================================================================
   START
   ================================================================ */
init();
