const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Get custom shelves
router.get('/custom', (req, res) => {
  const shelves = db.prepare('SELECT * FROM custom_shelves WHERE user_id = ? ORDER BY created_at ASC').all(req.userId);
  res.json({ shelves });
});

// Create custom shelf
router.post('/custom', (req, res) => {
  const { name, color = '#14b8a6' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = uuidv4();
  db.prepare('INSERT INTO custom_shelves (id, user_id, name, color) VALUES (?, ?, ?, ?)').run(id, req.userId, name, color);
  res.status(201).json({ shelf: db.prepare('SELECT * FROM custom_shelves WHERE id = ?').get(id) });
});

// Delete custom shelf
router.delete('/custom/:id', (req, res) => {
  db.prepare('DELETE FROM custom_shelves WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
