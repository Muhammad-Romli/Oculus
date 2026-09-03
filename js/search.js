// ============================================================
// OCULUS // VECTOR-SEEK — search.html behavior
// Shared setup (bg eyes, pupil tracking, footer node id, scan
// feed, page transitions, API_BASE_URL) lives in common.js and
// runs before this file.
//
// Three search modes, matching main.py's three endpoints:
//   demo   -> GET  /search-demo       (the server's own shared
//                                      "animal facts" folder)
//   file   -> POST /search-by-file    (searches only the file
//                                      you upload here, not the
//                                      shared archive)
//   vector -> POST /search-by-vector  (skips text encoding —
//                                      you supply an already-
//                                      computed embedding, still
//                                      searched against the
//                                      shared archive)
// ============================================================

const form = document.getElementById('query-form');
const input = document.getElementById('query-input');
const statusLine = document.getElementById('status-line');
const resultsEl = document.getElementById('results');
const consoleEl = document.getElementById('console');
const scanFeedEl = document.getElementById('scan-feed');

const modeSelect = document.getElementById('mode-select');
const modeDescEl = document.getElementById('mode-desc');
const queryLabelEl = document.getElementById('query-label');
const queryRowEl = document.getElementById('query-row');
const modeFieldFile = document.getElementById('mode-field-file');
const modeFieldVector = document.getElementById('mode-field-vector');
const searchDropZone = document.getElementById('search-drop-zone');
const searchFileInput = document.getElementById('search-file-input');
const searchFileListEl = document.getElementById('search-file-list');
const vectorInput = document.getElementById('vector-input');

const SEARCH_MODES = {
  demo: {
    label: 'SHARED ARCHIVE',
    desc: "Search Vector-Seek's own sample records — a shared folder of animal facts. Good for trying semantic search without uploading anything.",
    showQuery: true,
    showFile: false,
    showVector: false
  },
  file: {
    label: 'PRIVATE FILE',
    desc: "Upload a file of your own and search within it. This never touches the shared archive above — only the file you submit here.",
    showQuery: true,
    showFile: true,
    showVector: false
  },
  vector: {
    label: 'RAW VECTOR',
    desc: "Paste an embedding vector you've already computed, to search the shared archive directly, skipping text encoding. Advanced use only — most people want one of the other two modes.",
    showQuery: false,
    showFile: false,
    showVector: true
  }
};

let currentMode = 'demo';
let searchFile = null; // holds the single selected file for "file" mode

function setMode(mode) {
  currentMode = mode;
  const cfg = SEARCH_MODES[mode];

  modeSelect.querySelectorAll('.mode-btn').forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  modeDescEl.textContent = cfg.desc;

  queryRowEl.hidden = !cfg.showQuery;
  queryLabelEl.hidden = !cfg.showQuery;
  input.required = cfg.showQuery;

  modeFieldFile.hidden = !cfg.showFile;
  modeFieldVector.hidden = !cfg.showVector;

  setStatus('SYSTEM IDLE // AWAITING INPUT', '');
  resultsEl.innerHTML = '';
}

modeSelect.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// ---- file picking for "PRIVATE FILE" mode --------------------
searchDropZone.addEventListener('click', () => searchFileInput.click());

searchDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  searchDropZone.classList.add('is-dragover');
});

searchDropZone.addEventListener('dragleave', () => {
  searchDropZone.classList.remove('is-dragover');
});

searchDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  searchDropZone.classList.remove('is-dragover');
  if (e.dataTransfer.files[0]) setSearchFile(e.dataTransfer.files[0]);
});

searchFileInput.addEventListener('change', () => {
  if (searchFileInput.files[0]) setSearchFile(searchFileInput.files[0]);
  searchFileInput.value = '';
});

