import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, Copy, RefreshCw, CheckCircle2, AlertCircle,
  Loader2, BookOpen, Info, CircleDashed, BookMarked,
} from 'lucide-react';
import { getApiToken, regenerateApiToken } from '../api/index.js';

// The API base URL — same logic as api/index.js
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : `${window.location.origin}/api`;

/**
 * Builds the javascript: bookmarklet URL from the source template.
 * shelf: 'history' for the "Add to Archivd" bookmarklet, 'maybe' for "Save to Maybe"
 * frontendUrl: the Archivd app origin (e.g. https://archivd.vercel.app) for shelf links
 */
function buildBookmarklet(apiUrl, token, shelf = 'history', frontendUrl = '') {
  const addingMsg = shelf === 'maybe' ? 'Saving to Maybe…' : 'Marking as read…';
  // For Maybe: toast links to the Maybe shelf. For read: toast links to Read shelf.
  const successHtml = shelf === 'maybe'
    ? `✓ Saved to Maybe! <a href="${frontendUrl}/shelf?shelf=maybe" target="_blank" style="color:#7dd3b0;text-decoration:underline;margin-left:4px;">View shelf →</a>`
    : `✓ Marked as read! <a href="${frontendUrl}/shelf?shelf=read" target="_blank" style="color:#7dd3b0;text-decoration:underline;margin-left:4px;">View shelf →</a>`;
  const dateFinishedField = shelf === 'read' ? ',dateFinished:today' : '';
  const src = `(function(){var m=location.href.match(/archiveofourown\\.org\\/works\\/(\\d+)/);if(!m){alert('Open an AO3 work page first!');return;}var id=m[1];var q=function(s){var e=document.querySelector(s);return e?e.textContent.trim():'';};var qa=function(s){return Array.from(document.querySelectorAll(s)).map(function(e){return e.textContent.trim();}).join('; ');};var title=q('h2.title.heading')||q('.title.heading');var author=q('a[rel="author"]')||'Anonymous';var fandoms=qa('.fandom.tags a.tag');var rating=q('.rating.tags a');var warnings=qa('.warning.tags a.tag');var ships=qa('.relationship.tags a.tag');var chars=qa('.character.tags a.tag');var tags=qa('.freeform.tags a.tag');var words=q('dd.words').replace(/,/g,'')||'0';var chaps=q('dd.chapters')||'?/?';var sv=q('dd.status');var comp=sv==='Completed'?'Complete Work':'Work in Progress';var sumEl=document.querySelector('.summary .userstuff')||document.querySelector('blockquote.userstuff');var summary=sumEl?sumEl.textContent.replace(/\\s+/g,' ').trim():'';var today=new Date().toISOString().slice(0,10);var payload={title:title,author:author,fandoms:fandoms,fandom:fandoms.split('; ')[0]||'',rating:rating,warnings:warnings,relationships:ships,characters:chars,freeforms:tags,words:words,chapters:chaps,completion:comp,summary:summary,sourceUrl:'https://archiveofourown.org/works/'+id,lastVisited:today,shelf:'${shelf}'${dateFinishedField}};var t=document.createElement('div');t.style.cssText='position:fixed;top:20px;right:20px;z-index:2147483647;background:#1a2e2e;color:#e2e8f0;padding:14px 20px;border-radius:14px;font-family:-apple-system,sans-serif;font-size:14px;max-width:300px;box-shadow:0 8px 32px rgba(0,0,0,.5);border:1px solid #2d4f4f;transition:opacity .3s';t.textContent='${addingMsg}';document.body.appendChild(t);fetch('${apiUrl}/fics/quick-add',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ${token}'},body:JSON.stringify(payload)}).then(function(r){return r.json();}).then(function(d){if(d.error)throw new Error(d.error);t.style.background='#1a3a2a';t.style.borderColor='#2d7a4f';t.innerHTML='${successHtml}';setTimeout(function(){t.style.opacity='0';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},4000);}).catch(function(e){t.style.background='#3a1a1a';t.style.borderColor='#7a2d2d';t.textContent='✗ '+(e.message||'Could not add fic');setTimeout(function(){t.style.opacity='0';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},3500);});})();`;
  return `javascript:${encodeURIComponent(src)}`;
}

