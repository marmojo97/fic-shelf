import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Heart, Loader2 } from 'lucide-react';
import FicCard from '../components/FicCard.jsx';
import FicDrawer from '../components/FicDrawer.jsx';
import { getFics } from '../api/index.js';

const FANDOMS = ['Harry Potter', 'Marvel Cinematic Universe', 'Supernatural', 'Good Omens', 'Haikyuu!!', 'The Untamed | MDZS', 'Stranger Things', 'The Hobbit', 'Check Please!', 'One Direction RPF'];

const RATING_FILTERS = [
  { value: '', label: 'All Ratings' },
  { value: 'G', label: 'G' },
  { value: 'T', label: 'T' },
  { value: 'M', label: 'M' },
  { value: 'E', label: 'E' },
];

const COMPLETION_FILTERS = [
  { value: '', label: 'Any Status' },
  { value: 'complete', label: 'Complete' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'abandoned', label: 'Abandoned' },
];

export default function Discover() {
  const [fics, setFics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFandom, setSelectedFandom] = useState('');
  const [selectedFic, setSelectedFic] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { shelf: 'all', sort: 'personal_rating', order: 'desc' };
    if (search) params.search = search;
    if (selectedFandom) params.fandom = selectedFandom;

    const t = setTimeout(() => {
      getFics(params)
        .then(r => { setFics(r.data.fics); setLoading(false); })
        .catch(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, selectedFandom]);

  function handleFicUpdated(updated) {
    setFics(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (selectedFic?.id === updated.id) setSelectedFic(updated);
  }

  function handleFicDeleted(id) {
    setFics(prev => prev.filter(f => f.id !== id));
    setSelectedFic(null);
  }

  // Recommendations: top rated fics
  const topRated = fics.filter(f => f.personalRating >= 4).slice(0, 6);
  const emotionallyDamaging = fics.filter(f => f.emotionalDamage).slice(0, 4);

  return (
    <div className="px-6 py-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-txt-primary font-bold text-xl">Discover</h1>
        <p className="text-txt-muted text-sm mt-0.5">Explore your shelf, rediscover favorites, find your next read</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
          <input
            type="text"
            className="input-field text-sm pl-9"
            placeholder="Search across your entire shelf..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Fandom chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedFandom('')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!selectedFandom ? 'bg-accent/15 border-accent text-accent' : 'border-border text-txt-muted hover:text-txt-secondary'}`}
        >
          All Fandoms
        </button>
        {FANDOMS.map(f => (
          <button
            key={f}
            onClick={() => setSelectedFandom(f === selectedFandom ? '' : f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedFandom === f ? 'bg-accent/15 border-accent text-accent' : 'border-border text-txt-muted hover:text-txt-secondary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : search || selectedFandom ? (
        /* Search results */
        <div>
          <p className="text-txt-muted text-sm mb-4">{fics.length} result{fics.length !== 1 ? 's' : ''}</p>
          {fics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-txt-muted">No fics found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {fics.map(fic => <FicCard key={fic.id} fic={fic} onClick={setSelectedFic} />)}
            </div>
          )}
        </div>
      ) : (
        /* Curated sections */
        <div className="space-y-8">
          {/* Recommendations */}
          {topRated.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <h2 className="text-txt-primary font-semibold">Your Top Rated</h2>
                <span className="text-txt-muted text-sm">— based on your ratings</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {topRated.map(fic => <FicCard key={fic.id} fic={fic} onClick={setSelectedFic} />)}
              </div>
            </section>
          )}

          {/* Emotional damage section */}
          {emotionallyDamaging.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-pink-400">⚡</span>
                <h2 className="text-txt-primary font-semibold">Emotional Damage Hall of Fame</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {emotionallyDamaging.map(fic => <FicCard key={fic.id} fic={fic} onClick={setSelectedFic} />)}
              </div>
            </section>
          )}

          {/* All your fics */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-txt-primary font-semibold">All Fics</h2>
              <span className="text-txt-muted text-sm">— your complete collection</span>
            </div>
            {fics.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-txt-muted text-sm">Add fics to your shelf to see them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {fics.map(fic => <FicCard key={fic.id} fic={fic} onClick={setSelectedFic} />)}
              </div>
            )}
          </section>
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
