import React, { useState } from 'react';
import { X, ExternalLink, Heart, RotateCcw, Trash2, Zap, Edit3, Save, Calendar } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { StatusBadge, ContentRatingBadge } from './Badge.jsx';
import { updateFic, deleteFic } from '../api/index.js';

const SHELVES = [
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'reading',      label: 'Currently Reading' },
  { value: 'read',         label: 'Read' },
  { value: 'dnf',          label: 'Did Not Finish' },
  { value: 're-reading',   label: 'Re-reading' },
  { value: 'history',      label: 'History' },
];

function formatWordCount(n) {
  if (!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M words`;
  if (n >= 1000) return `${Math.round(n / 1000)}k words`;
  return `${n} words`;
}

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

function FieldLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted mb-1.5">
      {children}
    </p>
  );
}

function MetaRow({ label, children }) {
  return (
    <div className="flex gap-2">
      <span className="text-txt-muted text-xs w-24 flex-shrink-0 pt-0.5">{label}</span>
      <div className="text-txt-secondary text-sm flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function FicDrawer({ fic, onClose, onUpdate, onDelete }) {
  const [notes, setNotes]               = useState(fic.personalNotes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [rating, setRating]             = useState(fic.personalRating || 0);
  const [shelf, setShelf]               = useState(fic.shelf);
  const [chaptersRead, setChaptersRead] = useState(fic.chaptersRead || 0);
  const [emotionalDamage, setEmotionalDamage] = useState(fic.emotionalDamage);
  const [dateFinished, setDateFinished] = useState(fic.dateFinished || '');
  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDirty =
    rating        !== (fic.personalRating || 0) ||
    shelf         !== fic.shelf ||
    chaptersRead  !== (fic.chaptersRead || 0) ||
    emotionalDamage !== fic.emotionalDamage ||
    dateFinished  !== (fic.dateFinished || '');

  const readingSpeed = 250;
  const estimatedMinutes = fic.wordCount ? Math.round(fic.wordCount / readingSpeed) : 0;
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await updateFic(fic.id, {
        personalNotes: notes,
        personalRating: rating,
        shelf,
        chaptersRead: Number(chaptersRead),
        emotionalDamage,
        dateFinished: dateFinished || '',
      });
      onUpdate(data.fic);
      setEditingNotes(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      const { data } = await updateFic(fic.id, { personalNotes: notes });
      onUpdate(data.fic);
      setEditingNotes(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    try { await deleteFic(fic.id); onDelete(fic.id); }
    catch (e) { console.error(e); }
  }

  function handleShelfClick(newShelf) {
    setShelf(newShelf);
    if (newShelf === 'read' && !dateFinished) setShowDatePrompt(true);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 modal-overlay" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-surface border-l border-border z-50 flex flex-col drawer-panel overflow-hidden shadow-[−20px_0_40px_rgba(0,0,0,0.2)]">

        {/* ── Color band header — 96px, title inside ── */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{ height: 96, background: 'linear-gradient(135deg, #5C0000 0%, #990000 55%, #B22222 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Fandom + Title + Author stacked at bottom of band */}
          <div className="absolute bottom-3 left-5 right-12 z-10">
            <p className="text-white/70 text-[11px] mb-1 truncate">{fic.fandom}</p>
            <h2
              className="text-white leading-tight truncate"
              style={{
                fontFamily: "'Roboto', ui-sans-serif, sans-serif",
                fontSize: 22,
                fontWeight: 500,
                fontStyle: 'italic',
                letterSpacing: '-0.005em',
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}
            >
              {fic.title}
            </h2>
            <p className="text-white/80 text-xs mt-0.5">by {fic.author}</p>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">

            {/* Status row + source link */}
            <div className="flex items-center gap-2 flex-wrap">
              <ContentRatingBadge rating={fic.contentRating} />
              <StatusBadge status={fic.completionStatus} compact />
              {emotionalDamage && (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-700 border border-pink-200 font-medium">
                  <Zap className="w-3 h-3 text-pink-500" fill="currentColor" /> Emotional Damage
                </span>
              )}
              {fic.sourceUrl && (
                <a
                  href={fic.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent text-xs hover:underline ml-auto"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on {fic.sourcePlatform || 'source'}
                </a>
              )}
            </div>

            {/* Description / summary */}
            {fic.description && (
              <div>
                <FieldLabel>Description</FieldLabel>
                <div className="text-sm leading-relaxed text-txt-secondary bg-elevated rounded-xl px-4 py-3 border border-border-subtle italic">
                  {fic.description}
                </div>
              </div>
            )}

            {/* Ships + characters */}
            {(fic.ships?.length > 0 || fic.characters?.length > 0) && (
              <div className="space-y-1.5">
                {fic.ships?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fic.ships.map((ship, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                        <Heart className="w-2.5 h-2.5" fill="currentColor" /> {ship}
                      </span>
                    ))}
                  </div>
                )}
                {fic.characters?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fic.characters.map((char, i) => (
                      <span key={i} className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-elevated text-txt-secondary border border-border-subtle">{char}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata block */}
            <div className="space-y-2.5 bg-elevated rounded-xl p-4 border border-border-subtle">
              <MetaRow label="Words">
                <span className="font-medium">{formatWordCount(fic.wordCount)}</span>
                {estimatedHours > 0 && (
                  <span className="text-txt-muted text-xs ml-2">
                    ~{estimatedHours}h {remainingMinutes > 0 ? `${remainingMinutes}m` : ''} to read
                  </span>
                )}
              </MetaRow>
              <MetaRow label="Chapters"><span>{fic.chapterCount || '?'} chapters</span></MetaRow>
              {fic.seriesName && <MetaRow label="Series"><span>{fic.seriesName}</span></MetaRow>}
              {fic.language && fic.language !== 'English' && (
                <MetaRow label="Language"><span>{fic.language}</span></MetaRow>
              )}
              {fic.lastUpdatedDate && (
                <MetaRow label="Updated"><span>{formatDate(fic.lastUpdatedDate)}</span></MetaRow>
              )}
              {fic.lastVisited && (
                <MetaRow label="Last Visited"><span>{formatDate(fic.lastVisited)}</span></MetaRow>
              )}
              {fic.totalVisits > 0 && (
                <MetaRow label="Visits"><span>{fic.totalVisits} {fic.totalVisits === 1 ? 'time' : 'times'}</span></MetaRow>
              )}
              {fic.dateStarted && (
                <MetaRow label="Started"><span>{formatDate(fic.dateStarted)}</span></MetaRow>
              )}
              {(dateFinished || fic.dateFinished) && (
                <MetaRow label="Finished"><span>{formatDate(dateFinished || fic.dateFinished)}</span></MetaRow>
              )}
              {fic.rereadCount > 0 && (
                <MetaRow label="Re-reads">
                  <span className="flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> {fic.rereadCount}×
                  </span>
                </MetaRow>
              )}
            </div>

            {/* Reading progress */}
            {fic.chapterCount > 1 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel>Reading Progress</FieldLabel>
                  <span className="text-txt-muted text-xs">{chaptersRead} / {fic.chapterCount} chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden border border-border-subtle">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${Math.min(100, (chaptersRead / fic.chapterCount) * 100)}%` }}
                    />
                  </div>
                  <input
                    type="number" min="0" max={fic.chapterCount}
                    value={chaptersRead}
                    onChange={(e) => setChaptersRead(Math.min(fic.chapterCount, Math.max(0, Number(e.target.value))))}
                    className="w-16 input-field text-center text-sm py-1"
                  />
                </div>
              </div>
            )}

            {/* Content warnings */}
            {fic.contentWarnings?.length > 0 && (
              <div>
                <FieldLabel>Content Warnings</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {fic.contentWarnings.map((w, i) => (
                    <span key={i} className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {fic.tags?.length > 0 && (
              <div>
                <FieldLabel>Tags</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {fic.tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-elevated text-txt-secondary border border-border-subtle">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Your Rating */}
            <div>
              <FieldLabel>Your Rating</FieldLabel>
              <StarRating value={rating} onChange={setRating} size={22} />
              {rating > 0 && (
                <p className="text-txt-muted text-xs mt-1.5 italic">
                  {['', "Didn't enjoy it", "It was okay", "Liked it", "Really liked it", "Absolutely loved it"][rating]}
                </p>
              )}
            </div>

            {/* Shelf */}
            <div>
              <FieldLabel>Shelf</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {SHELVES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleShelfClick(s.value)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      shelf === s.value
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-txt-muted hover:border-accent hover:text-accent'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date finished prompt */}
            {showDatePrompt && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-700" />
                  <p className="text-green-800 text-sm font-medium">When did you finish this?</p>
                </div>
                <input
                  type="date" className="input-field text-sm"
                  value={dateFinished}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDateFinished(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowDatePrompt(false)} className="btn-primary text-xs py-1.5 px-3">
                    Set date
                  </button>
                  <button
                    onClick={() => { setDateFinished(''); setShowDatePrompt(false); }}
                    className="text-xs text-txt-muted hover:text-txt-secondary px-2"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* Private notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Private Notes</FieldLabel>
                <button
                  onClick={() => setEditingNotes(!editingNotes)}
                  className="text-xs text-accent hover:text-accent-dim flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> {editingNotes ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingNotes ? (
                <div>
                  <textarea
                    className="input-field text-sm min-h-[100px] resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Your private thoughts, feelings, and reactions..."
                  />
                  <button onClick={handleSaveNotes} disabled={saving} className="btn-primary text-sm mt-2">
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              ) : (
                <div className={`text-sm leading-relaxed rounded-xl px-4 py-3 ${
                  notes
                    ? 'bg-elevated border border-border-subtle italic text-txt-primary'
                    : 'text-txt-muted italic'
                }`}>
                  {notes ? `"${notes}"` : 'No notes yet. Add your thoughts!'}
                </div>
              )}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
              <button
                onClick={() => setEmotionalDamage(!emotionalDamage)}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                  emotionalDamage
                    ? 'bg-pink-50 border-pink-300 text-pink-700'
                    : 'border-border text-txt-muted hover:text-pink-600 hover:border-pink-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" fill={emotionalDamage ? 'currentColor' : 'none'} />
                Emotional Damage
              </button>

              <div className="flex-1" />

              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-txt-muted">Sure?</span>
                  <button onClick={handleDelete} className="text-xs px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-2 bg-elevated text-txt-muted rounded-lg hover:text-txt-secondary border border-border">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border text-txt-muted hover:text-red-600 hover:border-red-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            <div className="h-20" />
          </div>
        </div>

        {/* Sticky save bar */}
        {isDirty && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-border bg-surface shadow-lg flex items-center justify-between gap-3">
            <p className="text-txt-muted text-xs">You have unsaved changes</p>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
