const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/settings/token — fetch (or generate) the user's personal API token
router.get('/token', (req, res) => {
  const user = db.prepare('SELECT api_token FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let token = user.api_token;
  if (!token) {
    token = uuidv4();
    db.prepare('UPDATE users SET api_token = ? WHERE id = ?').run(token, req.userId);
  }

  res.json({ apiToken: token });
});

// POST /api/settings/token/regenerate — issue a fresh token (invalidates the old one)
router.post('/token/regenerate', (req, res) => {
  const token = uuidv4();
  db.prepare('UPDATE users SET api_token = ? WHERE id = ?').run(token, req.userId);
  res.json({ apiToken: token });
});

module.exports = router;
