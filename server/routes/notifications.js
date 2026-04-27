const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications — list notifications for current user
router.get('/', (req, res) => {
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.userId);
  const unread = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.userId);
  res.json({ notifications, unreadCount: unread.count });
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// DELETE /api/notifications/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// POST /api/notifications/wip-check — manually trigger WIP check for current user
router.post('/wip-check', async (req, res) => {
  try {
    const { checkWipsForUser } = require('../jobs/wipChecker');
    const count = await checkWipsForUser(req.userId);
    res.json({ success: true, checked: count });
  } catch (e) {
    res.status(500).json({ error: 'WIP check failed', detail: e.message });
  }
});

module.exports = router;
