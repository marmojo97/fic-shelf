const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Parse JSON fields stored as strings and convert snake_case → camelCase
function parseFic(fic) {
  if (!fic) return null;
  return {
    id:               fic.id,
    userId:           fic.user_id,
    title:            fic.title,
    author:           fic.author,
    fandom:           fic.fandom,
    ships:            tryParse(fic.ships, []),
    characters:       tryParse(fic.characters, []),
    wordCount:        fic.word_count,
    chapterCount:     fic.chapter_count,
    chaptersRead:     fic.chapters_read,
    completionStatus: fic.completion_status,
    contentRating:    fic.content_rating,
    contentWarnings:  tryParse(fic.content_warnings, []),
    tags:             tryParse(fic.tags, []),
    language:         fic.language,
    seriesName:       fic.series_name,
    sourceUrl:        fic.source_url,
    sourcePlatform:   fic.source_platform,
    lastUpdatedDate:  fic.last_updated_date,
    shelf:            fic.shelf,
    customShelf:      fic.custom_shelf,
    personalRating:   fic.personal_rating,
    personalNotes:    fic.personal_notes,
    dateStarted:      fic.date_started,
    dateFinished:     fic.date_finished,
    rereadCount:      fic.reread_count,
    emotionalDamage:  Boolean(fic.emotional_damage),
    coverColor:       fic.cover_color,
    addedAt:          fic.added_at,
    updatedAt:        fic.updated_at,
    // V2 columns (may not exist on older rows)
    lastCheckedAt:    fic.last_checked_at,
    hasUpdate:        Boolean(fic.has_update),
    ao3ChapterCountCached: fic.ao3_chapter_count_cached,
    // V3 columns
    description:      fic.description || '',
    lastVisited:      fic.last_visited || '',
    totalVisits:      fic.total_visits || 0,
  };
}

function tryParse(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}

// ⚠️ Static routes MUST come before /:id to avoid being swallowed

// POST /api/fics/bulk-move
router.post('/bulk-move', (req, res) => {
  const { ficIds, shelf } = req.body;
  if (!ficIds || !shelf) return res.status(400).json({ error: 'ficIds and shelf required' });
  const placeholders = ficIds.map(() => '?').join(',');
  db.prepare(
    `UPDATE fics SET shelf = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND user_id = ?`
  ).run(shelf, ...ficIds, req.userId);
  res.json({ success: true, count: ficIds.length });
});

// POST /api/fics/bulk-delete
router.post('/bulk-delete', (req, res) => {
  const { ficIds } = req.body;
  if (!ficIds?.length) return res.status(400).json({ error: 'ficIds required' });
  const placeholders = ficIds.map(() => '?').join(',');
  const result = db.prepare(
    `DELETE FROM fics WHERE id IN (${placeholders}) AND user_id = ?`
  ).run(...ficIds, req.userId);
  res.json({ success: true, count: result.changes });
});

// POST /api/fics/bulk-rate
router.post('/bulk-rate', (req, res) => {
  const { ficIds, rating, overwrite = false } = req.body;
  if (!ficIds?.length || rating == null) return res.status(400).json({ error: 'ficIds and rating required' });
  const placeholders = ficIds.map(() => '?').join(',');
  const condition = overwrite
    ? `id IN (${placeholders}) AND user_id = ?`
    : `id IN (${placeholders}) AND user_id = ? AND (personal_rating IS NULL OR personal_rating = 0)`;
  const result = db.prepare(
    `UPDATE fics SET personal_rating = ?, updated_at = CURRENT_TIMESTAMP WHERE ${condition}`
  ).run(rating, ...ficIds, req.userId);
  res.json({ success: true, count: result.changes });
});

