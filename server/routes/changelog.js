const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: list all changelog entries (newest first)
router.get('/', (req, res) => {
  const entries = db.prepare(
    'SELECT id, title, description, entry_date, created_at FROM changelog_entries ORDER BY entry_date DESC, created_at DESC'
  ).all();
  res.json({ entries });
});

// Auth: check if there are unread changelog entries for this user
router.get('/unread', requireAuth, (req, res) => {
  const user = db.prepare('SELECT last_changelog_viewed_at FROM users WHERE id = ?').get(req.userId);
  let hasUnread = false;

  if (!user.last_changelog_viewed_at) {
    // Never visited — unread if any entries exist
    const count = db.prepare('SELECT COUNT(*) as c FROM changelog_entries').get().c;
    hasUnread = count > 0;
  } else {
    const unread = db.prepare(
      "SELECT COUNT(*) as c FROM changelog_entries WHERE created_at > ?"
    ).get(user.last_changelog_viewed_at);
    hasUnread = unread.c > 0;
  }

  res.json({ hasUnread });
});

// Auth: mark changelog as viewed — updates user's last_changelog_viewed_at
router.post('/viewed', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET last_changelog_viewed_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.userId);
  res.json({ success: true });
});

module.exports = router;
