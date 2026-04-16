import React from 'react';
import { Heart, Zap } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { StatusBadge, ContentRatingBadge } from './Badge.jsx';

function formatWordCount(n) {
  if (!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

export default function FicListRow({ fic, onClick }) {
  const primaryShip = fic.ships?.[0] || '';

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle hover:bg-elevated cursor-pointer transition-colors group"
      onClick={() => onClick(fic)}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: fic.coverColor || '#0d4f4f' }}
      />

      {/* Title + author */}
      <div className="min-w-0 flex-1">
        <span className="text-txt-primary text-sm font-medium group-hover:text-accent transition-colors truncate block">
          {fic.title}
          {fic.emotionalDamage && <Zap className="w-3 h-3 text-pink-400 inline ml-1" fill="currentColor" />}
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
            <Heart className="w-3 h-3 text-pink-400/70 flex-shrink-0" />
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

      {/* Rating */}
      <div className="w-20 flex-shrink-0 hidden md:block">
        <ContentRatingBadge rating={fic.contentRating} />
      </div>

      {/* Status */}
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
