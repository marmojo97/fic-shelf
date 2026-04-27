const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function tryParse(val, fallback) {
  try { return JSON.parse(val); } catch { return fallback; }
}

function parseFic(fic) {
  if (!fic) return null;
  return { ...fic, ships: tryParse(fic.ships, []), tags: tryParse(fic.tags, []) };
}

// List rec lists
router.get('/', (req, res) => {
  const lists = db.prepare('SELECT * FROM rec_lists WHERE user_id = ? ORDER BY updated_at DESC').all(req.userId);
  const result = lists.map(list => {
    const items = db.prepare(`
      SELECT rli.*, f.title, f.author, f.fandom, f.ships, f.cover_color, f.personal_rating,
             f.word_count, f.completion_status, f.content_rating
      FROM rec_list_items rli
      JOIN fics f ON rli.fic_id = f.id
      WHERE rli.rec_list_id = ?
      ORDER BY rli.position
    `).all(list.id);
    return { ...list, items: items.map(i => ({ ...i, fic: parseFic(i) })) };
  });
  res.json({ recLists: result });
});

// Create rec list
router.post('/', (req, res) => {
  const { title, description = '', isPublic = false } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const id = uuidv4();
  db.prepare('INSERT INTO rec_lists (id, user_id, title, description, is_public) VALUES (?, ?, ?, ?, ?)').run(
    id, req.userId, title, description, isPublic ? 1 : 0
  );
  res.status(201).json({ recList: db.prepare('SELECT * FROM rec_lists WHERE id = ?').get(id) });
});

// Update rec list
router.put('/:id', (req, res) => {
  const list = db.prepare('SELECT * FROM rec_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!list) return res.status(404).json({ error: 'Rec list not found' });

  const { title, description, isPublic } = req.body;
  db.prepare('UPDATE rec_lists SET title = COALESCE(?, title), description = COALESCE(?, description), is_public = COALESCE(?, is_public), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title, description, isPublic !== undefined ? (isPublic ? 1 : 0) : null, req.params.id);

  res.json({ recList: db.prepare('SELECT * FROM rec_lists WHERE id = ?').get(req.params.id) });
});

// Delete rec list
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM rec_lists WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// Add fic to rec list
router.post('/:id/fics', (req, res) => {
  const list = db.prepare('SELECT * FROM rec_lists WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!list) return res.status(404).json({ error: 'Rec list not found' });

  const { ficId, note = '' } = req.body;
  const fic = db.prepare('SELECT id FROM fics WHERE id = ? AND user_id = ?').get(ficId, req.userId);
  if (!fic) return res.status(404).json({ error: 'Fic not found' });

  const existing = db.prepare('SELECT id FROM rec_list_items WHERE rec_list_id = ? AND fic_id = ?').get(req.params.id, ficId);
  if (existing) return res.status(409).json({ error: 'Fic already in list' });

  const maxPos = db.prepare('SELECT MAX(position) as m FROM rec_list_items WHERE rec_list_id = ?').get(req.params.id);
  const id = uuidv4();
  db.prepare('INSERT INTO rec_list_items (id, rec_list_id, fic_id, position, note) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, ficId, (maxPos?.m || 0) + 1, note);

  db.prepare('UPDATE rec_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.status(201).json({ success: true });
});

// Remove fic from rec list
router.delete('/:id/fics/:ficId', (req, res) => {
  db.prepare('DELETE FROM rec_list_items WHERE rec_list_id = ? AND fic_id = ?').run(req.params.id, req.params.ficId);
  res.json({ success: true });
});

module.exports = router;
