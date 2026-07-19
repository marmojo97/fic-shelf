import React, { useState } from 'react';
import { Heart, BookOpen, Zap, X, Check } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { ContentRatingBadge } from './Badge.jsx';
import { updateFic } from '../api/index.js';

function formatWordCount(n) {
  if (!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M words`;
  if (n >= 1000) return `${Math.round(n / 1000)}k words`;
  return `${n} words`;
}

/** Small modal that appears right after hearting a fic for the first time */
function FaveNotePrompt({ fic, onSave, onSkip }) {
  const [note, setNote] = useState(fic.personalNotes || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await updateFic(fic.id, { personalNotes: note });
      onSave(data.fic);
    } catch {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 modal-overlay"
        onClick={onSkip}
      />

      {/* Prompt card */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm mx-4 bg-surface border border-border rounded-2xl shadow-2xl p-5 modal-content">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Heart className="w-4 h-4 text-red-400" fill="#f87171" />
              <span className="text-txt-primary font-semibold text-sm">Added to Faves</span>
            </div>
            <p className="text-txt-muted text-xs line-clamp-1">{fic.title}</p>
          </div>
          <button
            onClick={onSkip}
            className="text-txt-muted hover:text-txt-primary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-txt-secondary text-xs mb-2">
          What do you love about it? This shows on your Faves card.
        </p>

        <textarea
          autoFocus
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. The slow burn is everything, I cried three times…"
          rows={3}
          className="w-full text-sm bg-elevated border border-border rounded-xl px-3 py-2.5 text-txt-primary placeholder:text-txt-muted resize-none focus:outline-none focus:border-accent/60 transition-colors"
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={onSkip}
            className="flex-1 px-3 py-2 text-sm text-txt-muted hover:text-txt-secondary border border-border rounded-xl transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !note.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-accent text-white rounded-xl disabled:opacity-40 transition-opacity hover:bg-accent/90"
          >
            {saving ? (
              <span>Saving…</span>
            ) : (
              <><Check className="w-3.5 h-3.5" /> Save note</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default function FicCard({ fic, onClick, onUpdate }) {
  const primaryShip = fic.ships?.[0] || '';
  const hasEmotionalDamage = fic.emotionalDamage;

  const [isFavorite, setIsFavorite] = useState(fic.isFavorite || false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleHeartClick(e) {
    e.stopPropagation(); // don't open the drawer
    if (saving) return;

    const next = !isFavorite;
    setIsFavorite(next);
    setSaving(true);

    try {
      const { data } = await updateFic(fic.id, { isFavorite: next });
      onUpdate?.(data.fic);
      // If just favorited and there's no note yet, prompt for one
      if (next && !fic.personalNotes) {
        setShowNotePrompt(true);
      }
    } catch {
      setIsFavorite(!next); // revert on error
    } finally {
      setSaving(false);
    }
  }

  function handleNoteSaved(updatedFic) {
    setShowNotePrompt(false);
    onUpdate?.(updatedFic);
  }

  function handleNoteSkipped() {
    setShowNotePrompt(false);
  }

  return (
    <>
      <article
        className="bg-white border border-border-subtle rounded-xl overflow-hidden flex flex-col cursor-pointer
                   shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                   hover:border-border hover:-translate-y-0.5
                   hover:shadow-[0_18px_36px_rgba(0,0,0,0.18)]
                   transition-all duration-200"
        onClick={() => onClick(fic)}
      >
        {/* Fandom color banner — 80px */}
        <div
          className="h-20 w-full flex-shrink-0 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #5C0000 0%, #990000 55%, #B22222 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" />

          {/* Rating badge — top right */}
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
            <ContentRatingBadge rating={fic.contentRating} />
            {hasEmotionalDamage && (
              <span title="Emotional Damage" className="text-pink-300 inline-flex">
                <Zap className="w-3 h-3" fill="currentColor" />
              </span>
            )}
          </div>

          {/* Heart button — top left */}
          <button
            onClick={handleHeartClick}
            className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors"
            title={isFavorite ? 'Remove from Faves' : 'Add to Faves'}
          >
            <Heart
              className="w-3.5 h-3.5 transition-colors"
              style={{ color: isFavorite ? '#f87171' : 'rgba(255,255,255,0.6)' }}
              fill={isFavorite ? '#f87171' : 'none'}
            />
          </button>

          {/* Fandom — bottom left */}
          <div className="absolute bottom-2.5 left-3 right-3">
            <span className="text-white/85 text-[11px] font-medium truncate leading-none block">
              {fic.fandom}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          {/* Title + author */}
          <div>
            <h3 className="text-txt-primary font-semibold text-[14px] leading-snug line-clamp-2
                           transition-colors duration-150
                           [article:hover_&]:text-accent">
              {fic.title}
            </h3>
            <p className="text-txt-muted text-[11px] mt-0.5 truncate">by {fic.author}</p>
          </div>

          {/* Ship */}
          {primaryShip && (
            <p className="text-txt-secondary text-[11px] truncate flex items-center gap-1">
              <Heart className="w-3 h-3 text-pink-400 flex-shrink-0" fill="currentColor" />
              {primaryShip}
            </p>
          )}

          {/* Word count + chapters */}
          <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
            <span className="text-txt-muted text-[11px] flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {formatWordCount(fic.wordCount)}
            </span>
            {fic.chapterCount > 1 && (
              <span className="text-txt-muted text-[11px]">
                {fic.chaptersRead > 0 ? `Ch ${fic.chaptersRead}/` : ''}{fic.chapterCount}ch
              </span>
            )}
          </div>

          {/* Stars only */}
          <div className="flex items-center justify-end pt-2 border-t border-border-subtle mt-1">
            {fic.personalRating > 0 ? (
              <StarRating value={fic.personalRating} readonly size={12} />
            ) : (
              <span className="text-txt-muted text-[11px] italic">unrated</span>
            )}
          </div>
        </div>
      </article>

      {showNotePrompt && (
        <FaveNotePrompt
          fic={{ ...fic, isFavorite: true }}
          onSave={handleNoteSaved}
          onSkip={handleNoteSkipped}
        />
      )}
    </>
  );
}
