// ============================================================
// OCULUS // VECTOR-SEEK — shared behavior
// Loaded on every page (index.html, build.html, search.html).
// Page-specific logic (search form, build form) lives in its
// own file and is loaded after this one.
// ============================================================

// ---- ambient background eyes -------------------------------
const bgEyesContainer = document.getElementById('bg-eyes');
const EYE_COUNT = 26;

if (bgEyesContainer) {
  for (let i = 0; i < EYE_COUNT; i++) {
    const eye = document.createElement('div');
    eye.className = 'bg-eye';
    eye.style.left = Math.random() * 100 + 'vw';
    eye.style.top = Math.random() * 100 + 'vh';
    eye.style.animationDuration = (4 + Math.random() * 6) + 's';
    eye.style.animationDelay = (Math.random() * 5) + 's';
    eye.style.setProperty('--px', (Math.random() * 30 - 15) + '%');
    bgEyesContainer.appendChild(eye);
  }
}

// ---- console eye tracks the cursor (only on pages that have one) ----
const pupil = document.getElementById('pupil');
const consoleEye = document.getElementById('console-eye');

if (pupil && consoleEye) {
  document.addEventListener('mousemove', (e) => {
    const rect = consoleEye.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const angle = Math.atan2(dy, dx);
    const maxOffset = 10; // how far the pupil can drift from center

    const ox = Math.cos(angle) * maxOffset;
    const oy = Math.sin(angle) * maxOffset * 0.5; // flatten vertically for the almond shape

    pupil.style.transform = `translate(${ox}px, ${oy}px)`;
  });
}

// ---- fake node id in the footer ----------------------------
const nodeIdEl = document.getElementById('node-id');
if (nodeIdEl) {
  nodeIdEl.textContent = Math.random().toString(16).slice(2, 8).toUpperCase();
}

// ---- highlight the current page in the nav ------------------
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.site-nav a').forEach((link) => {
  const href = link.getAttribute('href');
  if (href === currentPage) {
    link.classList.add('is-active');
  }
});

// ============================================================
// Page-transition: iris closes in on the click point, THEN we
// navigate. Only intercepts same-site, same-tab, non-download
// links (so the GitHub link on index.html is untouched — it
// starts with "http", so the `startsWith('http')` check below
// skips it).
// ============================================================

const aperture = document.getElementById('aperture');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function playExitTransition(clickEvent, onDone) {
  if (!aperture || prefersReducedMotion) {
    onDone();
    return;
  }

  // Keyboard-triggered clicks report clientX/clientY as 0 — treat that
  // as "no real click point" and fall back to the aperture's default
  // center (set in CSS) instead of closing in on the corner.
  if (clickEvent && (clickEvent.clientX || clickEvent.clientY)) {
    const xPct = (clickEvent.clientX / window.innerWidth * 100).toFixed(1) + '%';
    const yPct = (clickEvent.clientY / window.innerHeight * 100).toFixed(1) + '%';
    aperture.style.setProperty('--tx', xPct);
    aperture.style.setProperty('--ty', yPct);
  }

  const finish = () => {
    aperture.removeEventListener('animationend', finish);
    onDone();
  };
  aperture.addEventListener('animationend', finish);
  aperture.classList.add('is-closing');
}

document.querySelectorAll('a[href]').forEach((link) => {
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
  if (link.target === '_blank' || link.hasAttribute('download')) return;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    playExitTransition(e, () => { window.location.href = href; });
  });
});

// ============================================================
// Scan feed — rotating flavor text shown in a .scan-feed element
// while a request is running, so the wait has something to look
// at besides a static "SCANNING..." line. Purely cosmetic: it
// does not reflect real backend progress.
// ============================================================

const DEFAULT_SCAN_LINES = [
  'CROSS-REFERENCING SUBJECT DATABASE...',
  'DECRYPTING VECTOR SPACE...',
  'PULLING CLASSIFIED RECORDS...',
  'COMPILING SIMILARITY MATRIX...',
  'SUBJECT PROXIMITY: CALCULATING...',
  'REDACTION PASS: ▓▓▓▓▓▓░░░░'
];

let scanFeedTimer = null;

function startScanFeed(el, lines = DEFAULT_SCAN_LINES) {
  if (!el) return;
  el.classList.add('is-active');

  const tick = () => {
    el.textContent = lines[Math.floor(Math.random() * lines.length)];
    el.classList.remove('is-flicker');
    void el.offsetWidth; // force reflow so the animation can restart
    el.classList.add('is-flicker');
  };

  tick();
  clearInterval(scanFeedTimer);
  scanFeedTimer = setInterval(tick, 900);
}

function stopScanFeed(el) {
  clearInterval(scanFeedTimer);
  scanFeedTimer = null;
  if (el) {
    el.classList.remove('is-active', 'is-flicker');
    el.textContent = '';
  }
}