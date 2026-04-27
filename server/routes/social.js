/**
 * Social features: user following, public rec list discovery, saving rec lists
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function tryParse(val, fallback) { try { return JSON.parse(val); } catch { return fallback; } }

// ── User search (public, no auth needed) ──────────────────────────────────────
router.get('/users/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  const users = db.prepare(`
    SELECT id, username, display_name, bio FROM users
    WHERE is_public = 1 AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?)
    LIMIT 20
  `).all(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
  res.json({ users });
});

// ── Public user profile ───────────────────────────────────────────────────────
router.get('/users/:username', (req, res) => {
  const user = db.prepare(
    'SELECT id, username, display_name, bio, created_at FROM users WHERE username = ? AND is_public = 1'
  ).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found or profile is private' });

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_fics,
      COUNT(CASE WHEN shelf = 'read' THEN 1 END) as total_read,
      COALESCE(SUM(CASE WHEN shelf = 'read' THEN word_count ELSE 0 END), 0) as total_words
    FROM fics WHERE user_id = ?
  `).get(user.id);

  const recLists = db.prepare(
    'SELECT * FROM rec_lists WHERE user_id = ? AND is_public = 1 ORDER BY updated_at DESC LIMIT 10'
  ).all(user.id);

  res.json({ user, stats, recLists });
});

// ── Following (requires auth) ─────────────────────────────────────────────────
router.post('/follow/:userId', requireAuth, (req, res) => {
  if (req.params.userId === req.userId) return res.status(400).json({ error: 'Cannot follow yourself' });
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  try {
    db.prepare('INSERT INTO user_follows (id, follower_id, followed_id) VALUES (?, ?, ?)')
      .run(uuidv4(), req.userId, req.params.userId);
  } catch {} // Ignore duplicate (UNIQUE constraint)
  res.json({ success: true });
});

router.delete('/follow/:userId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM user_follows WHERE follower_id = ? AND followed_id = ?').run(req.userId, req.params.userId);
  res.json({ success: true });
});

router.get('/following', requireAuth, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name FROM user_follows uf
    JOIN users u ON uf.followed_id = u.id
    WHERE uf.follower_id = ? ORDER BY uf.created_at DESC
  `).all(req.userId);
  res.json({ users });
});

// ── Rec list discovery ────────────────────────────────────────────────────────
router.get('/reclists/discover', (req, res) => {
  const { fandom, vibe, page = 1 } = req.query;
  let where = ['rl.is_public = 1'];
  const params = [];
  if (fandom) { where.push('LOWER(rl.fandom_tag) LIKE ?'); params.push(`%${fandom.toLowerCase()}%`); }
  if (vibe) { where.push('LOWER(rl.vibe_tag) LIKE ?'); params.push(`%${vibe.toLowerCase()}%`); }

  const lists = db.prepare(`
    SELECT rl.*, u.username, u.display_name,
      (SELECT COUNT(*) FROM rec_list_items rli WHERE rli.rec_list_id = rl.id) as fic_count
    FROM rec_lists rl
    JOIN users u ON rl.user_id = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY rl.updated_at DESC
    LIMIT 20 OFFSET ?
  `).all(...params, (Number(page) - 1) * 20);

  res.json({ recLists: lists });
});

// ── Save / unsave a rec list ──────────────────────────────────────────────────
router.post('/reclists/:id/save', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id FROM rec_lists WHERE id = ? AND is_public = 1').get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Rec list not found' });
  try {
    db.prepare('INSERT INTO saved_rec_lists (id, user_id, rec_list_id) VALUES (?, ?, ?)')
      .run(uuidv4(), req.userId, req.params.id);
  } catch {}
  res.json({ success: true });
});

router.delete('/reclists/:id/save', requireAuth, (req, res) => {
  db.prepare('DELETE FROM saved_rec_lists WHERE user_id = ? AND rec_list_id = ?').run(req.userId, req.params.id);
  res.json({ success: true });
});

router.get('/reclists/saved', requireAuth, (req, res) => {
  const lists = db.prepare(`
    SELECT rl.*, u.username,
      (SELECT COUNT(*) FROM rec_list_items rli WHERE rli.rec_list_id = rl.id) as fic_count
    FROM saved_rec_lists srl
    JOIN rec_lists rl ON srl.rec_list_id = rl.id
    JOIN users u ON rl.user_id = u.id
    WHERE srl.user_id = ? ORDER BY srl.created_at DESC
  `).all(req.userId);
  res.json({ recLists: lists });
});

// ── Public rec list view ──────────────────────────────────────────────────────
router.get('/reclists/:id/public', (req, res) => {
  const list = db.prepare(`
    SELECT rl.*, u.username, u.display_name FROM rec_lists rl
    JOIN users u ON rl.user_id = u.id
    WHERE rl.id = ? AND rl.is_public = 1
  `).get(req.params.id);
  if (!list) return res.status(404).json({ error: 'Rec list not found or private' });

  const items = db.prepare(`
    SELECT rli.*, f.title, f.author, f.fandom, f.ships, f.cover_color,
           f.word_count, f.completion_status, f.content_rating, f.personal_rating
    FROM rec_list_items rli
    JOIN fics f ON rli.fic_id = f.id
    WHERE rli.rec_list_id = ? ORDER BY rli.position
  `).all(req.params.id);

  res.json({ recList: list, items: items.map(i => ({ ...i, ships: tryParse(i.ships, []) })) });
});

module.exports = router;
