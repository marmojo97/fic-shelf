/**
 * Archivd extension popup logic
 */

const SHELVES = [
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'reading', label: 'Currently Reading' },
  { value: 'read', label: 'Read' },
];

const RATING_LABEL = { G: 'G', T: 'T', M: 'M', E: 'E' };

function formatWords(n) {
  if (!n || n === 0) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M words`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k words`;
  return `${n} words`;
}

async function getSettings() {
  return new Promise((resolve) => chrome.storage.sync.get({ apiUrl: 'http://localhost:3001', token: '' }, resolve));
}

function render(html) {
  document.getElementById('body').innerHTML = html;
}

async function init() {
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  const settings = await getSettings();

  if (!settings.token) {
    render(`
      <div class="login-state">
        <p>Sign in to Archivd to save fics</p>
        <a href="${settings.apiUrl.replace(':3001', ':5173')}/login" target="_blank">Open Archivd →</a>
        <p style="margin-top:10px; color:#475569; font-size:11px">
          After signing in, paste your token in <a href="#" id="open-settings" style="color:#14b8a6;">Settings</a>
        </p>
      </div>
    `);
    document.getElementById('open-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  // Get fic data stored by content script
  const stored = await new Promise((resolve) =>
    chrome.storage.session.get('currentFic', (r) => resolve(r.currentFic))
  );

  if (!stored || !stored.title) {
    render(`
      <div class="empty-state">
        <p>Navigate to an AO3 or FFN story page<br>to save it to your shelf.</p>
      </div>
    `);
    return;
  }

  const fic = stored;

  render(`
    <div class="fic-preview">
      <div class="fic-title">${escHtml(fic.title)}</div>
      <div class="fic-meta">by ${escHtml(fic.author)}${fic.fandom ? ` · ${escHtml(fic.fandom)}` : ''}</div>
      <div class="fic-badges">
        ${fic.contentRating ? `<span class="badge badge-${fic.contentRating}">${fic.contentRating}</span>` : ''}
        ${fic.completionStatus === 'complete' ? '<span class="badge badge-complete">Complete</span>' : '<span class="badge badge-wip">WIP</span>'}
        ${fic.wordCount ? `<span class="badge badge-words">${formatWords(fic.wordCount)}</span>` : ''}
      </div>
    </div>

    <div class="label">Add to shelf</div>
    <select class="shelf-selector" id="shelf-sel">
      ${SHELVES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
    </select>

    <div class="label">Note (optional)</div>
    <textarea class="note-input" id="note-input" placeholder="Why you want to read this…" rows="2"></textarea>

    <div id="error-msg"></div>
    <button class="save-btn" id="save-btn">Save to Archivd</button>
  `);

  document.getElementById('save-btn').addEventListener('click', async () => {
    const shelf = document.getElementById('shelf-sel').value;
    const notes = document.getElementById('note-input').value.trim();
    const btn = document.getElementById('save-btn');
    const errEl = document.getElementById('error-msg');

    btn.innerHTML = '<span class="spinner"></span>Saving…';
    btn.disabled = true;
    errEl.innerHTML = '';

    try {
      const res = await fetch(`${settings.apiUrl}/api/fics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.token}`,
        },
        body: JSON.stringify({
          title: fic.title,
          author: fic.author,
          fandom: fic.fandom,
          ships: fic.ships || [],
          characters: fic.characters || [],
          tags: fic.tags || [],
          contentWarnings: fic.contentWarnings || [],
          contentRating: fic.contentRating || 'T',
          wordCount: fic.wordCount || 0,
          chapterCount: fic.chapterCount || 1,
          chaptersRead: fic.chaptersRead || 0,
          completionStatus: fic.completionStatus || 'in-progress',
          language: fic.language || 'English',
          seriesName: fic.seriesName || '',
          sourceUrl: fic.sourceUrl,
          sourcePlatform: fic.sourcePlatform || 'ao3',
          shelf,
          notes,
          summary: fic.summary || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      render(`
        <div class="success-state">
          <div class="success-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3>Saved!</h3>
          <p>${escHtml(fic.title)}</p>
          <p style="margin-top:6px; color:#14b8a6;">Added to ${SHELVES.find(s => s.value === shelf)?.label}</p>
        </div>
      `);

      // Clear cached fic data so popup resets next time
      chrome.storage.session.remove('currentFic');

    } catch (e) {
      btn.innerHTML = 'Save to Archivd';
      btn.disabled = false;
      errEl.innerHTML = `<div class="error-msg">${escHtml(e.message)}</div>`;
    }
  });
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

init();
