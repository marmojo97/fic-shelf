const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  try {
  const userId = req.userId;
  const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

  // Total counts
  // NOTE: stats only count fics explicitly on the 'read' shelf.
  // History, want-to-read, reading, dnf, re-reading do NOT count toward totals.
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_fics,
      COUNT(CASE WHEN shelf = 'read' THEN 1 END) as total_read,
      COUNT(CASE WHEN shelf = 'reading' THEN 1 END) as currently_reading,
      COUNT(CASE WHEN shelf = 'want-to-read' THEN 1 END) as want_to_read,
      COUNT(CASE WHEN shelf = 'dnf' THEN 1 END) as dnf,
      COUNT(CASE WHEN shelf = 're-reading' THEN 1 END) as rereading,
      COALESCE(SUM(CASE WHEN shelf = 'read' THEN word_count ELSE 0 END), 0) as total_words_read,
      COALESCE(SUM(CASE WHEN shelf = 'reading' THEN word_count ELSE 0 END), 0) as words_in_progress,
      COALESCE(AVG(CASE WHEN personal_rating > 0 THEN personal_rating END), 0) as avg_rating
    FROM fics WHERE user_id = ?
  `).get(userId);

  // This year's stats — read + history only
  const yearStats = db.prepare(`
    SELECT
      COUNT(*) as fics_this_year,
      COALESCE(SUM(word_count), 0) as words_this_year
    FROM fics WHERE user_id = ? AND shelf = 'read'
    AND (
      date_finished LIKE ?
      OR ((date_finished IS NULL OR date_finished = '') AND added_at LIKE ?)
    )
  `).get(userId, `${year}%`, `${year}%`);

  // Annual goal
  const user = db.prepare('SELECT annual_goal FROM users WHERE id = ?').get(userId);

  // Fics by fandom (top 10)
  const byFandom = db.prepare(`
    SELECT fandom, COUNT(*) as count
    FROM fics WHERE user_id = ? AND fandom != ''
    GROUP BY fandom ORDER BY count DESC LIMIT 10
  `).all(userId);

  // Fics by content rating
  const byRating = db.prepare(`
    SELECT content_rating as rating, COUNT(*) as count
    FROM fics WHERE user_id = ?
    GROUP BY content_rating ORDER BY count DESC
  `).all(userId);

  // Fics by completion status
  const byCompletion = db.prepare(`
    SELECT completion_status as status, COUNT(*) as count
    FROM fics WHERE user_id = ?
    GROUP BY completion_status
  `).all(userId);

  // Monthly reads this year — read + history only
  // Handles date_finished = a real date, empty string, or NULL (skipped date prompt)
  const monthlyReads = db.prepare(`
    SELECT
      CAST(strftime('%m', COALESCE(NULLIF(date_finished,''), added_at)) AS INTEGER) as month,
      COUNT(*) as fics,
      COALESCE(SUM(word_count), 0) as words
    FROM fics
    WHERE user_id = ? AND shelf = 'read'
    AND (
      date_finished LIKE ?
      OR ((date_finished IS NULL OR date_finished = '') AND added_at LIKE ?)
    )
    GROUP BY month ORDER BY month
  `).all(userId, `${year}%`, `${year}%`);

  // Fill in missing months
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyReads.find(r => r.month === i + 1);
    return { month: i + 1, fics: found?.fics || 0, words: found?.words || 0 };
  });

  // Reading streak
  const activities = db.prepare(`
    SELECT date FROM reading_activity WHERE user_id = ? AND fics_completed > 0
    ORDER BY date DESC
  `).all(userId);

  const streak = calculateStreak(activities.map(a => a.date));

  // Top ships
  const allFics = db.prepare('SELECT ships FROM fics WHERE user_id = ? AND ships != \'[]\'').all(userId);
  const shipCounts = {};
  for (const fic of allFics) {
    try {
      const ships = JSON.parse(fic.ships);
      for (const ship of ships) {
        if (ship) shipCounts[ship] = (shipCounts[ship] || 0) + 1;
      }
    } catch {}
  }
  const topShips = Object.entries(shipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ship, count]) => ({ ship, count }));

  // Top tags
  const allFicTags = db.prepare('SELECT tags FROM fics WHERE user_id = ? AND tags != \'[]\'').all(userId);
  const tagCounts = {};
  for (const fic of allFicTags) {
    try {
      const tags = JSON.parse(fic.tags);
      for (const tag of tags) {
        if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    } catch {}
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  // Rating distribution
  const ratingDist = db.prepare(`
    SELECT
      CAST(ROUND(personal_rating * 2) / 2 AS TEXT) as rating,
      COUNT(*) as count
    FROM fics WHERE user_id = ? AND personal_rating > 0
    GROUP BY rating ORDER BY CAST(rating AS REAL)
  `).all(userId);

  // V2: Completion rate — (read+history) / (read+history+dnf)
  // Per spec: DNF rate = dnf / (read + history + dnf)
  const startedCount = (totals.total_read || 0) + (totals.dnf || 0);
  const completionRate = startedCount > 0 ? Math.round((totals.total_read / startedCount) * 100) : null;

  // V2: Average word count — read + history only
  const avgWordCount = db.prepare(
    `SELECT ROUND(AVG(word_count)) as avg FROM fics WHERE user_id = ? AND shelf = 'read' AND word_count > 0`
  ).get(userId);

  // V2: Average word count by year — read + history only
  const avgWordsByYear = db.prepare(`
    SELECT
      CAST(strftime('%Y', COALESCE(NULLIF(date_finished,''), added_at)) AS TEXT) as yr,
      ROUND(AVG(word_count)) as avg_words,
      COUNT(*) as fic_count
    FROM fics WHERE user_id = ? AND shelf = 'read' AND word_count > 0
    GROUP BY yr ORDER BY yr DESC LIMIT 5
  `).all(userId);

  // V2: Longest fic ever read (trophy card) — read + history only
  const longestFic = db.prepare(
    `SELECT id, title, author, fandom, word_count, cover_color FROM fics WHERE user_id = ? AND shelf = 'read' AND word_count > 0 ORDER BY word_count DESC LIMIT 1`
  ).get(userId);

  // V2: Reading pace (words/day since first completed fic) — read + history only
  const firstFinished = db.prepare(
    `SELECT MIN(COALESCE(NULLIF(date_finished,''), added_at)) as first_date FROM fics WHERE user_id = ? AND shelf = 'read'`
  ).get(userId);
  let readingPaceWpd = null;
  if (firstFinished?.first_date && totals.total_words_read > 0) {
    const daysSince = Math.max(1, Math.round((Date.now() - new Date(firstFinished.first_date).getTime()) / 86400000));
    readingPaceWpd = Math.round(totals.total_words_read / daysSince);
  }

  // V2: Fic Wrapped — reading personality label
  const wrappedLabel = computeReadingPersonality({ topTags, topShips, totals, avgWordCount: avgWordCount?.avg });

  res.json({
    totals,
    wordsInProgress: totals.words_in_progress || 0,
    yearStats,
    annualGoal: user?.annual_goal || 50,
    year,
    byFandom,
    byRating,
    byCompletion,
    monthlyData,
    streak,
    topShips,
    topTags,
    ratingDist,
    // V2 additions
    completionRate,
    avgWordCount: avgWordCount?.avg || 0,
    avgWordsByYear,
    longestFic: longestFic || null,
    readingPaceWpd,
    wrappedLabel,
  });
  } catch (err) {
    console.error('[Stats] Error computing stats:', err);
    res.status(500).json({ error: 'Failed to compute stats', detail: err.message });
  }
});

function computeReadingPersonality({ topTags, topShips, totals, avgWordCount }) {
  const tags = topTags.map(t => t.tag.toLowerCase());
  const hasTag = (...words) => words.some(w => tags.some(t => t.includes(w)));
  if (avgWordCount > 150000) return 'Long Haul Reader';
  if (hasTag('slow burn', 'slowburn')) return 'Slow Burn Devotee';
  if ((totals.dnf || 0) > (totals.total_read || 0) * 0.3) return 'WIP Collector';
  if (hasTag('hurt/comfort', 'angst')) return 'Certified Angst Lord';
  if (hasTag('fluff', 'comfort')) return 'Comfort Fic Connoisseur';
  if (topShips.length > 8) return 'Ship Multitasker';
  return 'Dedicated Archivist';
}

function calculateStreak(dates) {
  if (!dates.length) return 0;
  const today = new Date().toISOString().split('T')[0];
  const sorted = [...new Set(dates)].sort().reverse();

  let streak = 0;
  let current = today;

  for (const date of sorted) {
    if (date === current) {
      streak++;
      const d = new Date(current);
      d.setDate(d.getDate() - 1);
      current = d.toISOString().split('T')[0];
    } else if (date < current) {
      break;
    }
  }
  return streak;
}

module.exports = router;
