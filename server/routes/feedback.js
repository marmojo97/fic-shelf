const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Submit feedback (authenticated users only)
router.post('/', requireAuth, (req, res) => {
  const { type, message, pageUrl, screenshotData } = req.body;
  if (!type || !message) {
    return res.status(400).json({ error: 'type and message are required' });
  }
  const validTypes = ['bug', 'feature', 'general'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'type must be bug, feature, or general' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO feedback (id, user_id, type, message, page_url, screenshot_data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, type, message.trim(), pageUrl || '', screenshotData || null);

  // Optional: email notification to admin
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (ADMIN_EMAIL && RESEND_API_KEY) {
    const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(req.userId);
    sendFeedbackEmail(ADMIN_EMAIL, RESEND_API_KEY, { type, message, pageUrl, user }).catch(
      (err) => console.error('[Email] Feedback notification failed:', err.message)
    );
  }

  res.json({ success: true, id });
});

async function sendFeedbackEmail(adminEmail, apiKey, { type, message, pageUrl, user }) {
  const typeLabel = { bug: '🐛 Bug Report', feature: '✨ Feature Request', general: '💬 General Feedback' }[type] || type;
  const body = JSON.stringify({
    from: 'Archivd Beta <onboarding@resend.dev>',
    to: adminEmail,
    subject: `[Archivd Beta] ${typeLabel}: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`,
    html: `
      <h2>${typeLabel}</h2>
      <p><strong>From:</strong> ${user?.username || 'unknown'} (${user?.email || ''})</p>
      <p><strong>Page:</strong> ${pageUrl || '—'}</p>
      <hr />
      <p style="white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    `
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error: ${res.status} ${text}`);
  }
}

module.exports = router;
