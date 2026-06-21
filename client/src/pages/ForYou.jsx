import React, { useState } from 'react';
import { Sparkles, Loader2, BookOpen, RefreshCw, ArrowRight, Tag } from 'lucide-react';
import FicDrawer from '../components/FicDrawer.jsx';
import { getMoodRecommendations } from '../api/index.js';

const EXAMPLES = [
  'college AU under 30k explicit',
  'hurt/comfort complete',
  'slow burn long',
  'fluffy short complete',
  'angst wip',
  'explicit over 100k epic',
];

function FicResult({ fic, onOpen, fromWtr }) {
  const wordK = fic.word_count ? (fic.word_count >= 1000 ? `${Math.round(fic.word_count / 1000)}k` : fic.word_count) : null;
  const isComplete = fic.completion_status === 'complete';
  const ratingColor = { E: 'text-red-400', M: 'text-orange-400', T: 'text-yellow-400', G: 'text-green-400' }[fic.content_rating] || 'text-txt-muted';

  return (
    <div
      className="bg-surface border border-border rounded-2xl p-4 hover:border-accent/40 transition-all cursor-pointer group"
      onClick={() => onOpen(fic)}
    >
      <div className="flex items-start gap-3">
        {/* Color swatch */}
        <div
          className="w-10 h-14 rounded-lg flex-shrink-0 flex items-end justify-center pb-1"
          style={{ backgroundColor: fic.cover_color || '#1a2e2e' }}
        >
          <BookOpen className="w-4 h-4 text-white/60" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-txt-primary font-semibold text-sm leading-snug group-hover:text-accent transition-colors line-clamp-2">
                {fic.title}
              </h3>
              <p className="text-txt-muted text-xs mt-0.5">{fic.author}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-txt-muted group-hover:text-accent transition-colors flex-shrink-0 mt-0.5" />
          </div>

          {fic.fandom && (
            <p className="text-txt-muted text-xs mt-1 truncate">{fic.fandom}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {fic.content_rating && (
              <span className={`text-xs font-semibold ${ratingColor}`}>{fic.content_rating}</span>
            )}
            {wordK && <span className="text-xs text-txt-muted">{wordK} words</span>}
            <span className={`text-xs ${isComplete ? 'text-green-400' : 'text-yellow-400'}`}>
              {isComplete ? 'Complete' : 'WIP'}
            </span>
            {fromWtr && (
              <span className="text-xs bg-elevated text-txt-muted px-1.5 py-0.5 rounded-md">Want to Read</span>
            )}
          </div>

          {fic._matchedCriteria?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {fic._matchedCriteria.slice(0, 3).map((c, i) => (
                <span key={i} className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />{c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForYou() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [selectedFic, setSelectedFic] = useState(null);

  async function handleSearch(q) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const { data } = await getMoodRecommendations(searchQuery.trim());
      setResults(data.results);
      setMeta(data);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleFicUpdated(updated) {
    setResults(prev => prev?.map(f => f.id === updated.id ? { ...f, ...updated } : f));
    if (selectedFic?.id === updated.id) setSelectedFic(updated);
  }

  function handleFicDeleted(id) {
    setResults(prev => prev?.filter(f => f.id !== id));
    setSelectedFic(null);
  }

  const hasResults = results && results.length > 0;
  const isEmpty = results && results.length === 0;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/15 rounded-2xl mb-3">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-txt-primary font-bold text-2xl">What should I read?</h1>
        <p className="text-txt-muted text-sm mt-1.5">
          Describe a vibe and we'll find matches from your Maybe pile first, then Want to Read.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. college AU under 30k explicit complete"
          className="input-field text-sm pr-24 w-full"
          autoFocus
        />
        <button
          onClick={() => handleSearch()}
          disabled={!query.trim() || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-accent text-white text-xs font-semibold rounded-lg disabled:opacity-40 transition-opacity hover:bg-accent/90"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
        </button>
      </div>

      {/* Example chips */}
      {!results && !loading && (
        <div className="mb-8">
          <p className="text-txt-muted text-xs mb-2 text-center">Try one of these</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); handleSearch(ex); }}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-txt-secondary hover:text-txt-primary hover:border-accent/50 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="w-7 h-7 text-accent animate-spin" />
          <p className="text-txt-muted text-sm">Searching your shelves…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div>
          {/* Source label */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-txt-muted text-xs">
              {meta.source === 'maybe' && `${results.length} match${results.length !== 1 ? 'es' : ''} from your Maybe pile`}
              {meta.source === 'want-to-read' && `Nothing in Maybe matched — pulling from Want to Read`}
              {meta.source === 'mixed' && `From Maybe + Want to Read`}
            </p>
            <button
              onClick={() => handleSearch()}
              className="flex items-center gap-1.5 text-xs text-txt-muted hover:text-accent transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Shuffle
            </button>
          </div>

          <div className="space-y-3">
            {results.map(fic => (
              <FicResult
                key={fic.id}
                fic={fic}
                onOpen={setSelectedFic}
                fromWtr={fic._fromWtr}
              />
            ))}
          </div>

          {/* Stats footer */}
          <div className="mt-6 pt-4 border-t border-border flex gap-4 text-xs text-txt-muted">
            <span>{meta.totalMaybe} in Maybe</span>
            <span>{meta.totalWtr} in Want to Read</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-12">
          <p className="text-txt-primary font-medium mb-1">No matches found</p>
          <p className="text-txt-muted text-sm">
            Try loosening your criteria, or save some fics to your Maybe shelf first.
          </p>
        </div>
      )}

      {/* Empty shelves state (no maybe or wtr fics at all) */}
      {results === null && !loading && !error && (
        <div className="text-center py-12 text-txt-muted">
          <p className="text-sm">Your Maybe pile and Want to Read shelf are the source — fill them up first.</p>
        </div>
      )}

      {selectedFic && (
        <FicDrawer
          fic={selectedFic}
          onClose={() => setSelectedFic(null)}
          onUpdate={handleFicUpdated}
          onDelete={handleFicDeleted}
        />
      )}
    </div>
  );
}
