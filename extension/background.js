/**
 * Background service worker for Archivd extension.
 * Handles messages from content scripts and popup.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Archivd] Extension installed.');
});

// Pass fic data from content script to popup (via storage as a relay)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FIC_DATA') {
    chrome.storage.session.set({ currentFic: msg.data });
    sendResponse({ ok: true });
  }
  return true;
});
