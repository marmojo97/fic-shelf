const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Use memory storage — no temp files on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Map AO3 rating strings → our schema values
const RATING_MAP = {
  'General Audiences': 'G',
  'Teen And Up Audiences': 'T',
  'Mature': 'M',
  'Explicit': 'E',
  'Not Rated': 'T',
};

// Map AO3 completion status — handles both old and new CSV column values
const STATUS_MAP = {
  'Completed': 'complete',
  'Complete': 'complete',
  'Complete Work': 'complete',
  'In Progress': 'in-progress',
  'Work in Progress': 'in-progress',
  'Updated': 'in-progress',
};

// Fandom color hash
function getFandomColor(fandom) {
  const colors = ['#0d4f4f','#3b0764','#1e3a8a','#831843','#78350f','#14532d','#312e81','#1e293b','#4a1942','#1a3a2a'];
  let hash = 0;
  for (let i = 0; i < (fandom || '').length; i++) hash = (hash * 31 + fandom.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function parseChapters(chapStr) {
  if (!chapStr) return { read: 0, total: 1 };
  const [read, total] = String(chapStr).split('/');
  return {
    read: parseInt(read) || 0,
    total: total && total !== '?' ? parseInt(total) : null,
  };
}

function parseTagList(str) {
  if (!str) return [];
  // AO3 history CSV uses semicolons as tag separators
  const sep = str.includes(';') ? /\s*;\s*/ : /\s*,\s*/;
  return str.split(sep).map(s => s.trim()).filter(Boolean);
}

// Flexible column getter — normalises whitespace/case/punctuation/BOM
function makeGetter(row) {
  // Strip BOM (\uFEFF), non-breaking spaces, and other invisible characters
  const normKey = (k) => k.replace(/[\uFEFF\u00A0]/g, '').toLowerCase().replace(/[\s_\-]/g, '');
  const rowKeys = Object.keys(row);
  return (...keys) => {
    for (const k of keys) {
      const found = rowKeys.find(c => normKey(c) === normKey(k));
      if (found && row[found] != null && row[found] !== '') return row[found];
    }
    return '';
  };
}

function mapAo3Row(row) {
  const get = makeGetter(row);

  const workId = get('Work ID', 'WorkID', 'id');
  const sourceUrl = workId ? `https://archiveofourown.org/works/${workId}` : '';

  // History CSV has "Author Pseud" + "Author Main"; older exports just have "Author"
  const authorPseud = get('Author Pseud', 'AuthorPseud');
  const authorMain  = get('Author Main', 'AuthorMain', 'Author', 'Creator', 'Pseud');
  const author = authorPseud || authorMain;

  const chapStr = get('Chapters', 'Chapter Count');
  const { read: chaptersRead, total: chapterTotal } = parseChapters(chapStr);

  // History CSV uses "Completion" column ("Complete Work" / "Work in Progress")
  const statusStr = get('Completion', 'Status', 'Completion Status', 'Complete');

  const warnings    = parseTagList(get('Warnings', 'Content Warnings', 'Archive Warnings'));
  const ships       = parseTagList(get('Relationships', 'Ships', 'Pairings'));
  const characters  = parseTagList(get('Characters'));
  // History CSV uses "Freeform Tags"; bookmarks export uses "Additional Tags"
  const tags        = parseTagList(get('Freeform Tags', 'Additional Tags', 'Tags'));
  const ratingStr   = get('Rating', 'Content Rating');

  // Fandoms: history CSV separates with "; "
  const fandomsRaw = get('Fandoms', 'Fandom');
  const fandom = fandomsRaw.split(/\s*[;,]\s*/).map(s => s.trim()).filter(Boolean)[0] || '';

  // History-specific fields
  const lastVisited  = get('Last Visited', 'LastVisited', 'Date Visited', 'Date Read') || '';
  const totalVisits  = parseInt(get('Total Visits', 'TotalVisits', 'Visits') || '1') || 1;

  return {
    title: get('Title', 'Work Title'),
    author,
    fandom,
    ships,
    characters,
    wordCount: parseInt((get('Words', 'Word Count', 'Word_Count') || '0').replace(/,/g, '')) || 0,
    chapterCount: chapterTotal || (chaptersRead > 0 ? chaptersRead : 1),
    chaptersRead,
    completionStatus: STATUS_MAP[statusStr] || (statusStr.toLowerCase().includes('complet') ? 'complete' : 'in-progress'),
    contentRating: RATING_MAP[ratingStr] || 'T',
    contentWarnings: warnings.filter(w => w && w !== 'No Archive Warnings Apply' && w !== 'Creator Chose Not To Use Archive Warnings'),
    tags,
    language: get('Language') || 'English',
    seriesName: get('Series', 'Series Name') || '',
    sourceUrl,
    lastUpdatedDate: get('Last Updated', 'Updated', 'Update Date') || '',
    lastVisited,
    totalVisits,
  };
}

// Deduplicate records within a CSV by title+author (keep first occurrence)
function deduplicateRecords(records) {
  const seen = new Set();
  return records.filter(row => {
    const fic = mapAo3Row(row);
    if (!fic.title) return false;
    const key = `${fic.title}|||${fic.author}`.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// POST /api/import/ao3-csv/preview
router.post('/ao3-csv/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let records;
  try {
    records = parse(req.file.buffer.toString('utf-8').replace(/^\uFEFF/, ''), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });
  } catch (e) {
    return res.status(400).json({ error: 'Could not parse CSV: ' + e.message });
  }

  if (!records.length) return res.status(400).json({ error: 'CSV is empty' });

  const sample = records[0];
  const cols = Object.keys(sample);
  if (!cols.some(c => /title/i.test(c))) {
    return res.status(400).json({ error: "This doesn't look like an AO3 CSV export. Expected a Title column." });
  }

  const deduped = deduplicateRecords(records);

  res.json({
    total: deduped.length,
    preview: deduped.slice(0, 20).map(r => mapAo3Row(r)),
    columns: cols,
  });
});

// POST /api/import/ao3-csv/confirm — import all to "history", return fic list for bulk sort
router.post('/ao3-csv/confirm', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let records;
  try {
    records = parse(req.file.buffer.toString('utf-8').replace(/^\uFEFF/, ''), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });
  } catch (e) {
    return res.status(400).json({ error: 'Could not parse CSV: ' + e.message });
  }

  const userId = req.userId;
  // Always import to "history" — user sorts into proper shelves in the next step
  const defaultShelf = 'history';
  let imported = 0;
  let skipped = 0;
  const skippedTitles = [];
  const importedFics = [];

  const deduped = deduplicateRecords(records);

  for (const row of deduped) {
    const fic = mapAo3Row(row);
    if (!fic.title) continue;

    // Check for duplicate already in this user's library
    const existing = fic.sourceUrl
      ? db.prepare('SELECT id FROM fics WHERE user_id = ? AND source_url = ?').get(userId, fic.sourceUrl)
      : db.prepare('SELECT id FROM fics WHERE user_id = ? AND LOWER(title) = ? AND LOWER(author) = ?').get(userId, fic.title.toLowerCase(), (fic.author || '').toLowerCase());

    if (existing) {
      skipped++;
      skippedTitles.push(fic.title);
      continue;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO fics (
        id, user_id, title, author, fandom, ships, characters, word_count,
        chapter_count, chapters_read, completion_status, content_rating,
        content_warnings, tags, language, series_name, source_url, source_platform,
        last_updated_date, shelf, personal_rating, cover_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, userId, fic.title, fic.author || '', fic.fandom || '',
      JSON.stringify(fic.ships || []), JSON.stringify(fic.characters || []),
      fic.wordCount || 0, fic.chapterCount || 1, fic.chaptersRead || 0,
      fic.completionStatus || 'in-progress', fic.contentRating || 'T',
      JSON.stringify(fic.contentWarnings || []), JSON.stringify(fic.tags || []),
      fic.language || 'English', fic.seriesName || '', fic.sourceUrl || '', 'ao3',
      fic.lastUpdatedDate || '', defaultShelf, 0,
      getFandomColor(fic.fandom || '')
    );

    importedFics.push({
      id,
      title: fic.title,
      author: fic.author || '',
      fandom: fic.fandom || '',
      contentRating: fic.contentRating || 'T',
      completionStatus: fic.completionStatus || 'in-progress',
      wordCount: fic.wordCount || 0,
      lastVisited: fic.lastVisited || '',
      totalVisits: fic.totalVisits || 1,
      shelf: defaultShelf,
      coverColor: getFandomColor(fic.fandom || ''),
    });
    imported++;
  }

  res.json({
    imported,
    skipped,
    skippedTitles: skippedTitles.slice(0, 20),
    importedFics,
    message: `Imported ${imported} fic${imported !== 1 ? 's' : ''}. Skipped ${skipped} duplicate${skipped !== 1 ? 's' : ''}.`,
  });
});

// POST /api/import/bulk-sort — assign shelves to multiple fics at once
router.post('/bulk-sort', (req, res) => {
  const userId = req.userId;
  const { assignments } = req.body; // [{ ficId, shelf }]
  if (!Array.isArray(assignments)) {
    return res.status(400).json({ error: 'assignments must be an array' });
  }

  let updated = 0;
  for (const { ficId, shelf } of assignments) {
    if (!ficId || !shelf) continue;
    const result = db.prepare(
      'UPDATE fics SET shelf = ? WHERE id = ? AND user_id = ?'
    ).run(shelf, ficId, userId);
    if (result.changes) updated++;
  }

  res.json({ updated });
});

// Mark onboarding done (legacy — also handled in auth.js)
router.post('/onboarding-done', (req, res) => {
  db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(req.userId);
  res.json({ success: true });
});

module.exports = router;
