import React, { useState } from 'react';
import { X, ExternalLink, Heart, BookOpen, Calendar, RotateCcw, Bookmark, Trash2, Zap, Edit3, ChevronDown } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { StatusBadge, ContentRatingBadge, ShelfBadge } from './Badge.jsx';
import { updateFic, deleteFic } from '../api/index.js';

const SHELVES = [
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'reading',      label: 'Currently Reading' },
  { value: 'read',         label: 'Read' },
  { value: 'dnf',          label: 'Did Not Finish' },
  { value: 're-reading',   label: 'Re-reading' },
];

function formatWordCount(n) {
  if (!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M words`;
  if (n >= 1000) return `${Math.round(n / 1000)}k words`;
  return `${n} words`;
}

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
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
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(fic.personalNotes || '');
  const [rating, setRating] = useState(fic.personalRating || 0);
  const [shelf, setShelf] = useState(fic.shelf);
  const [chaptersRead, setChaptersRead] = useState(fic.chaptersRead || 0);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emotionalDamage, setEmotionalDamage] = useState(fic.emotionalDamage);

  const readingSpeed = 250; // wpm default
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
      });
      onUpdate(data.fic);
      setEditingNotes(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteFic(fic.id);
      onDelete(fic.id);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRatingChange(newRating) {
    setRating(newRating);
    try {
      const { data } = await updateFic(fic.id, { personalRating: newRating });
      onUpdate(data.fic);
    } catch {}
  }

  async function handleShelfChange(newShelf) {
    setShelf(newShelf);
    try {
      const { data } = await updateFic(fic.id, { shelf: newShelf });
      onUpdate(data.fic);
    } catch {}
  }

  async function handleEmotionalDamageToggle() {
    const newVal = !emotionalDamage;
    setEmotionalDamage(newVal);
    try {
      const { data } = await updateFic(fic.id, { emotionalDamage: newVal });
      onUpdate(data.fic);
    } catch {}
  }

  const progress = fic.chapterCount > 1 && fic.chaptersRead > 0
    ? Math.round((fic.chaptersRead / fic.chapterCount) * 100)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 modal-overlay"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-surface border-l border-border-subtle z-50 flex flex-col drawer-panel overflow-hidden">
        {/* Header */}
        <div
          className="h-28 flex-shrink-0 relative"
          style={{ backgroundColor: fic.coverColor || '#0d4f4f' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          <div className="absolute top-3 right-3">
            <button onClick={onClose} className="p-1.5 bg-black/30 hover:bg-black/50 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="absolute bottom-3 left-4 right-12">
            <div className="flex items-center gap-2 mb-1">
              <ContentRatingBadge rating={fic.contentRating} />
              <StatusBadge status={fic.completionStatus} compact />
              {emotionalDamage && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-medium">
                  <Zap className="w-3 h-3" fill="currentColor" /> Emotional Damage
                </span>
              )}
            </div>
            <p className="text-white/60 text-xs">{fic.fandom}</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {/* Title + author */}
            <div>
              <h2 className="text-txt-primary font-bold text-lg leading-snug">{fic.title}</h2>
              <p className="text-txt-secondary text-sm mt-0.5">by {fic.author}</p>
              {fic.sourceUrl && (
                <a href={fic.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent text-xs mt-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> View on {fic.sourcePlatform || 'source'}
                </a>
              )}
            </div>

            {/* Ships + characters */}
            {(fic.ships?.length > 0 || fic.characters?.length > 0) && (
              <div className="space-y-1.5">
                {fic.ships?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fic.ships.map((ship, i) => (
                      <span key={i} className="chip bg-pink-500/10 text-pink-300">
                        <Heart className="w-2.5 h-2.5" /> {ship}
                      </span>
                    ))}
                  </div>
                )}
                {fic.characters?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fic.characters.map((char, i) => (
                      <span key={i} className="chip bg-elevated text-txt-secondary">{char}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-2.5 bg-elevated rounded-xl p-4">
              <MetaRow label="Words">
                <span className="font-medium">{formatWordCount(fic.wordCount)}</span>
              </MetaRow>
              <MetaRow label="Chapters">
                <span>{fic.chapterCount || '?'} chapters</span>
                {fic.chapterCount > 0 && estimatedHours > 0 && (
                  <span className="text-txt-muted text-xs ml-2">
                    ~{estimatedHours}h {remainingMinutes > 0 ? `${remainingMinutes}m` : ''} to read
                  </span>
                )}
              </MetaRow>
              {fic.seriesName && <MetaRow label="Series"><span>{fic.seriesName}</span></MetaRow>}
              {fic.language && fic.language !== 'English' && (
                <MetaRow label="Language"><span>{fic.language}</span></MetaRow>
              )}
              {fic.lastUpdatedDate && (
                <MetaRow label="Updated"><span>{formatDate(fic.lastUpdatedDate)}</span></MetaRow>
              )}
              {fic.dateStarted && (
                <MetaRow label="Started">
                  <span>{formatDate(fic.dateStarted)}</span>
                </MetaRow>
              )}
              {fic.dateFinished && (
                <MetaRow label="Finished">
                  <span>{formatDate(fic.dateFinished)}</span>
                </MetaRow>
              )}
              {fic.rereadCount > 0 && (
                <MetaRow label="Re-reads">
                  <span className="flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> {fic.rereadCount}x
                  </span>
                </MetaRow>
              )}
            </div>

            {/* Reading progress */}
            {fic.chapterCount > 1 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-txt-secondary text-sm font-medium">Reading Progress</span>
                  <span className="text-txt-muted text-xs">{chaptersRead} / {fic.chapterCount} chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${Math.min(100, (chaptersRead / fic.chapterCount) * 100)}%` }}
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={fic.chapterCount}
                    value={chaptersRead}
                    onChange={(e) => setChaptersRead(Math.min(fic.chapterCount, Math.max(0, Number(e.target.value))))}
                    onBlur={handleSave}
                    className="w-16 input-field text-center text-sm py-1"
                  />
                </div>
              </div>
            )}

            {/* Warnings + tags */}
            {fic.contentWarnings?.length > 0 && (
              <div>
                <p className="text-txt-muted text-xs mb-1.5 uppercase tracking-wider font-semibold">Content Warnings</p>
                <div className="flex flex-wrap gap-1.5">
                  {fic.contentWarnings.map((w, i) => (
                    <span key={i} className="chip bg-red-500/10 text-red-400">{w}</span>
                  ))}
                </div>
              </div>
            )}
            {fic.tags?.length > 0 && (
              <div>
                <p className="text-txt-muted text-xs mb-1.5 uppercase tracking-wider font-semibold">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {fic.tags.map((t, i) => (
                    <span key={i} className="chip bg-elevated text-txt-secondary">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Personal rating */}
            <div>
              <p className="text-txt-muted text-xs mb-2 uppercase tracking-wider font-semibold">Your Rating</p>
              <StarRating value={rating} onChange={handleRatingChange} size={22} />
            </div>

            {/* Shelf selector */}
            <div>
              <p className="text-txt-muted text-xs mb-2 uppercase tracking-wider font-semibold">Shelf</p>
              <div className="flex flex-wrap gap-1.5">
                {SHELVES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleShelfChange(s.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      shelf === s.value
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'border-border text-txt-muted hover:border-border hover:text-txt-secondary'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Personal notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-txt-muted text-xs uppercase tracking-wider font-semibold">Notes</p>
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
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-sm mt-2">
                    {saving ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              ) : (
                <p className={`text-sm leading-relaxed ${notes ? 'text-txt-secondary' : 'text-txt-muted italic'}`}>
                  {notes || 'No notes yet. Add your thoughts!'}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
              <button
                onClick={handleEmotionalDamageToggle}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
                  emotionalDamage
                    ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                    : 'border-border text-txt-muted hover:text-pink-300 hover:border-pink-500/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5" fill={emotionalDamage ? 'currentColor' : 'none'} />
                Emotional Damage
              </button>

              <div className="flex-1" />

              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-txt-muted">Sure?</span>
                  <button onClick={handleDelete} className="text-xs px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-2 bg-elevated text-txt-muted rounded-lg hover:text-txt-secondary">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border text-txt-muted hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  );
}
