const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { email, username, password, displayName, inviteCode } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Invite-only gate
  const INVITE_ONLY = process.env.INVITE_ONLY === 'true' || process.env.INVITE_ONLY === '1';
  let resolvedCode = null;
  if (INVITE_ONLY) {
    if (!inviteCode) {
      return res.status(400).json({ error: 'An invite code is required to register' });
    }
    const normalised = inviteCode.toUpperCase().trim();
    resolvedCode = db.prepare(
      "SELECT * FROM invite_codes WHERE code = ? AND is_active = 1"
    ).get(normalised);
    if (!resolvedCode) {
      return res.status(400).json({ error: 'Invalid or inactive invite code' });
    }
    if (resolvedCode.max_uses > 0 && resolvedCode.use_count >= resolvedCode.max_uses) {
      return res.status(400).json({ error: 'This invite code has already been used the maximum number of times' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, username, display_name) VALUES (?, ?, ?, ?, ?)'
  ).run(id, email.toLowerCase().trim(), passwordHash, username.trim(), displayName || username.trim());

  // Record invite code usage
  if (resolvedCode) {
    db.prepare('UPDATE invite_codes SET use_count = use_count + 1 WHERE id = ?').run(resolvedCode.id);
    db.prepare(
      'INSERT INTO invite_code_uses (id, invite_code_id, user_id, email) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), resolvedCode.id, id, email.toLowerCase().trim());
  }

  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });
  const user = db.prepare('SELECT id, email, username, display_name, bio, reading_speed, annual_goal, onboarding_done FROM users WHERE id = ?').get(id);
  res.json({ token, user });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, username, display_name, bio, reading_speed, annual_goal, is_public, onboarding_done, created_at FROM users WHERE id = ?'
  ).get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// Mark onboarding complete for the current user
router.post('/onboarding-done', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(req.userId);
  res.json({ success: true });
});

// Public: tell the frontend whether invite codes are required
router.get('/invite-required', (req, res) => {
  const required = process.env.INVITE_ONLY === 'true' || process.env.INVITE_ONLY === '1';
  res.json({ required });
});

// Update profile
router.put('/me', requireAuth, (req, res) => {
  const { displayName, bio, readingSpeed, annualGoal, isPublic } = req.body;
  db.prepare(
    'UPDATE users SET display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), reading_speed = COALESCE(?, reading_speed), annual_goal = COALESCE(?, annual_goal), is_public = COALESCE(?, is_public) WHERE id = ?'
  ).run(displayName, bio, readingSpeed, annualGoal, isPublic !== undefined ? (isPublic ? 1 : 0) : null, req.userId);
  const user = db.prepare(
    'SELECT id, email, username, display_name, bio, reading_speed, annual_goal, is_public FROM users WHERE id = ?'
  ).get(req.userId);
  res.json({ user });
});

module.exports = router;