// GET /api/fics/export/csv
router.get('/export/csv', (req, res) => {
  const fics = db.prepare('SELECT * FROM fics WHERE user_id = ? ORDER BY added_at DESC').all(req.userId);
  const headers = ['title', 'author', 'fandom', 'ships', 'word_count', 'chapters_read', 'chapter_count',
    'completion_status', 'content_rating', 'shelf', 'personal_rating', 'date_started', 'date_finished',
    'tags', 'personal_notes', 'source_url', 'added_at'];
  function tryParse2(val, fallback) { try { return JSON.parse(val); } catch { return fallback; } }
  const rows = fics.map(f => headers.map(h => {
    const val = f[h];
    if (typeof val === 'string' && val.startsWith('[')) return `"${tryParse2(val, []).join('; ')}"`;
    return `"${String(val || '').replace(/"/g, '""')}"`;
  }).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=archivd-export.csv');
  res.send([headers.join(','), ...rows].join('\n'));
});

// GET /api/fics/export/json
router.get('/export/json', (req, res) => {
  const fics = db.prepare('SELECT * FROM fics WHERE user_id = ? ORDER BY added_at DESC').all(req.userId);
  res.setHeader('Content-Disposition', 'attachment; filename=archivd-export.json');
  res.json({ exportedAt: new Date().toISOString(), fics: fics.map(parseFic) });
});

// GET /api/fics - list fics with optional filters
router.get('/', (req, res) => {
  const { shelf, fandom, search, sort = 'added_at', order = 'desc', page = 1, limit = 100 } = req.query;
  let where = ['user_id = ?'];
  let params = [req.userId];

  if (shelf && shelf !== 'all') {
    where.push('shelf = ?');
    params.push(shelf);
  }
  if (fandom) {
    where.push('LOWER(fandom) LIKE ?');
    params.push(`%${fandom.toLowerCase()}%`);
  }
  if (search) {
    where.push('(LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(fandom) LIKE ?)');
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s);
  }

  const validSorts = {
    added_at: 'added_at', word_count: 'word_count', personal_rating: 'personal_rating',
    title: 'title', updated_at: 'updated_at',
    last_updated_date: 'last_updated_date', last_visited: 'last_visited', total_visits: 'total_visits',
  };
  const sortCol = validSorts[sort] || 'added_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  const whereClause = where.join(' AND ');
  const offset = (Number(page) - 1) * Number(limit);

  const fics = db.prepare(
    `SELECT * FROM fics WHERE ${whereClause} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`
  ).all(...params, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM fics WHERE ${whereClause}`).get(...params);

  res.json({ fics: fics.map(parseFic), total: total.count });
});

// GET /api/fics/:id
router.get('/:id', (req, res) => {
  const fic = db.prepare('SELECT * FROM fics WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!fic) return res.status(404).json({ error: 'Fic not found' });

  const bookmarks = db.prepare('SELECT * FROM bookmarks WHERE fic_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ fic: parseFic(fic), bookmarks });
});

// POST /api/fics
router.post('/', (req, res) => {
  const {
    title, author, fandom, ships = [], characters = [], wordCount = 0,
    chapterCount = 1, chaptersRead = 0, completionStatus = 'in-progress',
    contentRating = 'T', contentWarnings = [], tags = [], language = 'English',
    seriesName = '', sourceUrl = '', sourcePlatform = 'other', lastUpdatedDate = '',
    shelf = 'want-to-read', customShelf = '', personalRating = 0, personalNotes = '',
    dateStarted = '', dateFinished = '', rereadCount = 0, emotionalDamage = false,
    coverColor = ''
  } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'Title and author are required' });
  }

  // Auto-assign cover color based on fandom if not provided
  const color = coverColor || getFandomColor(fandom || '');

  const id = uuidv4();
  db.prepare(`
    INSERT INTO fics (
      id, user_id, title, author, fandom, ships, characters, word_count, chapter_count,
      chapters_read, completion_status, content_rating, content_warnings, tags, language,
      series_name, source_url, source_platform, last_updated_date, shelf, custom_shelf,
      personal_rating, personal_notes, date_started, date_finished, reread_count,
      emotional_damage, cover_color
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    id, req.userId, title, author, fandom || '', JSON.stringify(ships), JSON.stringify(characters),
    wordCount, chapterCount, chaptersRead, completionStatus, contentRating,
    JSON.stringify(contentWarnings), JSON.stringify(tags), language, seriesName,
    sourceUrl, sourcePlatform, lastUpdatedDate, shelf, customShelf, personalRating,
    personalNotes, dateStarted, dateFinished, rereadCount, emotionalDamage ? 1 : 0, color
  );

  // Track activity if marking as finished
  if (shelf === 'read' && dateFinished) {
    logActivity(req.userId, dateFinished || new Date().toISOString().split('T')[0], 1, wordCount);
  }

  const fic = db.prepare('SELECT * FROM fics WHERE id = ?').get(id);
  res.status(201).json({ fic: parseFic(fic) });
});

// PUT /api/fics/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM fics WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Fic not found' });

  const fields = [
    'title', 'author', 'fandom', 'word_count', 'chapter_count', 'chapters_read',
    'completion_status', 'content_rating', 'language', 'series_name', 'source_url',
    'source_platform', 'last_updated_date', 'shelf', 'custom_shelf', 'personal_rating',
    'personal_notes', 'date_started', 'date_finished', 'reread_count', 'emotional_damage', 'cover_color'
  ];

  const jsonFields = { ships: true, characters: true, content_warnings: true, tags: true };

  const updates = [];
  const values = [];

  const body = req.body;
  // Map camelCase to snake_case
  const mapping = {
    wordCount: 'word_count', chapterCount: 'chapter_count', chaptersRead: 'chapters_read',
    completionStatus: 'completion_status', contentRating: 'content_rating',
    contentWarnings: 'content_warnings', seriesName: 'series_name', sourceUrl: 'source_url',
    sourcePlatform: 'source_platform', lastUpdatedDate: 'last_updated_date',
    customShelf: 'custom_shelf', personalRating: 'personal_rating', personalNotes: 'personal_notes',
    dateStarted: 'date_started', dateFinished: 'date_finished', rereadCount: 'reread_count',
    emotionalDamage: 'emotional_damage', coverColor: 'cover_color'
  };

  for (const [camel, snake] of Object.entries(mapping)) {
    if (body[camel] !== undefined) {
      updates.push(`${snake} = ?`);
      if (snake === 'emotional_damage') values.push(body[camel] ? 1 : 0);
      else if (jsonFields[snake]) values.push(JSON.stringify(body[camel]));
      else values.push(body[camel]);
    }
  }

  // Direct snake_case fields
  for (const field of fields) {
    if (body[field] !== undefined && !updates.find(u => u.startsWith(field))) {
      updates.push(`${field} = ?`);
      if (jsonFields[field]) values.push(JSON.stringify(body[field]));
      else values.push(body[field]);
    }
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  if (updates.length > 1) {
    db.prepare(`UPDATE fics SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values, req.params.id, req.userId);
  }

  // Track activity when moved to read shelf
  const newShelf = body.shelf || body.shelf;
  if ((body.shelf === 'read' || body.dateFinished) && existing.shelf !== 'read') {
    const date = body.dateFinished || new Date().toISOString().split('T')[0];
    logActivity(req.userId, date, 1, body.wordCount || existing.word_count || 0);
  }

  const fic = db.prepare('SELECT * FROM fics WHERE id = ?').get(req.params.id);
  res.json({ fic: parseFic(fic) });
});

// DELETE /api/fics/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM fics WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Fic not found' });
  res.json({ success: true });
});

// Bookmarks
router.post('/:id/bookmarks', (req, res) => {
  const fic = db.prepare('SELECT id FROM fics WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!fic) return res.status(404).json({ error: 'Fic not found' });

  const { chapter, note } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO bookmarks (id, fic_id, user_id, chapter, note) VALUES (?, ?, ?, ?, ?)').run(
    id, req.params.id, req.userId, chapter || 1, note || ''
  );
  res.status(201).json({ bookmark: db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) });
});

router.delete('/:ficId/bookmarks/:bookmarkId', (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?').run(req.params.bookmarkId, req.userId);
  res.json({ success: true });
});

// Helpers
function logActivity(userId, date, ficsCompleted, wordsRead) {
  const existing = db.prepare('SELECT id FROM reading_activity WHERE user_id = ? AND date = ?').get(userId, date);
  if (existing) {
    db.prepare('UPDATE reading_activity SET fics_completed = fics_completed + ?, words_read = words_read + ? WHERE user_id = ? AND date = ?')
      .run(ficsCompleted, wordsRead, userId, date);
  } else {
    db.prepare('INSERT INTO reading_activity (id, user_id, date, fics_completed, words_read) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), userId, date, ficsCompleted, wordsRead);
  }
}

function getFandomColor(fandom) {
  const colors = [
    '#0d4f4f', '#3b0764', '#1e3a8a', '#831843', '#78350f',
    '#14532d', '#312e81', '#1e293b', '#4a1942', '#1a3a2a'
  ];
  let hash = 0;
  for (let i = 0; i < fandom.length; i++) hash = (hash * 31 + fandom.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

module.exports = router;
