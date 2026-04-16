import React from 'react';

const STATUS_CONFIG = {
  complete:      { label: 'Complete',    bg: 'bg-green-500/15',   text: 'text-green-400',  dot: 'bg-green-400' },
  'in-progress': { label: 'In Progress', bg: 'bg-yellow-500/15',  text: 'text-yellow-400', dot: 'bg-yellow-400' },
  abandoned:     { label: 'Abandoned',   bg: 'bg-gray-500/15',    text: 'text-gray-400',   dot: 'bg-gray-400' },
};

const RATING_CONFIG = {
  G: { label: 'G', bg: 'bg-green-500/15',  text: 'text-green-400' },
  T: { label: 'T', bg: 'bg-blue-500/15',   text: 'text-blue-400' },
  M: { label: 'M', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  E: { label: 'E', bg: 'bg-red-500/15',    text: 'text-red-400' },
};

export function StatusBadge({ status, compact = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['in-progress'];
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${config.bg} ${config.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function ContentRatingBadge({ rating }) {
  const config = RATING_CONFIG[rating] || RATING_CONFIG.T;
  return (
    <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function ShelfBadge({ shelf }) {
  const configs = {
    'want-to-read': { label: 'Want to Read', bg: 'bg-purple-500/15', text: 'text-purple-400' },
    'reading':      { label: 'Reading',      bg: 'bg-blue-500/15',   text: 'text-blue-400' },
    'read':         { label: 'Read',         bg: 'bg-green-500/15',  text: 'text-green-400' },
    'dnf':          { label: 'DNF',          bg: 'bg-red-500/15',    text: 'text-red-400' },
    're-reading':   { label: 'Re-reading',   bg: 'bg-teal-500/15',   text: 'text-teal-400' },
  };
  const config = configs[shelf] || configs['want-to-read'];
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
