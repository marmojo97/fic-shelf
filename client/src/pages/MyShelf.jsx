import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Grid, List, Search, X, Download, Loader2,
  CheckSquare, Square, ChevronDown, Star, BookOpen,
} from 'lucide-react';
import FicCard from '../components/FicCard.jsx';
import FicListRow from '../components/FicListRow.jsx';
import FicDrawer from '../components/FicDrawer.jsx';
import AddFicModal from '../components/AddFicModal.jsx';
import { getFics, updateFic, exportCsv, exportJson, bulkMoveFics } from '../api/index.js';

const SHELF_TABS = [
  { value: 'all',          label: 'All' },
  { value: 'reading',      label: 'Reading' },
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 're-reading',   label: 'Re-reading' },
  { value: 'read',         label: 'Read' },
  { value: 'history',      label: 'History' },
  { value: 'dnf',          label: 'DNF' },
];

const SORT_OPTIONS = [
  { value: 'added_at',        label: 'Date Added' },
  { value: 'word_count',      label: 'Word Count' },
  { value: 'personal_rating', label: 'My Rating' },
  { value: 'title',           label: 'Title' },
];

const BULK_SHELVES = [
  { value: 'read',         label: 'Read' },
  { value: 'reading',      label: 'Currently Reading' },
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'dnf',          label: 'DNF' },
  { value: 'history',      label: 'History' },
];

const BULK_RATINGS = [1, 2, 3, 4, 5];

