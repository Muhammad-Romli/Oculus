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