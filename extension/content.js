/**
 * Archivd content script
 * Runs on AO3 work pages and FFN story pages.
 * Extracts fic metadata and injects the "Save to Archivd" button.
 */

(function () {
  'use strict';

  const isAo3 = location.hostname === 'archiveofourown.org';
  const isFfn = location.hostname.includes('fanfiction.net');

  // ── AO3 scraper ──────────────────────────────────────────────────────────────
  function scrapeAo3() {
    const getText = (sel, ctx = document) => ctx.querySelector(sel)?.textContent?.trim() || '';
    const getAll = (sel, ctx = document) => [...ctx.querySelectorAll(sel)].map(el => el.textContent.trim()).filter(Boolean);

    const workMeta = document.querySelector('.work.meta.group');
    if (!workMeta) return null;

    const title = getText('h2.title.heading');
    const author = getText('h3.byline a') || getText('h3.byline');
    const fandom = getAll('dd.fandom a')[0] || '';
    const ships = getAll('dd.relationship a');
    const characters = getAll('dd.character a');
    const tags = getAll('dd.freeform a');
    const warnings = getAll('dd.warning a').filter(w => w !== 'No Archive Warnings Apply' && !w.includes('Chose Not'));
    const ratingRaw = getText('dd.rating a');
    const statusRaw = getText('dd.status a') || getText('dd.status');
    const wordsRaw = getText('dd.words').replace(/,/g, '');
    const chaptersRaw = getText('dd.chapters');
    const language = getText('dd.language');
    const seriesEl = document.querySelector('dd.series span.series a');
    const seriesName = seriesEl ? seriesEl.textContent.trim() : '';
    const updatedRaw = getText('dd.status') !== '' ? getText('dt.status + dd') : '';
    const summary = getText('div.summary blockquote');

    const RATING_MAP = { 'General Audiences': 'G', 'Teen And Up Audiences': 'T', 'Mature': 'M', 'Explicit': 'E' };
    const contentRating = RATING_MAP[ratingRaw] || 'T';

    const chapterParts = chaptersRaw.split('/');
    const currentChapters = parseInt(chapterParts[0]) || 1;
    const totalChapters = chapterParts[1] && chapterParts[1] !== '?' ? parseInt(chapterParts[1]) : null;
    const completionStatus = (statusRaw.toLowerCase() === 'completed' || (totalChapters && currentChapters >= totalChapters)) ? 'complete' : 'in-progress';

    const workId = location.pathname.match(/works\/(\d+)/)?.[1];
    const sourceUrl = workId ? `https://archiveofourown.org/works/${workId}` : location.href;

    return {
      title,
      author,
      fandom: fandom.split(',')[0].trim(),
      ships,
      characters,
      tags,
      contentWarnings: warnings,
      contentRating,
      wordCount: parseInt(wordsRaw) || 0,
      chapterCount: totalChapters || currentChapters,
      chaptersRead: currentChapters,
      completionStatus,
      language: language || 'English',
      seriesName,
      sourceUrl,
      sourcePlatform: 'ao3',
      summary,
      lastUpdatedDate: '',
    };
  }

  // ── FFN scraper ───────────────────────────────────────────────────────────────
  function scrapeFfn() {
    const title = document.querySelector('#profile_top b.xcontrast_txt')?.textContent?.trim() || document.title;
    const author = document.querySelector('#profile_top a.xcontrast_txt')?.textContent?.trim() || '';
    const summary = document.querySelector('#profile_top div.xcontrast_txt')?.textContent?.trim() || '';

    // FFN metadata is in the gray stats bar
    const statsEl = document.querySelector('#profile_top span.xgray');
    const statsText = statsEl?.textContent || '';

    const wordMatch = statsText.match(/Words:\s*([\d,]+)/i);
    const chapterMatch = statsText.match(/Chapters:\s*(\d+)/i);
    const statusMatch = statsText.match(/Status:\s*Complete/i);
    const ratingMatch = statsText.match(/Rated:\s*(K\+?|T|M)/i);
    const genreMatch = statsText.match(/[A-Z][a-z]+\/[A-Z][a-z]+|Friendship|Romance|Drama|Adventure|Humor/g);
    const langMatch = statsText.match(/Language:\s*([A-Za-z]+)/i);

    const RATING_MAP = { 'K': 'G', 'K+': 'G', 'T': 'T', 'M': 'M' };

    // Fandom from breadcrumb
    const crumbs = [...document.querySelectorAll('#pre_story_links a')];
    const fandom = crumbs[crumbs.length - 1]?.textContent?.trim() || '';

    const storyId = location.pathname.match(/\/s\/(\d+)/)?.[1];

    return {
      title,
      author,
      fandom,
      ships: [],
      characters: [],
      tags: genreMatch || [],
      contentWarnings: [],
      contentRating: RATING_MAP[ratingMatch?.[1]] || 'T',
      wordCount: parseInt((wordMatch?.[1] || '0').replace(/,/g, '')) || 0,
      chapterCount: parseInt(chapterMatch?.[1]) || 1,
      chaptersRead: 0,
      completionStatus: statusMatch ? 'complete' : 'in-progress',
      language: langMatch?.[1] || 'English',
      seriesName: '',
      sourceUrl: storyId ? `https://www.fanfiction.net/s/${storyId}` : location.href,
      sourcePlatform: 'ffn',
      summary,
      lastUpdatedDate: '',
    };
  }

  // ── Inject save button ────────────────────────────────────────────────────────
  function injectButton(ficData) {
    if (document.getElementById('archivd-save-btn')) return; // Already injected

    const btn = document.createElement('div');
    btn.id = 'archivd-save-btn';
    btn.innerHTML = `
      <button class="archivd-btn" id="archivd-trigger">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save to Archivd
      </button>
    `;

    btn.querySelector('#archivd-trigger').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'FIC_DATA', data: ficData });
      // Open popup
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      btn.querySelector('#archivd-trigger').textContent = '✓ Opening Archivd…';
      btn.querySelector('#archivd-trigger').disabled = true;
    });

    // Inject into page
    if (isAo3) {
      const actions = document.querySelector('ul.work.navigation.actions') || document.querySelector('#workskin') || document.body;
      actions.insertAdjacentElement('afterbegin', btn);
    } else if (isFfn) {
      const profile = document.querySelector('#profile_top');
      if (profile) profile.insertAdjacentElement('afterend', btn);
      else document.body.insertAdjacentElement('afterbegin', btn);
    }
  }

  // ── Main ──────────────────────────────────────────────────────────────────────
  const ficData = isAo3 ? scrapeAo3() : isFfn ? scrapeFfn() : null;

  if (ficData && ficData.title) {
    // Store for popup to read
    chrome.runtime.sendMessage({ type: 'FIC_DATA', data: ficData });
    injectButton(ficData);
  }
})();
