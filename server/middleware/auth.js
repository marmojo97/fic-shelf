const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'archivd-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);

  // Try JWT first
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    return next();
  } catch (_) {
    // Not a valid JWT — try personal API token (for bookmarklet / mobile)
  }

  // Fall back to api_token lookup
  const user = db.prepare('SELECT id FROM users WHERE api_token = ?').get(token);
  if (user) {
    req.userId = user.id;
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
}

module.exports = { requireAuth, JWT_SECRET };