function setSearchFile(file) {
  searchFile = file;
  searchFileListEl.innerHTML = `
    <div class="file-row">
      <span class="file-name">${escapeHtml(file.name)}</span>
      <span class="file-size">${formatBytes(file.size)}</span>
      <button type="button" class="file-remove" id="search-file-remove" aria-label="Remove ${escapeHtml(file.name)}">&times;</button>
    </div>
  `;
  document.getElementById('search-file-remove').addEventListener('click', () => {
    searchFile = null;
    searchFileListEl.innerHTML = '';
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- vector parsing for "RAW VECTOR" mode --------------------
function parseVectorInput(raw) {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return null;
  return nums;
}

// ---- submit: branch by mode, then run the shared request flow ----
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (currentMode === 'vector') {
    const vector = parseVectorInput(vectorInput.value);
    if (!vector) {
      setStatus('INVALID VECTOR // CHECK YOUR INPUT', 'error');
      return;
    }
    runSearch(() => fetchByVector(vector));
    return;
  }

  const query = input.value.trim();
  if (!query) return;

  if (currentMode === 'file') {
    if (!searchFile) {
      setStatus('NO FILE SELECTED // ADD A FILE FIRST', 'error');
      return;
    }
    runSearch(() => fetchByFile(searchFile, query));
    return;
  }

  runSearch(() => fetchDemo(query));
});

async function runSearch(requestFn) {
  setStatus('SCANNING...', 'scanning');
  resultsEl.innerHTML = '';
  consoleEl.classList.add('is-scanning');
  startScanFeed(scanFeedEl);

  try {
    const results = await requestFn();
    // Debug aid: I don't know the exact field names your backend
    // returns (search_top_similarities / compare_vectors), so check
    // this in devtools and adjust the r.id / r.score / r.text / r.meta
    // lookups in renderResults() below if they don't match.
    console.log('Vector-Seek raw result:', results[0]);
    renderResults(results);
    setStatus(`SCAN COMPLETE // ${results.length} MATCH${results.length === 1 ? '' : 'ES'} FOUND`, '');
  } catch (err) {
    console.error(err);
    setStatus('SIGNAL LOST // CONNECTION TO ENGINE FAILED', 'error');
    resultsEl.innerHTML = `<div class="error-block">UNABLE TO REACH VECTOR-SEEK BACKEND</div>`;
  } finally {
    consoleEl.classList.remove('is-scanning');
    stopScanFeed(scanFeedEl);
  }
}

function setStatus(text, mode) {
  statusLine.textContent = text;
  statusLine.classList.remove('is-scanning', 'is-error');
  if (mode === 'scanning') statusLine.classList.add('is-scanning');
  if (mode === 'error') statusLine.classList.add('is-error');
}

// ---- the three real backend calls ----------------------------

async function fetchDemo(query) {
  const url = `${API_BASE_URL}/search-demo?q=${encodeURIComponent(query)}&n=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search-demo failed: ${res.status}`);
  return await res.json();
}

async function fetchByFile(file, query) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('q', query);

  const res = await fetch(`${API_BASE_URL}/search-by-file?n=5`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(`search-by-file failed: ${res.status}`);
  return await res.json();
}

async function fetchByVector(vector) {
  const res = await fetch(`${API_BASE_URL}/search-by-vector?n=5`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vector)
  });
  if (!res.ok) throw new Error(`search-by-vector failed: ${res.status}`);
  return await res.json();
}

function renderResults(results) {
  if (!results.length) {
    resultsEl.innerHTML = `<div class="no-results">NO MATCHING SUBJECTS IN DATABASE</div>`;
    return;
  }

  resultsEl.innerHTML = results.map((r) => `
    <article class="dossier">
      <div class="dossier-head">
        <span class="dossier-id">${escapeHtml(r.id ?? 'UNKNOWN')}</span>
        <span class="dossier-score">${Math.round((r.score ?? 0) * 100)}%</span>
      </div>
      <p class="dossier-body">${escapeHtml(r.text ?? '')}</p>
      <div class="dossier-meta">${escapeHtml(r.meta ?? '')}</div>
    </article>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// initialize the UI to match the default mode
setMode(currentMode);