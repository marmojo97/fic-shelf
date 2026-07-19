const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  try {
    const userId = req.userId;
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const allTime = year === 0; // year=0 means "All Time" — no year filter on year-scoped stats

    // ── Totals ──────────────────────────────────────────────────────────────
    // scope: all shelves for counts; read+history for words/pace
    // avg_rating: across all rated fics regardless of shelf (return NULL not 0 when unrated)
    const totals = db.prepare(`
      SELECT
        COUNT(*) as total_fics,
        COUNT(CASE WHEN shelf = 'read' THEN 1 END) as total_read,
        COUNT(CASE WHEN shelf IN ('read','history') THEN 1 END) as total_finished,
        COUNT(CASE WHEN shelf = 'reading' THEN 1 END) as currently_reading,
        COUNT(CASE WHEN shelf = 'want-to-read' THEN 1 END) as want_to_read,
        COUNT(CASE WHEN shelf = 'dnf' THEN 1 END) as dnf,
        COUNT(CASE WHEN shelf = 're-reading' THEN 1 END) as rereading,
        COUNT(CASE WHEN shelf = 'maybe' THEN 1 END) as maybe,
        COALESCE(SUM(CASE WHEN shelf IN ('read','history') THEN word_count ELSE 0 END), 0) as total_words_read,
        COALESCE(SUM(CASE WHEN shelf = 'reading' THEN word_count ELSE 0 END), 0) as words_in_progress,
        AVG(NULLIF(personal_rating, 0)) as avg_rating
      FROM fics WHERE user_id = ?
    `).get(userId);

    // ── Year stats (responds to year filter) ──────────────────────────────
    // scope: read + history; date from date_finished, fallback added_at
    let yearStats;
    if (allTime) {
      yearStats = {
        fics_this_year: totals.total_read || 0,
        words_this_year: totals.total_words_read || 0,
      };
    } else {
      yearStats = db.prepare(`
        SELECT
          COUNT(*) as fics_this_year,
          COALESCE(SUM(word_count), 0) as words_this_year
        FROM fics WHERE user_id = ? AND shelf IN ('read','history')
        AND (
          date_finished LIKE ?
          OR ((date_finished IS NULL OR date_finished = '') AND added_at LIKE ?)
        )
      `).get(userId, `${year}%`, `${year}%`);
    }

    // Annual goal
    const user = db.prepare('SELECT annual_goal FROM users WHERE id = ?').get(userId);

    // ── Top fandoms (responds to year filter) ────────────────────────────
    // scope: read + history shelves
    let byFandom;
    if (allTime) {
      byFandom = db.prepare(`
        SELECT fandom, COUNT(*) as count
        FROM fics WHERE user_id = ? AND shelf IN ('read','history') AND fandom != ''
        GROUP BY fandom ORDER BY count DESC LIMIT 10
      `).all(userId);
    } else {
      byFandom = db.prepare(`
        SELECT fandom, COUNT(*) as count
        FROM fics WHERE user_id = ? AND shelf IN ('read','history') AND fandom != ''
        AND (
          date_finished LIKE ?
          OR ((date_finished IS NULL OR date_finished = '') AND added_at LIKE ?)
        )
        GROUP BY fandom ORDER BY count DESC LIMIT 10
      `).all(userId, `${year}%`, `${year}%`);
    }

    // ── Fic breakdown by content rating ─────────────────────────────────
    // scope: shelved fics only (excludes uncategorized imports) — all time
    const byRating = db.prepare(`
      SELECT content_rating as rating, COUNT(*) as count
      FROM fics WHERE user_id = ?
      AND shelf IN ('read','history','reading','want-to-read','re-reading','dnf','maybe')
      GROUP BY content_rating ORDER BY count DESC
    `).all(userId);

    // ── Fic breakdown by completion status ───────────────────────────────
    // scope: shelved fics only — all time
    const byCompletion = db.prepare(`
      SELECT completion_status as status, COUNT(*) as count
      FROM fics WHERE user_id = ?
      AND shelf IN ('read','history','reading','want-to-read','re-reading','dnf','maybe')
      GROUP BY completion_status
    `).all(userId);

    // ── Monthly reads (responds to year filter) ──────────────────────────
    // scope: read + history; includes avg_words per month for sparkline
    let monthlyData;
    if (allTime) {
      // For All Time, just return current-year monthly data
      const monthlyReads = db.prepare(`
        SELECT
          CAST(strftime('%m', COALESCE(NULLIF(date_finished,''), added_at)) AS INTEGER) as month,
          COUNT(*) as fics,
          COALESCE(SUM(word_count), 0) as words,
          CAST(ROUND(AVG(NULLIF(word_count, 0))) AS INTEGER) as avg_words
        FROM fics
        WHERE user_id = ? AND shelf IN ('read','history')
        GROUP BY month ORDER BY month
      `).all(userId);
      monthlyData = Array.from({ length: 12 }, (_, i) => {
        const found = monthlyReads.find(r => r.month === i + 1);
        return { month: i + 1, fics: found?.fics || 0, words: found?.words || 0, avg_words: found?.avg_words || 0 };
      });
    } else {
      const monthlyReads = db.prepare(`
        SELECT
          CAST(strftime('%m', COALESCE(NULLIF(date_finished,''), added_at)) AS INTEGER) as month,
          COUNT(*) as fics,
          COALESCE(SUM(word_count), 0) as words,
          CAST(ROUND(AVG(NULLIF(word_count, 0))) AS INTEGER) as avg_words
        FROM fics
        WHERE user_id = ? AND shelf IN ('read','history')
        AND (
          date_finished LIKE ?
          OR ((date_finished IS NULL OR date_finished = '') AND added_at LIKE ?)
        )
        GROUP BY month ORDER BY month
      `).all(userId, `${year}%`, `${year}%`);
      monthlyData = Array.from({ length: 12 }, (_, i) => {
        const found = monthlyReads.find(r => r.month === i + 1);
        return { month: i + 1, fics: found?.fics || 0, words: found?.words || 0, avg_words: found?.avg_words || 0 };
      });
    }

    // ── Reading streak ────────────────────────────────────────────────────
    const activities = db.prepare(`
      SELECT date FROM reading_activity WHERE user_id = ? AND fics_completed > 0
      ORDER BY date DESC
    `).all(userId);
    const { current: streak, longest: longestStreak } = calculateStreaks(activities.map(a => a.date));

    // ── Top ships ─────────────────────────────────────────────────────────
    // scope: read + history shelves only — finished fics reflect actual taste
    const finishedFics = db.prepare(
      `SELECT ships FROM fics WHERE user_id = ? AND shelf IN ('read','history') AND ships != '[]'`
    ).all(userId);
    const shipCounts = {};
    for (const fic of finishedFics) {
      try {
        const ships = JSON.parse(fic.ships);
        for (const ship of ships) {
          if (ship) shipCounts[ship] = (shipCounts[ship] || 0) + 1;
        }
      } catch {}
    }
    const topShips = Object.entries(shipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([ship, count]) => ({ ship, count }));

    // ── Top tags ──────────────────────────────────────────────────────────
    // scope: read + history shelves only — finished fics reflect actual taste
    const finishedFicTags = db.prepare(
      `SELECT tags FROM fics WHERE user_id = ? AND shelf IN ('read','history') AND tags != '[]'`
    ).all(userId);
    const tagCounts = {};
    for (const fic of finishedFicTags) {
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

    // ── Rating distribution ───────────────────────────────────────────────
    const ratingDist = db.prepare(`
      SELECT
        CAST(ROUND(personal_rating * 2) / 2 AS TEXT) as rating,
        COUNT(*) as count
      FROM fics WHERE user_id = ? AND personal_rating > 0
      GROUP BY rating ORDER BY CAST(rating AS REAL)
    `).all(userId);

    // ── Derived stats ─────────────────────────────────────────────────────

    // Completion rate — read / (read + dnf)
    const startedCount = (totals.total_read || 0) + (totals.dnf || 0);
    const completionRate = startedCount > 0
      ? Math.round((totals.total_read / startedCount) * 100)
      : null;

    // Avg word count — read + history only · all time
    const avgWordCountRow = db.prepare(
      `SELECT ROUND(AVG(word_count)) as avg FROM fics WHERE user_id = ? AND shelf IN ('read','history') AND word_count > 0`
    ).get(userId);

    // Avg word count by year — read + history
    const avgWordsByYear = db.prepare(`
      SELECT
        CAST(strftime('%Y', COALESCE(NULLIF(date_finished,''), added_at)) AS TEXT) as yr,
        ROUND(AVG(word_count)) as avg_words,
        COUNT(*) as fic_count
      FROM fics WHERE user_id = ? AND shelf IN ('read','history') AND word_count > 0
      GROUP BY yr ORDER BY yr DESC LIMIT 5
    `).all(userId);

    // Longest fic ever read — read + history · all time
    const longestFic = db.prepare(
      `SELECT id, title, author, fandom, word_count, cover_color
       FROM fics WHERE user_id = ? AND shelf IN ('read','history') AND word_count > 0
       ORDER BY word_count DESC LIMIT 1`
    ).get(userId);

    // Reading pace (words/day and fics/month since first completed fic) — read + history
    const firstFinished = db.prepare(
      `SELECT MIN(COALESCE(NULLIF(date_finished,''), added_at)) as first_date
       FROM fics WHERE user_id = ? AND shelf IN ('read','history')`
    ).get(userId);
    let readingPaceWpd = null;
    let ficsPerMonth = null;
    if (firstFinished?.first_date && totals.total_words_read > 0) {
      const daysSince = Math.max(1, Math.round(
        (Date.now() - new Date(firstFinished.first_date).getTime()) / 86400000
      ));
      readingPaceWpd = Math.round(totals.total_words_read / daysSince);
      const monthsSince = Math.max(1, Math.round(daysSince / 30));
      ficsPerMonth = Math.round((totals.total_read || 0) / monthsSince * 10) / 10;
    }

    // ── DNF stats ─────────────────────────────────────────────────────────
    const dnfCount = totals.dnf || 0;
    const dnfBase = (totals.total_read || 0) + dnfCount;
    const dnfRate = dnfBase > 0 ? Math.round((dnfCount / dnfBase) * 100) : 0;
    const topDnfFandoms = db.prepare(`
      SELECT fandom, COUNT(*) as count
      FROM fics WHERE user_id = ? AND shelf = 'dnf' AND fandom != ''
      GROUP BY fandom ORDER BY count DESC LIMIT 3
    `).all(userId);
    const dnfStats = { count: dnfCount, rate: dnfRate, topFandoms: topDnfFandoms };

    // ── Shelf distribution (for reading breakdown donut) ─────────────────
    const shelfDist = db.prepare(`
      SELECT
        CASE WHEN shelf IS NULL OR shelf = '' THEN 'uncategorized' ELSE shelf END as shelf,
        COUNT(*) as count
      FROM fics WHERE user_id = ?
      GROUP BY shelf
    `).all(userId);

    // ── Reader personality ────────────────────────────────────────────────
    const wrappedLabel = computeReadingPersonality({
      topTags, topShips, totals, avgWordCount: avgWordCountRow?.avg,
    });

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
      longestStreak,
      topShips,
      topTags,
      ratingDist,
      completionRate,
      avgWordCount: avgWordCountRow?.avg || 0,
      avgWordsByYear,
      longestFic: longestFic || null,
      readingPaceWpd,
      ficsPerMonth,
      wrappedLabel,
      dnfStats,
      shelfDist,
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

// Returns both current streak and all-time longest streak from reading_activity dates
function calculateStreaks(dates) {
  if (!dates.length) return { current: 0, longest: 0 };
  const today = new Date().toISOString().split('T')[0];
  const uniqueDates = [...new Set(dates)];

  // Current streak — walk backwards from today
  const descSorted = uniqueDates.slice().sort().reverse();
  let current = 0;
  let cursor = today;
  for (const date of descSorted) {
    if (date === cursor) {
      current++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().split('T')[0];
    } else if (date < cursor) {
      break;
    }
  }

  // Longest streak — scan chronologically for consecutive days
  const ascSorted = uniqueDates.slice().sort();
  let longest = ascSorted.length > 0 ? 1 : 0;
  let run = 1;
  for (let i = 1; i < ascSorted.length; i++) {
    const prev = new Date(ascSorted[i - 1]);
    const curr = new Date(ascSorted[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  return { current, longest };
}

module.exports = router;
