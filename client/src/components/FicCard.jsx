import React from 'react';
import { Heart, BookOpen, Zap } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { ContentRatingBadge } from './Badge.jsx';

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
  );
}
