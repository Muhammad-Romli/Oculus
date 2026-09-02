// ============================================================
// OCULUS // VECTOR-SEEK — build.html behavior
// Shared setup (bg eyes, pupil tracking, footer node id, page
// transitions) lives in common.js and runs before this file.
//
// The actual backend call is stubbed out in runBuild().
// Replace that function once you give me your FastAPI route
// details — everything else here already works standalone.
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024;   // 5 MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 MB per manifest

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileListEl = document.getElementById('file-list');
const buildForm = document.getElementById('build-form');
const buildBtn = document.getElementById('build-btn');
const statusLine = document.getElementById('status-line');
const progressTrack = document.getElementById('progress-track');
const progressFill = document.getElementById('progress-fill');
const buildLogEl = document.getElementById('build-log');
const embeddingsOut = document.getElementById('embeddings-out');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const consoleEl = document.getElementById('console');

let selectedFiles = [];
let lastEmbeddings = null;

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('is-dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('is-dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('is-dragover');
  addFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});

function addFiles(fileList) {
  let runningTotal = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  for (const file of Array.from(fileList)) {
    if (file.size > MAX_FILE_SIZE) {
      setStatus(`REJECTED // ${file.name} EXCEEDS ${formatBytes(MAX_FILE_SIZE)} LIMIT`, 'error');
      continue;
    }
    if (runningTotal + file.size > MAX_TOTAL_SIZE) {
      setStatus(`REJECTED // MANIFEST WOULD EXCEED ${formatBytes(MAX_TOTAL_SIZE)} LIMIT`, 'error');
      continue;
    }
    runningTotal += file.size;
    selectedFiles.push(file);
  }

  renderFileList();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

function renderFileList() {
  if (!selectedFiles.length) {
    fileListEl.innerHTML = '';
    buildBtn.disabled = true;
    return;
  }

  buildBtn.disabled = false;
  fileListEl.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-row">
      <span class="file-name">${escapeHtml(f.name)}</span>
      <span class="file-size">${formatBytes(f.size)}</span>
      <button type="button" class="file-remove" data-index="${i}" aria-label="Remove ${escapeHtml(f.name)}">&times;</button>
    </div>
  `).join('');

  fileListEl.querySelectorAll('.file-remove').forEach((btn) => {
    btn.addEventListener('click', () => removeFile(Number(btn.dataset.index)));
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

buildForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedFiles.length) return;

  buildBtn.disabled = true;
  buildLogEl.innerHTML = '';
  embeddingsOut.hidden = true;
  lastEmbeddings = null;
  setStatus('BUILDING INDEX...', 'scanning');
  consoleEl.classList.add('is-scanning');
  showProgress(0);

  try {
    const result = await runBuild(selectedFiles, (line) => appendLog(line));
    lastEmbeddings = result;
    showProgress(100);
    setStatus('BUILD COMPLETE // EMBEDDINGS READY', '');
    embeddingsOut.hidden = false;
  } catch (err) {
    console.error(err);
    setStatus('BUILD FAILED // SEE LOG BELOW', 'error');
    appendLog({ text: 'BUILD ABORTED — CONNECTION TO ENGINE FAILED', kind: 'fail' });
  } finally {
    buildBtn.disabled = false;
    consoleEl.classList.remove('is-scanning');
  }
});

function setStatus(text, mode) {
  statusLine.textContent = text;
  statusLine.classList.remove('is-scanning', 'is-error');
  if (mode === 'scanning') statusLine.classList.add('is-scanning');
  if (mode === 'error') statusLine.classList.add('is-error');
}

function showProgress(pct) {
  progressTrack.classList.add('is-active');
  progressFill.style.width = `${pct}%`;
}

function appendLog({ text, kind }) {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const row = document.createElement('div');
  row.className = `log-line${kind ? ' is-' + kind : ''}`;
  row.innerHTML = `<span class="log-time">${time}</span><span class="log-text">${escapeHtml(text)}</span>`;
  buildLogEl.appendChild(row);
}

downloadBtn.addEventListener('click', () => {
  if (!lastEmbeddings) return;
  const blob = new Blob([JSON.stringify(lastEmbeddings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'embeddings.json';
  a.click();
  URL.revokeObjectURL(url);
});

copyBtn.addEventListener('click', async () => {
  if (!lastEmbeddings) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastEmbeddings, null, 2));
    const original = copyBtn.textContent;
    copyBtn.textContent = 'COPIED';
    setTimeout(() => { copyBtn.textContent = original; }, 1500);
  } catch (err) {
    console.error(err);
    setStatus('COPY FAILED // CLIPBOARD ACCESS DENIED', 'error');
  }
});

async function runBuild(files, onLog) {
  onLog({ text: `MANIFEST RECEIVED // ${files.length} FILE${files.length === 1 ? '' : 'S'}` });
  await new Promise((r) => setTimeout(r, 400));

  const vectors = [];

  for (let i = 0; i < files.length; i++) {
    await new Promise((r) => setTimeout(r, 350));
    onLog({ text: `EMBEDDING ${files[i].name}...`, kind: 'ok' });
    showProgress(Math.round(((i + 1) / files.length) * 90));
    vectors.push({
      file: files[i].name,
      size: files[i].size,
      vector: Array.from({ length: 8 }, () => Number(Math.random().toFixed(4)))
    });
  }

  await new Promise((r) => setTimeout(r, 400));
  onLog({ text: 'INDEX WRITTEN TO DISK', kind: 'ok' });

  return {
    model: 'vector-seek-stub',
    generated_at: new Date().toISOString(),
    embeddings: vectors
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}