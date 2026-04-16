import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Grid, List, Search, SlidersHorizontal, X, Download, Loader2 } from 'lucide-react';
import FicCard from '../components/FicCard.jsx';
import FicListRow from '../components/FicListRow.jsx';
import FicDrawer from '../components/FicDrawer.jsx';
import AddFicModal from '../components/AddFicModal.jsx';
import { getFics, exportCsv, exportJson } from '../api/index.js';

const SHELF_TABS = [
  { value: 'all',          label: 'All' },
  { value: 'reading',      label: 'Reading' },
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 're-reading',   label: 'Re-reading' },
  { value: 'read',         label: 'Read' },
  { value: 'dnf',          label: 'DNF' },
];

const SORT_OPTIONS = [
  { value: 'added_at',       label: 'Date Added' },
  { value: 'word_count',     label: 'Word Count' },
  { value: 'personal_rating', label: 'My Rating' },
  { value: 'title',           label: 'Title' },
];

function EmptyState({ shelf, onAdd }) {
  const messages = {
    all:           { title: 'Your shelf is empty', body: 'Start by adding your first fic — it\'s the beginning of something beautiful.' },
    reading:       { title: 'Nothing in progress', body: 'Got a WIP open in another tab? Add it here so you never lose your place.' },
    'want-to-read': { title: 'Your reading list awaits', body: 'Paste an AO3 link and let it live here until you\'re ready.' },
    read:          { title: 'No finished fics yet', body: 'When you wrap something up, mark it read and add your thoughts.' },
    dnf:           { title: 'Nothing here (good!)', body: 'Some fics just aren\'t the right fit. DNF is a full sentence.' },
    're-reading':  { title: 'No re-reads tracked', body: 'Revisiting a comfort fic? Let Archivd know.' },
  };
  const { title, body } = messages[shelf] || messages.all;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="text-6xl mb-4">📚</div>
      <h3 className="text-txt-primary font-semibold text-lg mb-1">{title}</h3>
      <p className="text-txt-muted text-sm text-center max-w-xs mb-5">{body}</p>
      <button onClick={onAdd} className="btn-primary text-sm">
        <Plus className="w-4 h-4" /> Add your first fic
      </button>
    </div>
  );
}

export default function MyShelf() {
  const [fics, setFics] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeShelf, setActiveShelf] = useState('all');
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('added_at');
  const [order, setOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedFic, setSelectedFic] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadFics = useCallback(async () => {
    setLoading(true);
    try {
      const params = { shelf: activeShelf, sort, order };
      if (search) params.search = search;
      const { data } = await getFics(params);
      setFics(data.fics);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeShelf, sort, order, search]);

  useEffect(() => {
    const timer = setTimeout(loadFics, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadFics]);

  function handleFicAdded(fic) {
    setFics(prev => [fic, ...prev]);
    setTotal(prev => prev + 1);
  }

  function handleFicUpdated(updated) {
    setFics(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (selectedFic?.id === updated.id) setSelectedFic(updated);
  }

  function handleFicDeleted(id) {
    setFics(prev => prev.filter(f => f.id !== id));
    setTotal(prev => prev - 1);
    setSelectedFic(null);
  }

  async function handleExport(format) {
    setExporting(true);
    try {
      const { data } = format === 'csv' ? await exportCsv() : await exportJson();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `archivd-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  // Shelf counts per tab
  const shelfCounts = {};
  SHELF_TABS.forEach(tab => {
    if (tab.value === 'all') shelfCounts['all'] = total;
    else shelfCounts[tab.value] = fics.filter(f => f.shelf === tab.value).length;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-txt-primary font-bold text-xl">My Shelf</h1>
            <p className="text-txt-muted text-xs mt-0.5">{total} fic{total !== 1 ? 's' : ''} tracked</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export */}
            <div className="relative group">
              <button className="btn-ghost text-sm px-3" disabled={exporting}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-elevated border border-border rounded-lg shadow-xl z-10 hidden group-hover:block min-w-[120px]">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-3 py-2 text-sm text-txt-secondary hover:text-txt-primary hover:bg-surface transition-colors">CSV</button>
                <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-2 text-sm text-txt-secondary hover:text-txt-primary hover:bg-surface transition-colors">JSON</button>
              </div>
            </div>
            {/* Add fic */}
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add fic</span>
            </button>
          </div>
        </div>

        {/* Shelf tabs */}
        <div className="flex items-center gap-0 overflow-x-auto -mb-px scrollbar-none">
          {SHELF_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveShelf(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeShelf === tab.value
                  ? 'border-accent text-accent'
                  : 'border-transparent text-txt-muted hover:text-txt-secondary'
              }`}
            >
              {tab.label}
              {activeShelf === 'all' && tab.value !== 'all' ? null : (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeShelf === tab.value ? 'bg-accent/15 text-accent' : 'bg-elevated text-txt-muted'}`}>
                  {tab.value === 'all' ? total : fics.filter(f => f.shelf === tab.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-border-subtle">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted" />
          <input
            type="text"
            className="input-field text-sm pl-8 py-1.5"
            placeholder="Search title, author, fandom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-txt-muted hover:text-txt-secondary" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          className="input-field text-sm py-1.5 w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button
          onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="btn-ghost text-sm px-2.5 py-1.5"
          title={order === 'desc' ? 'Descending' : 'Ascending'}
        >
          {order === 'desc' ? '↓' : '↑'}
        </button>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center bg-elevated rounded-lg p-1 gap-0.5">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-surface text-txt-primary' : 'text-txt-muted hover:text-txt-secondary'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-surface text-txt-primary' : 'text-txt-muted hover:text-txt-secondary'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List header for list view */}
      {view === 'list' && fics.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-elevated/50 border-b border-border-subtle text-txt-muted text-xs uppercase tracking-wider">
          <div className="w-2.5" />
          <div className="flex-1">Title / Author</div>
          <div className="hidden md:block w-32">Fandom</div>
          <div className="hidden lg:block w-40">Ship</div>
          <div className="hidden sm:block w-16 text-right">Words</div>
          <div className="hidden md:block w-20">Rating</div>
          <div className="hidden sm:block w-24 text-center">Status</div>
          <div className="w-20 text-right">Stars</div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : fics.length === 0 ? (
          <EmptyState shelf={activeShelf} onAdd={() => setShowAdd(true)} />
        ) : view === 'grid' ? (
          <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {fics.map(fic => (
              <FicCard key={fic.id} fic={fic} onClick={setSelectedFic} />
            ))}
            {/* Add placeholder card */}
            <button onClick={() => setShowAdd(true)}
              className="border-2 border-dashed border-border-subtle hover:border-accent rounded-xl flex flex-col items-center justify-center gap-2 py-8 transition-colors group min-h-[180px]">
              <Plus className="w-6 h-6 text-txt-muted group-hover:text-accent transition-colors" />
              <span className="text-txt-muted text-xs group-hover:text-accent transition-colors">Add fic</span>
            </button>
          </div>
        ) : (
          <div>
            {fics.map(fic => (
              <FicListRow key={fic.id} fic={fic} onClick={setSelectedFic} />
            ))}
          </div>
        )}
      </div>

      {/* Fic drawer */}
      {selectedFic && (
        <FicDrawer
          fic={selectedFic}
          onClose={() => setSelectedFic(null)}
          onUpdate={handleFicUpdated}
          onDelete={handleFicDeleted}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <AddFicModal
          onClose={() => setShowAdd(false)}
          onAdded={handleFicAdded}
        />
      )}
    </div>
  );
}
