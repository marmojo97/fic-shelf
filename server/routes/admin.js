const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Derive a secret from ADMIN_PASSWORD so the token can't be forged without it
function getAdminSecret() {
  const pw = process.env.ADMIN_PASSWORD || 'admin';
  return crypto.createHash('sha256').update(pw + '_archivd_admin').digest('hex');
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), getAdminSecret());
    if (!payload.isAdmin) throw new Error('Not admin');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

router.post('/auth', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  const token = jwt.sign({ isAdmin: true }, getAdminSecret(), { expiresIn: '24h' });
  res.json({ token });
});

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get('/stats', requireAdmin, (req, res) => {
  // ── User counts ──────────────────────────────────────────────────────────
  const totalUsers    = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const newThisWeek   = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at > datetime('now', '-7 days')").get().c;
  const newThisMonth  = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at > datetime('now', '-30 days')").get().c;
  const active7       = db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM fics WHERE updated_at > datetime('now', '-7 days')`).get().c;
  const active30      = db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM fics WHERE updated_at > datetime('now', '-30 days')`).get().c;

  // ── Library totals ───────────────────────────────────────────────────────
  const totalFics     = db.prepare('SELECT COUNT(*) as c FROM fics').get().c;
  const avgFicsRaw    = db.prepare('SELECT AVG(cnt) as a FROM (SELECT COUNT(*) as cnt FROM fics GROUP BY user_id)').get().a;
  const avgFics       = avgFicsRaw ? Math.round(avgFicsRaw * 10) / 10 : 0;
  const totalRated    = db.prepare('SELECT COUNT(*) as c FROM fics WHERE personal_rating > 0').get().c;

  // ── Shelf distribution ───────────────────────────────────────────────────
  const shelfRows     = db.prepare('SELECT shelf, COUNT(*) as count FROM fics GROUP BY shelf ORDER BY count DESC').all();

  // ── Completion status ────────────────────────────────────────────────────
  const completionRows = db.prepare("SELECT completion_status, COUNT(*) as count FROM fics GROUP BY completion_status ORDER BY count DESC").all();

  // ── Top fandoms ──────────────────────────────────────────────────────────
  const topFandoms    = db.prepare("SELECT fandom, COUNT(*) as count FROM fics WHERE fandom != '' GROUP BY fandom ORDER BY count DESC LIMIT 10").all();

  // ── Feature adoption ─────────────────────────────────────────────────────
  const usersWithRecLists     = db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM rec_lists').get().c;
  const usersWithNotes        = db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM fics WHERE personal_notes != '' AND personal_notes IS NOT NULL").get().c;
  const usersWithCustomShelves = db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM custom_shelves').get().c;
  const usersWithBookmarklet  = db.prepare('SELECT COUNT(*) as c FROM users WHERE api_token IS NOT NULL').get().c;

  // ── Feedback ─────────────────────────────────────────────────────────────
  const feedbackCount = db.prepare('SELECT COUNT(*) as c FROM feedback').get().c;

  // ── Red flags ────────────────────────────────────────────────────────────
  const emptyAccounts    = db.prepare('SELECT COUNT(*) as c FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM fics)').get().c;
  const neverImported    = db.prepare('SELECT COUNT(*) as c FROM users WHERE last_import_at IS NULL AND id IN (SELECT DISTINCT user_id FROM fics)').get().c;

  // ── Per-user detail ──────────────────────────────────────────────────────
  const users = db.prepare(`
    SELECT
      u.id, u.email, u.username, u.display_name, u.created_at, u.last_import_at,
      COUNT(f.id)                                                              AS fic_count,
      SUM(CASE WHEN f.personal_rating > 0 THEN 1 ELSE 0 END)                 AS rated_count,
      SUM(CASE WHEN f.personal_notes != '' AND f.personal_notes IS NOT NULL THEN 1 ELSE 0 END) AS notes_count,
      SUM(CASE WHEN f.shelf = 'read'          THEN 1 ELSE 0 END)             AS shelf_read,
      SUM(CASE WHEN f.shelf = 'reading'       THEN 1 ELSE 0 END)             AS shelf_reading,
      SUM(CASE WHEN f.shelf = 'want-to-read'  THEN 1 ELSE 0 END)             AS shelf_wtr,
      SUM(CASE WHEN f.shelf = 'history'       THEN 1 ELSE 0 END)             AS shelf_history,
      (SELECT COUNT(*) FROM rec_lists    WHERE user_id = u.id)                AS reclist_count,
      (SELECT COUNT(*) FROM custom_shelves WHERE user_id = u.id)              AS custom_shelf_count
    FROM users u
    LEFT JOIN fics f ON f.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  res.json({
    // User counts
    totalUsers, newThisWeek, newThisMonth, active7, active30,
    // Library
    totalFics, avgFics, totalRated,
    // Breakdowns
    shelfRows, completionRows, topFandoms,
    // Feature adoption
    usersWithRecLists, usersWithNotes, usersWithCustomShelves, usersWithBookmarklet,
    // Feedback
    feedbackCount,
    // Red flags
    emptyAccounts, neverImported,
    // Per user
    users,
  });
});

// ─── Invite Codes ─────────────────────────────────────────────────────────────

router.get('/invite-codes', requireAdmin, (req, res) => {
  const codes = db.prepare(`
    SELECT ic.*,
           (SELECT COUNT(*) FROM invite_code_uses WHERE invite_code_id = ic.id) as actual_use_count
    FROM invite_codes ic
    ORDER BY ic.created_at DESC
  `).all();

  // Attach uses (email list) per code
  const codesWithUses = codes.map(code => {
    const uses = db.prepare(`
      SELECT icu.email, icu.used_at, u.username
      FROM invite_code_uses icu
      LEFT JOIN users u ON icu.user_id = u.id
      WHERE icu.invite_code_id = ?
      ORDER BY icu.used_at DESC
    `).all(code.id);
    return { ...code, uses };
  });

  res.json({ codes: codesWithUses });
});

router.post('/invite-codes', requireAdmin, (req, res) => {
  const { code, maxUses } = req.body;
  const id = uuidv4();
  const inviteCode = code
    ? code.toUpperCase().trim()
    : crypto.randomBytes(4).toString('hex').toUpperCase();

  try {
    db.prepare('INSERT INTO invite_codes (id, code, max_uses) VALUES (?, ?, ?)').run(
      id, inviteCode, maxUses !== undefined ? maxUses : 1
    );
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'That invite code already exists' });
    }
    throw err;
  }

  const created = db.prepare('SELECT * FROM invite_codes WHERE id = ?').get(id);
  res.json({ code: created });
});

router.put('/invite-codes/:id', requireAdmin, (req, res) => {
  const { isActive, maxUses } = req.body;
  if (isActive !== undefined) {
    db.prepare('UPDATE invite_codes SET is_active = ? WHERE id = ?').run(
      isActive ? 1 : 0, req.params.id
    );
  }
  if (maxUses !== undefined) {
    db.prepare('UPDATE invite_codes SET max_uses = ? WHERE id = ?').run(maxUses, req.params.id);
  }
  const code = db.prepare('SELECT * FROM invite_codes WHERE id = ?').get(req.params.id);
  res.json({ code });
});

router.delete('/invite-codes/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM invite_codes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Feedback ─────────────────────────────────────────────────────────────────

router.get('/feedback', requireAdmin, (req, res) => {
  const items = db.prepare(`
    SELECT f.id, f.type, f.message, f.page_url, f.created_at,
           f.screenshot_data IS NOT NULL as has_screenshot,
           u.username, u.email as user_email
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    ORDER BY f.created_at DESC
  `).all();
  res.json({ feedback: items });
});

router.get('/feedback/:id/screenshot', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT screenshot_data FROM feedback WHERE id = ?').get(req.params.id);
  if (!row || !row.screenshot_data) return res.status(404).json({ error: 'No screenshot' });
  res.json({ screenshot_data: row.screenshot_data });
});

router.delete('/feedback/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM feedback WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Changelog ───────────────────────────────────────────────────────────────

router.get('/changelog', requireAdmin, (req, res) => {
  const entries = db.prepare(
    'SELECT * FROM changelog_entries ORDER BY entry_date DESC, created_at DESC'
  ).all();
  res.json({ entries });
});

router.post('/changelog', requireAdmin, (req, res) => {
  const { title, description, entryDate } = req.body;
  if (!title || !description || !entryDate) {
    return res.status(400).json({ error: 'title, description, and entryDate are required' });
  }
  const id = uuidv4();
  db.prepare(
    'INSERT INTO changelog_entries (id, title, description, entry_date) VALUES (?, ?, ?, ?)'
  ).run(id, title, description, entryDate);
  const entry = db.prepare('SELECT * FROM changelog_entries WHERE id = ?').get(id);
  res.json({ entry });
});

router.put('/changelog/:id', requireAdmin, (req, res) => {
  const { title, description, entryDate } = req.body;
  db.prepare(`
    UPDATE changelog_entries
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        entry_date = COALESCE(?, entry_date)
    WHERE id = ?
  `).run(title || null, description || null, entryDate || null, req.params.id);
  const entry = db.prepare('SELECT * FROM changelog_entries WHERE id = ?').get(req.params.id);
  res.json({ entry });
});

router.delete('/changelog/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM changelog_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Beta Banner ──────────────────────────────────────────────────────────────

router.get('/beta-banner', requireAdmin, (req, res) => {
  const setting = db.prepare(
    "SELECT value FROM app_settings WHERE key = 'beta_banner_enabled'"
  ).get();
  res.json({ enabled: setting ? setting.value === '1' : true });
});

router.put('/beta-banner', requireAdmin, (req, res) => {
  const { enabled } = req.body;
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('beta_banner_enabled', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(enabled ? '1' : '0');
  res.json({ success: true });
});

// ─── Activity backfill ───────────────────────────────────────────────────────
// Rebuilds reading_activity from fics.last_visited + fics.word_count.
// Groups by user_id + date, counts completed fics and sums words.
// Safe to run multiple times — uses INSERT OR REPLACE.

router.post('/backfill-activity', requireAdmin, (req, res) => {
  const { fromDate } = req.body; // optional YYYY-MM-DD lower bound

  // Fetch every fic that has a last_visited date (optionally filtered)
  const fics = fromDate
    ? db.prepare(`SELECT user_id, last_visited, word_count, completion_status FROM fics WHERE last_visited >= ? AND last_visited != ''`).all(fromDate)
    : db.prepare(`SELECT user_id, last_visited, word_count, completion_status FROM fics WHERE last_visited != '' AND last_visited IS NOT NULL`).all();

  if (!fics.length) return res.json({ inserted: 0, message: 'No fics with last_visited dates found.' });

  // Aggregate: { "userId|date" → { fics_completed, words_read } }
  const map = {};
  for (const fic of fics) {
    const date = (fic.last_visited || '').slice(0, 10); // ensure YYYY-MM-DD
    if (!date || date.length < 10) continue;
    const key = `${fic.user_id}|${date}`;
    if (!map[key]) map[key] = { user_id: fic.user_id, date, fics_completed: 0, words_read: 0 };
    if (fic.completion_status === 'complete') map[key].fics_completed += 1;
    map[key].words_read += fic.word_count || 0;
  }

  const upsert = db.prepare(`
    INSERT INTO reading_activity (id, user_id, date, fics_completed, words_read)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      fics_completed = excluded.fics_completed,
      words_read     = excluded.words_read
  `);

  const rows = Object.values(map);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) upsert.run(uuidv4(), row.user_id, row.date, row.fics_completed, row.words_read);
  });
  insertMany(rows);

  res.json({
    inserted: rows.length,
    message: `Backfilled ${rows.length} day${rows.length !== 1 ? 's' : ''} of activity across all users.`,
  });
});

module.exports = router;
