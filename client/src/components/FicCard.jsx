import React from 'react';
import { Heart, BookOpen, Zap } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { StatusBadge, ContentRatingBadge } from './Badge.jsx';

function formatWordCount(n) {
  if (!n) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M words`;
  if (n >= 1000) return `${Math.round(n / 1000)}k words`;
  return `${n} words`;
}

export default function FicCard({ fic, onClick }) {
  const primaryShip = fic.ships?.[0] || '';
  const hasEmotionalDamage = fic.emotionalDamage;

  return (
    <article
      className="card group cursor-pointer hover:border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 overflow-hidden flex flex-col"
      onClick={() => onClick(fic)}
    >
      {/* Fandom color banner */}
      <div
        className="h-12 w-full flex-shrink-0 relative overflow-hidden"
        style={{ backgroundColor: fic.coverColor || '#0d4f4f' }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        {/* Fandom name watermark */}
        <div className="absolute bottom-1.5 left-3 right-3 flex items-end justify-between">
          <span className="text-white/70 text-xs font-medium truncate max-w-[80%]">{fic.fandom}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ContentRatingBadge rating={fic.contentRating} />
            {hasEmotionalDamage && (
              <span title="Emotional damage" className="text-pink-300">
                <Zap className="w-3 h-3" fill="currentColor" />
              </span>
            )}
          </div>
        </div>
        {/* WIP update badge */}
        {fic.hasUpdate && (
          <div className="absolute top-1.5 right-1.5 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
            NEW
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title + author */}
        <div>
          <h3 className="text-txt-primary font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {fic.title}
          </h3>
          <p className="text-txt-muted text-xs mt-0.5 truncate">by {fic.author}</p>
        </div>

        {/* Ship */}
        {primaryShip && (
          <p className="text-txt-secondary text-xs truncate flex items-center gap-1">
            <Heart className="w-3 h-3 text-pink-400/70 flex-shrink-0" />
            {primaryShip}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap mt-auto">
          <span className="text-txt-muted text-xs flex items-center gap-0.5">
            <BookOpen className="w-3 h-3" />
            {formatWordCount(fic.wordCount)}
          </span>
          {fic.chapterCount > 1 && (
            <span className="text-txt-muted text-xs">
              {fic.chaptersRead > 0 ? `Ch ${fic.chaptersRead}/` : ''}{fic.chapterCount}ch
            </span>
          )}
        </div>

        {/* Status + rating */}
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-border-subtle">
          <StatusBadge status={fic.completionStatus} compact />
          {fic.personalRating > 0 ? (
            <StarRating value={fic.personalRating} readonly size={12} />
          ) : (
            <span className="text-txt-muted text-xs italic">unrated</span>
          )}
        </div>
      </div>
    </article>
  );
}
