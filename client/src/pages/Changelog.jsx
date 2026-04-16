import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar } from 'lucide-react';
import { getChangelog, markChangelogViewed } from '../api/index.js';

export default function Changelog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChangelog()
      .then(({ data }) => setEntries(data.entries))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Mark as viewed when page is opened
    markChangelogViewed().catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-accent/15 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-txt-primary text-2xl font-bold tracking-tight">What's New</h1>
          <p className="text-txt-muted text-sm">Updates and improvements to Archivd</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-8 h-8 text-txt-muted mx-auto mb-3 opacity-40" />
          <p className="text-txt-muted text-sm">No updates yet — check back soon!</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border-subtle" />

          <div className="space-y-8">
            {entries.map((entry, i) => (
              <div key={entry.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-surface ${i === 0 ? 'bg-accent' : 'bg-elevated border-border'}`} />

                <div className="card p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-txt-primary font-semibold text-base leading-snug">{entry.title}</h2>
                    <div className="flex items-center gap-1.5 text-txt-muted text-xs flex-shrink-0 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.entry_date)}
                    </div>
                  </div>
                  <p className="text-txt-secondary text-sm leading-relaxed whitespace-pre-wrap">{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