/**
 * Builds the "Mark chapter read" bookmarklet.
 * Works on AO3 work pages AND individual chapter pages.
 * Detects the current chapter number from the chapter select dropdown.
 * If the fic is already in the library it updates chapters_read.
 * If new, it adds it to the Reading shelf.
 */
function buildChapterBookmarklet(apiUrl, token, frontendUrl = '') {
  const src = `(function(){var m=location.href.match(/archiveofourown\\.org\\/works\\/(\\d+)/);if(!m){alert('Open an AO3 work or chapter page first!');return;}var workId=m[1];var chapterNum=1;var sel=document.querySelector('select#selected_id');if(sel){chapterNum=sel.selectedIndex+1;}else{var chEl=document.querySelector('dd.chapters');if(chEl){var parts=chEl.textContent.trim().split('/');chapterNum=parseInt(parts[0])||1;}}var q=function(s){var e=document.querySelector(s);return e?e.textContent.trim():'';};var qa=function(s){return Array.from(document.querySelectorAll(s)).map(function(e){return e.textContent.trim();}).join('; ');};var title=q('h2.title.heading')||q('.title.heading');var author=q('a[rel="author"]')||'Anonymous';var fandoms=qa('.fandom.tags a.tag');var rating=q('.rating.tags a');var warnings=qa('.warning.tags a.tag');var ships=qa('.relationship.tags a.tag');var chars=qa('.character.tags a.tag');var tags=qa('.freeform.tags a.tag');var words=q('dd.words').replace(/,/g,'')||'0';var chaps=q('dd.chapters')||'?/?';var sv=q('dd.status');var comp=sv==='Completed'?'Complete Work':'Work in Progress';var sumEl=document.querySelector('.summary .userstuff')||document.querySelector('blockquote.userstuff');var summary=sumEl?sumEl.textContent.replace(/\\s+/g,' ').trim():'';var t=document.createElement('div');t.style.cssText='position:fixed;top:20px;right:20px;z-index:2147483647;background:#1a2e2e;color:#e2e8f0;padding:14px 20px;border-radius:14px;font-family:-apple-system,sans-serif;font-size:14px;max-width:300px;box-shadow:0 8px 32px rgba(0,0,0,.5);border:1px solid #2d4f4f;transition:opacity .3s';t.textContent='Logging chapter '+chapterNum+'…';document.body.appendChild(t);fetch('${apiUrl}/fics/mark-chapter',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ${token}'},body:JSON.stringify({workId:workId,chapterNum:chapterNum,title:title,author:author,fandoms:fandoms,fandom:fandoms.split('; ')[0]||'',rating:rating,warnings:warnings,relationships:ships,characters:chars,freeforms:tags,words:words,chapters:chaps,completion:comp,summary:summary})}).then(function(r){return r.json();}).then(function(d){if(d.error)throw new Error(d.error);t.style.background='#1a3a2a';t.style.borderColor='#2d7a4f';t.innerHTML='✓ Ch. '+d.chapterNum+' logged'+(d.updated?'':' — added to Reading')+' <a href="${frontendUrl}/shelf?shelf=reading" target="_blank" style="color:#7dd3b0;text-decoration:underline;margin-left:4px;">View →</a>';setTimeout(function(){t.style.opacity='0';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},4000);}).catch(function(e){t.style.background='#3a1a1a';t.style.borderColor='#7a2d2d';t.textContent='✗ '+(e.message||'Could not log chapter');setTimeout(function(){t.style.opacity='0';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},3500);});})();`;
  return `javascript:${encodeURIComponent(src)}`;
}

