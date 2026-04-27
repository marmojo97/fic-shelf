const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get banner state: is it enabled globally, and has THIS user dismissed it?
router.get('/', requireAuth, (req, res) => {
  const setting = db.prepare(
    "SELECT value FROM app_settings WHERE key = 'beta_banner_enabled'"
  ).get();
  // Default to enabled if no setting exists yet
  const enabled = setting ? setting.value === '1' : true;

  const user = db.prepare('SELECT banner_dismissed FROM users WHERE id = ?').get(req.userId);
  const dismissed = user?.banner_dismissed === 1;

  res.json({ enabled, dismissed });
});

// Dismiss banner for this user (persists per account)
router.post('/dismiss', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET banner_dismissed = 1 WHERE id = ?').run(req.userId);
  res.json({ success: true });
});

module.exports = router;
