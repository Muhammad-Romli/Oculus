// ============================================================
// OCULUS // VECTOR-SEEK — search.html behavior
// Shared setup (bg eyes, pupil tracking, footer node id, scan
// feed, page transitions) lives in common.js and runs before
// this file.
//
// The actual backend call is stubbed out in fetchResults().
// Replace that function once you give me your FastAPI route
// details — everything else here already works standalone.
// ============================================================

const form = document.getElementById('query-form');
const input = document.getElementById('query-input');
const statusLine = document.getElementById('status-line');
const resultsEl = document.getElementById('results');
const consoleEl = document.getElementById('console');
const scanFeedEl = document.getElementById('scan-feed');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  setStatus('SCANNING...', 'scanning');
  resultsEl.innerHTML = '';
  consoleEl.classList.add('is-scanning');
  startScanFeed(scanFeedEl);

  try {
    const results = await fetchResults(query);
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
});

function setStatus(text, mode) {
  statusLine.textContent = text;
  statusLine.classList.remove('is-scanning', 'is-error');
  if (mode === 'scanning') statusLine.classList.add('is-scanning');
  if (mode === 'error') statusLine.classList.add('is-error');
}

// =============================================================
// STUB — replace this with your real fetch() call once you
// have your FastAPI endpoint, request body, and response shape
// figured out. This currently returns fake data after a short
// delay so you can see the whole page working end to end.
//
// Real version will look roughly like:
//
//   async function fetchResults(query) {
//     const res = await fetch('http://localhost:8000/search', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ query, top_k: 5 })
//     });
//     if (!res.ok) throw new Error('bad response');
//     return await res.json(); // expects an array of results
//   }
// =============================================================
async function fetchResults(query) {
  await new Promise((r) => setTimeout(r, 700)); // fake network delay

  return [
    {
      id: 'FILE-0231',
      score: 0.91,
      text: `Fabricated result for "${query}" — this is placeholder text standing in for a real chunk your Vector-Seek backend would return.`,
      meta: 'source: mock_data.md // chunk 3'
    },
    {
      id: 'FILE-0198',
      score: 0.77,
      text: 'Second placeholder result. Once wired up, this whole block gets replaced by real search hits from your embedding store.',
      meta: 'source: mock_data.md // chunk 1'
    }
  ];
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