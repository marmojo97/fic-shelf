/**
 * WIP Update Checker
 * Runs as a background cron job. For each user's fics that are:
 *   - on the 'reading' or 'want-to-read' shelf
 *   - marked as 'in-progress' completion status
 *   - have an AO3 source URL
 *   - haven't been checked in 24h
 * ...it fetches the AO3 page and checks if chapter count has increased.
 * If so, it creates a notification for the user and badges the fic.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const AO3_DELAY_MS = 2000; // Be polite — 2 seconds between requests
const CHECK_INTERVAL_HOURS = 24;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAo3ChapterCount(workUrl) {
  try {
    const workId = workUrl.match(/works\/(\d+)/)?.[1];
    if (!workId) return null;

    const url = `https://archiveofourown.org/works/${workId}?view_adult=true`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FicShelf/2.0; personal reading tracker)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Parse chapter count from the stats section
    // AO3 format: "Chapters: 12/40" or "Chapters: 12/?"
    const chapterMatch = html.match(/Chapters:<\/dt>\s*<dd[^>]*>([\d?]+)\/([\d?]+)<\/dd>/i)
      || html.match(/chapters['">\s]+(\d+)\/(\d+|\?)/i);

    if (!chapterMatch) return null;

    const currentChapters = parseInt(chapterMatch[1]) || null;
    const totalChapters = chapterMatch[2] === '?' ? null : (parseInt(chapterMatch[2]) || null);

    // Also try to get last updated date
    const updatedMatch = html.match(/Updated:<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/i);
    const lastUpdated = updatedMatch ? updatedMatch[1].trim() : null;

    return { currentChapters, totalChapters, lastUpdated };
  } catch (e) {
    if (e.name === 'TimeoutError') return null;
    return null;
  }
}

async function checkWipsForUser(userId) {
  const cutoff = new Date(Date.now() - CHECK_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

  const wips = db.prepare(`
    SELECT id, title, author, source_url, chapter_count, ao3_chapter_count_cached, last_checked_at
    FROM fics
    WHERE user_id = ?
      AND completion_status = 'in-progress'
      AND source_url LIKE '%archiveofourown.org/works/%'
      AND (last_checked_at IS NULL OR last_checked_at < ?)
    LIMIT 20
  `).all(userId, cutoff);

  let checkedCount = 0;

  for (const fic of wips) {
    await sleep(AO3_DELAY_MS);

    const result = await fetchAo3ChapterCount(fic.source_url);
    const now = new Date().toISOString();

    // Always update last_checked_at
    db.prepare('UPDATE fics SET last_checked_at = ? WHERE id = ?').run(now, fic.id);

    if (!result) continue;

    const { currentChapters, totalChapters, lastUpdated } = result;
    const previousCount = fic.ao3_chapter_count_cached || fic.chapter_count;

    // Update cached values
    const newStatus = totalChapters && currentChapters >= totalChapters ? 'complete' : 'in-progress';
    db.prepare(`
      UPDATE fics
      SET ao3_chapter_count_cached = ?,
          last_checked_at = ?,
          completion_status = CASE WHEN ? = 'complete' THEN 'complete' ELSE completion_status END,
          last_updated_date = COALESCE(?, last_updated_date)
      WHERE id = ?
    `).run(currentChapters, now, newStatus, lastUpdated, fic.id);

    // If chapter count increased — fire notification
    if (currentChapters && previousCount && currentChapters > previousCount) {
      const newChapters = currentChapters - previousCount;
      const notifId = uuidv4();
      db.prepare(`
        INSERT INTO notifications (id, user_id, fic_id, type, title, body)
        VALUES (?, ?, ?, 'wip_update', ?, ?)
      `).run(
        notifId, userId, fic.id,
        `Update: ${fic.title}`,
        `${newChapters} new chapter${newChapters > 1 ? 's' : ''} posted (now ${currentChapters}${totalChapters ? `/${totalChapters}` : '/?' }).`
      );

      // Badge the fic card
      db.prepare('UPDATE fics SET has_update = 1 WHERE id = ?').run(fic.id);
    }

    checkedCount++;
  }

  return checkedCount;
}

async function runGlobalWipCheck() {
  console.log('[WIP Checker] Starting global check...');
  const users = db.prepare('SELECT DISTINCT user_id FROM fics WHERE completion_status = ? AND source_url LIKE ?')
    .all('in-progress', '%archiveofourown.org%');

  let total = 0;
  for (const { user_id } of users) {
    try {
      const count = await checkWipsForUser(user_id);
      total += count;
    } catch (e) {
      console.error(`[WIP Checker] Error for user ${user_id}:`, e.message);
    }
    await sleep(5000); // 5s gap between users
  }

  console.log(`[WIP Checker] Done. Checked ${total} fics across ${users.length} users.`);
}

module.exports = { runGlobalWipCheck, checkWipsForUser };
