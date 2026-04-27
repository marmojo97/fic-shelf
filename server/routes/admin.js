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
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  // Active = has updated any fic in the last 7 days OR has logged in (we track nothing for logins,
  // so fall back to: registered in last 7 days OR has fics updated in last 7 days)
  const activeUsers = db.prepare(`
    SELECT COUNT(DISTINCT id) as count FROM users
    WHERE id IN (
      SELECT DISTINCT user_id FROM fics
      WHERE updated_at > datetime('now', '-7 days')
    ) OR created_at > datetime('now', '-7 days')
  `).get().count;

  const users = db.prepare(`
    SELECT u.id, u.email, u.username, u.display_name, u.created_at,
           (SELECT COUNT(*) FROM fics WHERE user_id = u.id) as fic_count
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  res.json({ totalUsers, activeUsers, users });
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

module.exports = router;