export default function Settings() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMaybe, setCopiedMaybe] = useState(false);
  const [copiedChapter, setCopiedChapter] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [error, setError] = useState('');

  const loadToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getApiToken();
      setToken(data.apiToken);
    } catch {
      setError('Could not load your API token. Try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadToken(); }, [loadToken]);

  const appOrigin             = window.location.origin;
  const bookmarkletUrl        = token ? buildBookmarklet(API_BASE, token, 'read',  appOrigin) : '';
  const bookmarkletMaybeUrl   = token ? buildBookmarklet(API_BASE, token, 'maybe', appOrigin) : '';
  const bookmarkletChapterUrl = token ? buildChapterBookmarklet(API_BASE, token, appOrigin)   : '';

  async function handleRegenerate() {
    if (!confirmRegen) { setConfirmRegen(true); return; }
    setRegenerating(true);
    setConfirmRegen(false);
    try {
      const { data } = await regenerateApiToken();
      setToken(data.apiToken);
    } catch {
      setError('Could not regenerate token.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookmarkletUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select the textarea
    }
  }

  async function handleCopyMaybe() {
    try {
      await navigator.clipboard.writeText(bookmarkletMaybeUrl);
      setCopiedMaybe(true);
      setTimeout(() => setCopiedMaybe(false), 2500);
    } catch {}
  }

  async function handleCopyChapter() {
    try {
      await navigator.clipboard.writeText(bookmarkletChapterUrl);
      setCopiedChapter(true);
      setTimeout(() => setCopiedChapter(false), 2500);
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-txt-primary text-2xl font-bold">Settings</h1>
        <p className="text-txt-muted text-sm mt-1">Manage your account and integrations.</p>
      </div>

      {/* ── Bookmarklet / Mobile section ── */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-txt-primary font-semibold">Add fics from your phone</h2>
            <p className="text-txt-muted text-sm">
              Tap a bookmarklet while browsing AO3 — instantly logs the fic as Read with today as your finish date.
            </p>
          </div>
        </div>
        <p className="text-txt-muted text-xs -mt-2">
          You have two bookmarklets: one marks fics you've finished (Read), one saves fics you might read (Maybe).
        </p>

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-900/20 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-txt-muted text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading your token…</span>
          </div>
        ) : token ? (
          <>
            {/* Desktop: drag-to-bookmarks */}
            <div className="hidden sm:block">
              <p className="text-txt-secondary text-sm font-medium mb-2">
                On desktop — drag this to your bookmarks bar:
              </p>
              <a
                href={bookmarkletUrl}
                onClick={(e) => { e.preventDefault(); alert("Drag this link to your bookmarks bar — don't click it here!"); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-elevated border border-border rounded-xl text-txt-primary text-sm font-medium hover:border-accent/50 cursor-grab active:cursor-grabbing transition-colors"
                draggable="true"
              >
                <BookOpen className="w-4 h-4 text-accent" />
                ✓ Mark as Read
              </a>
            </div>

            {/* Mobile: copy-the-code instructions */}
            <div>
              <p className="text-txt-secondary text-sm font-medium mb-2 flex items-center gap-1.5">
                On mobile — follow these steps:
              </p>
              <ol className="text-txt-muted text-sm space-y-2 list-none">
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap <strong className="text-txt-secondary">Copy code</strong> below</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">2</span>
                  <span>In Safari, bookmark <em>any</em> page (tap Share → Add Bookmark)</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Edit that bookmark: change its name to <strong className="text-txt-secondary">✓ Mark as Read</strong> and paste the copied code as the URL</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">4</span>
                  <span>While reading a fic on AO3, open your bookmarks and tap it — done!</span>
                </li>
              </ol>

              <button
                onClick={handleCopy}
                className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  copied
                    ? 'bg-green-900/30 border border-green-700/40 text-green-400'
                    : 'bg-elevated border border-border text-txt-primary hover:border-accent/50'
                }`}
              >
                {copied ? (
                  <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy bookmarklet code</>
                )}
              </button>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 text-txt-muted text-xs bg-elevated rounded-xl p-3">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-accent/60" />
              <span>
                Your bookmarklet contains a personal token that lets it add fics to your account.
                Don't share the code with anyone. If you think it's been compromised, regenerate it below.
              </span>
            </div>

            {/* Regenerate */}
            <div className="pt-1 border-t border-border">
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  confirmRegen
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                {regenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {confirmRegen
                  ? 'Click again to confirm — old bookmarklet will stop working'
                  : 'Regenerate token'}
              </button>
              {confirmRegen && (
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="text-xs text-txt-muted hover:text-txt-primary mt-1 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        ) : null}
      </section>

      {/* ── Save to Maybe bookmarklet ── */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CircleDashed className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-txt-primary font-semibold">Save to Maybe</h2>
            <p className="text-txt-muted text-sm">
              Found a fic online you might want to read? Tap this on the AO3 page to save it to your Maybe pile — without committing to it.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-txt-muted text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading your token…</span>
          </div>
        ) : token ? (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              <p className="text-txt-secondary text-sm font-medium mb-2">On desktop — drag to your bookmarks bar:</p>
              <a
                href={bookmarkletMaybeUrl}
                onClick={(e) => { e.preventDefault(); alert("Drag this link to your bookmarks bar — don't click it here!"); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-elevated border border-border rounded-xl text-txt-primary text-sm font-medium hover:border-accent/50 cursor-grab active:cursor-grabbing transition-colors"
                draggable="true"
              >
                <CircleDashed className="w-4 h-4 text-accent" />
                Save to Maybe
              </a>
            </div>

            {/* Mobile */}
            <div>
              <p className="text-txt-secondary text-sm font-medium mb-2 flex items-center gap-1.5">On mobile — follow these steps:</p>
              <ol className="text-txt-muted text-sm space-y-2 list-none">
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap <strong className="text-txt-secondary">Copy code</strong> below</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">2</span>
                  <span>In Safari, bookmark any page (tap Share → Add Bookmark)</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Edit that bookmark: rename it <strong className="text-txt-secondary">Save to Maybe</strong> and paste the code as the URL</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">4</span>
                  <span>On any AO3 fic page, tap it — saved to Maybe instantly!</span>
                </li>
              </ol>

              <button
                onClick={handleCopyMaybe}
                className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  copiedMaybe
                    ? 'bg-green-900/30 border border-green-700/40 text-green-400'
                    : 'bg-elevated border border-border text-txt-primary hover:border-accent/50'
                }`}
              >
                {copiedMaybe ? (
                  <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Maybe bookmarklet code</>
                )}
              </button>
            </div>
          </>
        ) : null}
      </section>

      {/* ── Mark Chapter Read bookmarklet ── */}
      <section className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookMarked className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-txt-primary font-semibold">Mark chapter as read</h2>
            <p className="text-txt-muted text-sm">
              Reading an ongoing fic? Tap this on any AO3 chapter page to log your progress. It knows which chapter you're on automatically.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-txt-muted text-xs bg-elevated rounded-xl p-3">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-accent/60" />
          <span>
            Works on individual chapter pages (<span className="font-mono text-accent/70">…/chapters/…</span>) and on the main work page. If the fic isn't in your library yet it gets added to your Reading shelf automatically.
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-txt-muted text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading your token…</span>
          </div>
        ) : token ? (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              <p className="text-txt-secondary text-sm font-medium mb-2">On desktop — drag to your bookmarks bar:</p>
              <a
                href={bookmarkletChapterUrl}
                onClick={(e) => { e.preventDefault(); alert("Drag this link to your bookmarks bar — don't click it here!"); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-elevated border border-border rounded-xl text-txt-primary text-sm font-medium hover:border-accent/50 cursor-grab active:cursor-grabbing transition-colors"
                draggable="true"
              >
                <BookMarked className="w-4 h-4 text-accent" />
                + Log chapter
              </a>
            </div>

            {/* Mobile */}
            <div>
              <p className="text-txt-secondary text-sm font-medium mb-2">On mobile:</p>
              <ol className="text-txt-muted text-sm space-y-2 list-none">
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap <strong className="text-txt-secondary">Copy code</strong> below</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">2</span>
                  <span>In Safari, bookmark any page (tap Share → Add Bookmark)</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Edit that bookmark: rename it <strong className="text-txt-secondary">+ Log chapter</strong> and paste the code as the URL</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="w-5 h-5 bg-accent/20 text-accent rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">4</span>
                  <span>On any AO3 chapter page, tap it — your progress is logged instantly</span>
                </li>
              </ol>

              <button
                onClick={handleCopyChapter}
                className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  copiedChapter
                    ? 'bg-green-900/30 border border-green-700/40 text-green-400'
                    : 'bg-elevated border border-border text-txt-primary hover:border-accent/50'
                }`}
              >
                {copiedChapter ? (
                  <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy chapter bookmarklet code</>
                )}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
