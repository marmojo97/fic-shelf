import React from 'react';
import { Heart, Zap, CheckSquare, Square } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { StatusBadge, ContentRatingBadge } from './Badge.jsx';

function formatWordCount(n) {
  if (\!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

export default function FicListRow({ fic, onClick, selectable, selected, onSelect }) {
  const primaryShip = fic.ships?.[0] || '';

  function handleCheckboxClick(e) {
    e.stopPropagation();
    onSelect?.(fic.id);
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle hover:bg-elevated cursor-pointer transition-colors group ${selected ? 'bg-accent/5 border-l-2 border-l-accent' : ''}`}
      onClick={() => onClick(fic)}
    >
      {/* Checkbox (list-select mode) */}
      {selectable && (
        <div
          className="flex-shrink-0 text-accent cursor-pointer"
          onClick={handleCheckboxClick}
        >
          {selected
            ? <CheckSquare className="w-4 h-4" />
            : <Square className="w-4 h-4 text-txt-muted group-hover:text-accent transition-colors" />}
        </div>
      )}

      {/* Color dot (hidden when selectable) */}
      {\!selectable && (
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: fic.coverColor || '#990000' }}
        />
      )}

      {/* Title + author */}
      <div className="min-w-0 flex-1">
        <span className="text-txt-primary text-sm font-medium group-hover:text-accent transition-colors truncate block">
          {fic.title}
          {fic.emotionalDamage && <Zap className="w-3 h-3 text-pink-500 inline ml-1" fill="currentColor" />}
        </span>
        <span className="text-txt-muted text-xs truncate block">by {fic.author}</span>
      </div>

      {/* Fandom */}
      <div className="hidden md:block w-32 flex-shrink-0">
        <span className="text-txt-secondary text-xs truncate block">{fic.fandom || '—'}</span>
      </div>

      {/* Ship */}
      <div className="hidden lg:flex items-center gap-1 w-40 flex-shrink-0">
        {primaryShip ? (
          <>
            <Heart className="w-3 h-3 text-pink-500/70 flex-shrink-0" />
            <span className="text-txt-secondary text-xs truncate">{primaryShip}</span>
          </>
        ) : (
          <span className="text-txt-muted text-xs">—</span>
        )}
      </div>

      {/* Word count */}
      <div className="w-16 flex-shrink-0 text-right hidden sm:block">
        <span className="text-txt-muted text-xs">{formatWordCount(fic.wordCount)}w</span>
      </div>

      {/* Content rating */}
      <div className="w-20 flex-shrink-0 hidden md:block">
        <ContentRatingBadge rating={fic.contentRating} />
      </div>

      {/* Completion status */}
      <div className="w-24 flex-shrink-0 hidden sm:flex justify-center">
        <StatusBadge status={fic.completionStatus} compact />
      </div>

      {/* Star rating */}
      <div className="w-20 flex-shrink-0 flex justify-end">
        {fic.personalRating > 0 ? (
          <StarRating value={fic.personalRating} readonly size={12} />
        ) : (
          <span className="text-txt-muted text-xs italic">—</span>
        )}
      </div>
    </div>
  );
}