function EmptyState({ shelf, onAdd }) {
  const messages = {
    all:            { title: 'Your shelf is empty',     body: 'Start by adding your first fic.' },
    reading:        { title: 'Nothing in progress',     body: 'Got a WIP open in another tab? Add it here.' },
    'want-to-read': { title: 'Your reading list awaits',body: 'Paste an AO3 link and let it live here.' },
    read:           { title: 'No finished fics yet',    body: 'When you wrap something up, mark it read.' },
    dnf:            { title: 'Nothing here (good\!)',    body: 'Some fics just aren\'t the right fit.' },
    're-reading':   { title: 'No re-reads tracked',     body: 'Revisiting a comfort fic? Let Archivd know.' },
    history:        { title: 'History is empty',        body: 'Import your AO3 reading history to fill this.' },
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
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('added_at');
  const [order, setOrder] = useState('desc');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedFic, setSelectedFic] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Bulk select state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);

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

  // Reset bulk selection when shelf changes
  useEffect(() => {
    setSelectedIds(new Set());
    setBulkMode(false);
  }, [activeShelf, view]);

  function handleFicAdded(fic) {
    setFics(prev => [fic, ...prev]);
    setTotal(prev => prev + 1);
  }

  function handleFicUpdated(updated) {
    setFics(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (selectedFic?.id === updated.id) setSelectedFic(updated);
  }

  function handleFicDeleted(id) {
    setFics(prev => prev.filter(f => f.id \!== id));
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

  // Bulk select helpers
  function toggleSelectOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === fics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(fics.map(f => f.id)));
    }
  }

  async function bulkMoveToShelf(shelf) {
    if (\!selectedIds.size) return;
    setBulkWorking(true);
    try {
      await bulkMoveFics([...selectedIds], shelf);
      await loadFics();
      setSelectedIds(new Set());
    } catch (e) { console.error(e); }
    finally { setBulkWorking(false); }
  }

  async function bulkSetRating(stars) {
    if (\!selectedIds.size) return;
    setBulkWorking(true);
    try {
      await Promise.all(
        [...selectedIds].map(id => updateFic(id, { personalRating: stars }))
      );
      setFics(prev => prev.map(f =>
        selectedIds.has(f.id) ? { ...f, personalRating: stars } : f
      ));
      setSelectedIds(new Set());
    } catch (e) { console.error(e); }
    finally { setBulkWorking(false); }
  }

  const allSelected = fics.length > 0 && selectedIds.size === fics.length;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-border-subtle bg-surface">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-txt-primary font-bold text-xl">My Shelves</h1>
            <p className="text-txt-muted text-xs mt-0.5">{total} fic{total \!== 1 ? 's' : ''} tracked</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="btn-ghost text-sm px-3" disabled={exporting}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-xl z-10 hidden group-hover:block min-w-[120px]">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-3 py-2 text-sm text-txt-secondary hover:text-txt-primary hover:bg-elevated transition-colors rounded-t-lg">CSV</button>
                <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-2 text-sm text-txt-secondary hover:text-txt-primary hover:bg-elevated transition-colors rounded-b-lg">JSON</button>
              </div>
            </div>
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
                  ? 'border-accent text-accent font-medium'
                  : 'border-transparent text-txt-muted hover:text-txt-secondary'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeShelf === tab.value ? 'bg-accent/15 text-accent' : 'bg-elevated text-txt-muted'}`}>
                {tab.value === 'all' ? total : fics.filter(f => f.shelf === tab.value).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-border-subtle bg-surface">
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
        >
          {order === 'desc' ? '↓' : '↑'}
        </button>

        <div className="flex-1" />

        {/* Bulk select toggle (list view only) */}
        {view === 'list' && (
          <button
            onClick={() => { setBulkMode(b => \!b); setSelectedIds(new Set()); }}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${bulkMode ? 'bg-accent/10 border-accent text-accent' : 'border-border text-txt-muted hover:text-txt-secondary'}`}
          >
            {bulkMode ? 'Cancel' : 'Select'}
          </button>
        )}

        <div className="flex items-center bg-elevated rounded-lg p-1 gap-0.5 border border-border-subtle">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-white text-txt-primary shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-white text-txt-primary shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {bulkMode && view === 'list' && (
        <div className="px-4 py-2.5 bg-accent/5 border-b border-accent/20 flex items-center gap-3 flex-wrap">
          {/* Select all */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-sm text-txt-secondary hover:text-txt-primary transition-colors"
          >
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-accent" />
              : <Square className="w-4 h-4" />}
            {allSelected ? 'Deselect all' : `Select all (${fics.length})`}
          </button>

          {selectedIds.size > 0 && (
            <>
              <span className="text-accent text-sm font-medium">{selectedIds.size} selected</span>

              <div className="h-4 w-px bg-border" />

              {/* Move to shelf */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm text-txt-secondary hover:text-txt-primary border border-border rounded-lg px-3 py-1.5 hover:bg-white transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                  Move to shelf
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-xl z-20 hidden group-hover:block min-w-[170px]">
                  {BULK_SHELVES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => bulkMoveToShelf(s.value)}
                      disabled={bulkWorking}
                      className="w-full text-left px-3 py-2 text-sm text-txt-secondary hover:text-txt-primary hover:bg-elevated transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate */}
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-txt-muted" />
                <span className="text-sm text-txt-muted mr-1">Rate:</span>
                {BULK_RATINGS.map(n => (
                  <button
                    key={n}
                    onClick={() => bulkSetRating(n)}
                    disabled={bulkWorking}
                    className="w-6 h-6 rounded text-sm font-medium border border-border hover:bg-yellow-50 hover:border-yellow-400 hover:text-yellow-600 transition-colors text-txt-secondary"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}

          {bulkWorking && <Loader2 className="w-4 h-4 text-accent animate-spin ml-auto" />}
        </div>
      )}

      {/* List header */}
      {view === 'list' && fics.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-elevated border-b border-border-subtle text-txt-muted text-xs uppercase tracking-wider">
          {bulkMode ? <div className="w-4" /> : <div className="w-2.5" />}
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
      <div className="flex-1 overflow-y-auto bg-base">
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
            <button
              onClick={() => setShowAdd(true)}
              className="border-2 border-dashed border-border-subtle hover:border-accent rounded-xl flex flex-col items-center justify-center gap-2 py-8 transition-colors group min-h-[180px] bg-white"
            >
              <Plus className="w-6 h-6 text-txt-muted group-hover:text-accent transition-colors" />
              <span className="text-txt-muted text-xs group-hover:text-accent transition-colors">Add fic</span>
            </button>
          </div>
        ) : (
          <div className="bg-surface">
            {fics.map(fic => (
              <FicListRow
                key={fic.id}
                fic={fic}
                onClick={(f) => { if (\!bulkMode) setSelectedFic(f); }}
                selectable={bulkMode}
                selected={selectedIds.has(fic.id)}
                onSelect={toggleSelectOne}
              />
            ))}
          </div>
        )}
      </div>

      {selectedFic && (
        <FicDrawer
          fic={selectedFic}
          onClose={() => setSelectedFic(null)}
          onUpdate={handleFicUpdated}
          onDelete={handleFicDeleted}
        />
      )}

      {showAdd && (
        <AddFicModal
          onClose={() => setShowAdd(false)}
          onAdded={handleFicAdded}
        />
      )}
    </div>
  );
}
