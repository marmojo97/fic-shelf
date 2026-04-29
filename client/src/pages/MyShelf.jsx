import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Grid, List, Search, X, Download, Loader2,
  CheckSquare, Square, ChevronDown, Trash2, SlidersHorizontal, Check,
} from 'lucide-react';
import FicCard from '../components/FicCard.jsx';
import FicListRow from '../components/FicListRow.jsx';
import FicDrawer from '../components/FicDrawer.jsx';
import AddFicModal from '../components/AddFicModal.jsx';
import StarRating from '../components/StarRating.jsx';
import {
  getFics, exportCsv, exportJson,
  bulkMoveFics, bulkDeleteFics, bulkRateFics, getCustomShelves,
} from '../api/index.js';

// ── Constants ─────────────────────────────────────────────────────────────────

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
  { value: 'added_at',           label: 'Date Added' },
  { value: 'word_count',         label: 'Word Count' },
  { value: 'personal_rating',    label: 'My Rating' },
  { value: 'title',              label: 'Title' },
  { value: 'last_visited',       label: 'Last Visited' },
  { value: 'last_updated_date',  label: 'Last Updated (AO3)' },
  { value: 'total_visits',       label: 'Total Visits' },
];

const STATIC_BULK_SHELVES = [
  { value: 'read',         label: 'Read' },
  { value: 'reading',      label: 'Currently Reading' },
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 're-reading',   label: 'Re-reading' },
  { value: 'history',      label: 'History' },
  { value: 'dnf',          label: 'DNF' },
];

const CONTENT_RATINGS = ['G', 'T', 'M', 'E'];

const EMPTY_FILTERS = {
  fandoms: [],
  ships: [],
  contentRatings: [],
  minWordCount: '',
  maxWordCount: '',
  minStars: '',
  unrated: false,
  tags: '',
  lastVisitedFrom: '',
  lastVisitedTo: '',
};

const PAGE_SIZE = 30;

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ shelf, onAdd }) {
  const messages = {
    all:            { title: 'Your shelf is empty',      body: 'Start by adding your first fic.' },
    reading:        { title: 'Nothing in progress',      body: 'Got a WIP open in another tab? Add it here.' },
    'want-to-read': { title: 'Your reading list awaits', body: 'Paste an AO3 link and let it live here.' },
    read:           { title: 'No finished fics yet',     body: 'When you wrap something up, mark it read.' },
    dnf:            { title: 'Nothing here (good!)',     body: "Some fics just aren't the right fit." },
    're-reading':   { title: 'No re-reads tracked',      body: 'Revisiting a comfort fic? Let Archivd know.' },
    history:        { title: 'History is empty',         body: 'Import your AO3 reading history to fill this.' },
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

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-txt-primary text-white text-sm rounded-xl shadow-xl animate-fade-in flex items-center gap-2 whitespace-nowrap">
      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
      {message}
    </div>
  );
}

function BulkRateModal({ count, onConfirm, onClose }) {
  const [rating, setRating] = useState(0);
  const [overwrite, setOverwrite] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-2xl p-5 w-full max-w-xs modal-content">
        <h3 className="text-txt-primary font-semibold text-base mb-1">
          Rate {count} fic{count !== 1 ? 's' : ''}
        </h3>
        <p className="text-txt-muted text-xs mb-4">Choose a rating to apply to the selected fics.</p>
        <div className="flex items-center justify-center mb-4">
          <StarRating value={rating} onChange={setRating} size={22} />
        </div>
        <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="rounded accent-accent w-4 h-4"
            checked={overwrite}
            onChange={e => setOverwrite(e.target.checked)}
          />
          <span className="text-txt-secondary text-sm">Overwrite existing ratings</span>
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm py-2">Cancel</button>
          <button
            onClick={() => rating > 0 && onConfirm(rating, overwrite)}
            disabled={rating === 0}
            className="btn-primary flex-1 justify-center text-sm py-2"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ count, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-2xl p-5 w-full max-w-xs modal-content">
        <h3 className="text-txt-primary font-semibold text-base mb-1">
          Remove {count} fic{count !== 1 ? 's' : ''}?
        </h3>
        <p className="text-txt-muted text-sm mb-5">
          This will permanently remove the selected fics from your library. This can't be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm py-2">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 justify-center text-sm py-2">
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
          selected.length
            ? 'bg-accent/10 border-accent text-accent'
            : 'border-border text-txt-secondary hover:text-txt-primary'
        }`}
      >
        {label}{selected.length > 0 && ` (${selected.length})`}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-xl z-30 w-52">
          {options.length > 6 && (
            <div className="p-2 border-b border-border-subtle">
              <input
                type="text"
                className="w-full text-xs px-2 py-1 border border-border rounded-lg bg-base focus:outline-none focus:ring-1 focus:ring-accent/30"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-txt-muted text-xs px-3 py-2">No options</p>
            ) : filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-elevated cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                />
                <span className="text-txt-secondary text-xs truncate">{opt}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-border-subtle p-2">
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-accent hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // Build page list: always show 1, last, and ±2 around current
  const range = [];
  for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) {
    range.push(i);
  }
  if (range[0] > 2) range.unshift('...');
  if (range[range.length - 1] < totalPages - 1) range.push('...');
  range.unshift(1);
  if (totalPages > 1) range.push(totalPages);

  return (
    <div className="flex items-center justify-center gap-1 py-3 border-t border-border-subtle bg-base flex-shrink-0">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-border text-txt-secondary hover:text-txt-primary hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ←
      </button>
      {range.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-txt-muted text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 text-sm rounded-lg transition-colors ${
              p === page
                ? 'bg-accent text-white font-medium'
                : 'text-txt-secondary hover:bg-elevated hover:text-txt-primary'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm rounded-lg border border-border text-txt-secondary hover:text-txt-primary hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        →
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MyShelf() {
  // Core state
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
  const [customShelves, setCustomShelves] = useState([]);

  // Bulk select state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showBulkRateModal, setShowBulkRateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  // Pagination
  const [page, setPage] = useState(1);

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    getCustomShelves()
      .then(({ data }) => setCustomShelves(data.shelves || []))
      .catch(() => {});
  }, []);

  // Escape exits bulk mode
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && bulkMode) {
        setBulkMode(false);
        setSelectedIds(new Set());
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [bulkMode]);

  const loadFics = useCallback(async () => {
    setLoading(true);
    try {
      const params = { shelf: activeShelf, sort, order, limit: 9999 };
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

  // Reset bulk selection when shelf/view changes
  useEffect(() => {
    setSelectedIds(new Set());
    setBulkMode(false);
  }, [activeShelf, view]);

  // Reset to page 1 whenever the result set changes
  useEffect(() => { setPage(1); }, [activeShelf, search, sort, order, filters]);

  // ── Derived data ──────────────────────────────────────────────────────────────

  const availableFandoms = useMemo(
    () => [...new Set(fics.map(f => f.fandom).filter(Boolean))].sort(),
    [fics]
  );
  const availableShips = useMemo(
    () => [...new Set(fics.flatMap(f => f.ships || []).filter(Boolean))].sort(),
    [fics]
  );

  const filteredFics = useMemo(() => {
    return fics.filter(fic => {
      if (filters.fandoms.length && !filters.fandoms.includes(fic.fandom)) return false;
      if (filters.ships.length && !fic.ships?.some(s => filters.ships.includes(s))) return false;
      if (filters.contentRatings.length && !filters.contentRatings.includes(fic.contentRating)) return false;
      if (filters.minWordCount !== '' && fic.wordCount < Number(filters.minWordCount)) return false;
      if (filters.maxWordCount !== '' && fic.wordCount > Number(filters.maxWordCount)) return false;
      if (filters.unrated) {
        if (fic.personalRating > 0) return false;
      } else if (filters.minStars !== '') {
        if (fic.personalRating < Number(filters.minStars)) return false;
      }
      if (filters.tags) {
        const tagSearch = filters.tags.toLowerCase();
        if (!fic.tags?.some(t => t.toLowerCase().includes(tagSearch))) return false;
      }
      if (filters.lastVisitedFrom || filters.lastVisitedTo) {
        if (!fic.lastVisited) return false;
        const ficDate = new Date(fic.lastVisited);
        if (isNaN(ficDate.getTime())) return false;
        if (filters.lastVisitedFrom) {
          const [yr, mo] = filters.lastVisitedFrom.split('-').map(Number);
          if (ficDate < new Date(yr, mo - 1, 1)) return false;
        }
        if (filters.lastVisitedTo) {
          const [yr, mo] = filters.lastVisitedTo.split('-').map(Number);
          if (ficDate >= new Date(yr, mo, 1)) return false; // exclusive end: first day of next month
        }
      }
      return true;
    });
  }, [fics, filters]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.fandoms.length) n++;
    if (filters.ships.length) n++;
    if (filters.contentRatings.length) n++;
    if (filters.minWordCount !== '' || filters.maxWordCount !== '') n++;
    if (filters.minStars !== '' || filters.unrated) n++;
    if (filters.tags) n++;
    if (filters.lastVisitedFrom !== '' || filters.lastVisitedTo !== '') n++;
    return n;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  const totalPages = Math.ceil(filteredFics.length / PAGE_SIZE);
  const paginatedFics = useMemo(
    () => filteredFics.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredFics, page]
  );

  const allBulkShelves = useMemo(() => [
    ...STATIC_BULK_SHELVES,
    ...customShelves.map(s => ({ value: s.id || s.name, label: s.name })),
  ], [customShelves]);

  const filterChips = useMemo(() => {
    const chips = [];
    if (filters.fandoms.length)
      chips.push({ label: `Fandom: ${filters.fandoms.join(', ')}`, onRemove: () => setFilters(f => ({ ...f, fandoms: [] })) });
    if (filters.ships.length)
      chips.push({ label: `Ship: ${filters.ships.join(', ')}`, onRemove: () => setFilters(f => ({ ...f, ships: [] })) });
    if (filters.contentRatings.length)
      chips.push({ label: `Rating: ${filters.contentRatings.join(', ')}`, onRemove: () => setFilters(f => ({ ...f, contentRatings: [] })) });
    if (filters.minWordCount !== '' || filters.maxWordCount !== '') {
      const parts = [];
      if (filters.minWordCount !== '') parts.push(`${Number(filters.minWordCount).toLocaleString()}+`);
      if (filters.maxWordCount !== '') parts.push(`≤${Number(filters.maxWordCount).toLocaleString()}`);
      chips.push({ label: `Words: ${parts.join(' ')}`, onRemove: () => setFilters(f => ({ ...f, minWordCount: '', maxWordCount: '' })) });
    }
    if (filters.unrated)
      chips.push({ label: 'Unrated only', onRemove: () => setFilters(f => ({ ...f, unrated: false })) });
    else if (filters.minStars !== '')
      chips.push({ label: `${filters.minStars}★+`, onRemove: () => setFilters(f => ({ ...f, minStars: '' })) });
    if (filters.tags)
      chips.push({ label: `Tag: "${filters.tags}"`, onRemove: () => setFilters(f => ({ ...f, tags: '' })) });
    if (filters.lastVisitedFrom !== '' || filters.lastVisitedTo !== '') {
      const fmt = (ym) => {
        if (!ym) return null;
        const [yr, mo] = ym.split('-');
        return new Date(yr, mo - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };
      const from = fmt(filters.lastVisitedFrom);
      const to   = fmt(filters.lastVisitedTo);
      const label = from && to ? `Visited: ${from} – ${to}` : from ? `Visited: from ${from}` : `Visited: until ${to}`;
      chips.push({ label, onRemove: () => setFilters(f => ({ ...f, lastVisitedFrom: '', lastVisitedTo: '' })) });
    }
    return chips;
  }, [filters]);

  const allSelected = filteredFics.length > 0 && selectedIds.size === filteredFics.length;
  const someSelected = selectedIds.size > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function showToast(message) {
    setToast(message);
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

  function handleFicAdded(fic) {
    setFics(prev => [fic, ...prev]);
    setTotal(prev => prev + 1);
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

  function toggleSelectOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(
      selectedIds.size === filteredFics.length
        ? new Set()
        : new Set(filteredFics.map(f => f.id))
    );
  }

  async function bulkMoveToShelf(shelf) {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    const shelfLabel = allBulkShelves.find(s => s.value === shelf)?.label || shelf;
    setBulkWorking(true);
    try {
      await bulkMoveFics([...selectedIds], shelf);
      await loadFics();
      setSelectedIds(new Set());
      showToast(`${count} fic${count !== 1 ? 's' : ''} moved to ${shelfLabel}`);
    } catch (e) { console.error(e); }
    finally { setBulkWorking(false); }
  }

  async function handleBulkRate(stars, overwrite) {
    if (!selectedIds.size) return;
    setBulkWorking(true);
    try {
      const { data } = await bulkRateFics([...selectedIds], stars, overwrite);
      await loadFics();
      setSelectedIds(new Set());
      setShowBulkRateModal(false);
      showToast(`${data.count} fic${data.count !== 1 ? 's' : ''} rated ${stars}★`);
    } catch (e) { console.error(e); }
    finally { setBulkWorking(false); }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    const count = selectedIds.size;
    setBulkWorking(true);
    try {
      await bulkDeleteFics([...selectedIds]);
      setFics(prev => prev.filter(f => !selectedIds.has(f.id)));
      setTotal(prev => prev - count);
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      setBulkMode(false);
      showToast(`${count} fic${count !== 1 ? 's' : ''} removed`);
    } catch (e) { console.error(e); }
    finally { setBulkWorking(false); }
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function toggleRatingFilter(value) {
    setFilters(f => ({
      ...f,
      minStars: f.minStars === String(value) ? '' : String(value),
      unrated: false,
    }));
  }

  function toggleUnratedFilter() {
    setFilters(f => ({ ...f, unrated: !f.unrated, minStars: '' }));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-4 border-b border-border-subtle bg-surface">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-txt-primary font-bold text-xl">My Shelves</h1>
            <p className="text-txt-muted text-xs mt-0.5">
              {hasActiveFilters
                ? `Showing ${filteredFics.length} of ${total} fic${total !== 1 ? 's' : ''}`
                : `${total} fic${total !== 1 ? 's' : ''} tracked`}
            </p>
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
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeShelf === tab.value ? 'bg-accent/15 text-accent' : 'bg-elevated text-txt-muted'
              }`}>
                {tab.value === 'all' ? total : fics.filter(f => f.shelf === tab.value).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-border-subtle bg-surface flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-xs min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted" />
          <input
            type="text"
            className="input-field text-sm pl-8 py-1.5"
            placeholder="Search title, author, fandom..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-txt-muted hover:text-txt-secondary" />
            </button>
          )}
        </div>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-accent/10 border-accent text-accent'
              : 'border-border text-txt-muted hover:text-txt-secondary'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort */}
        <select
          className="input-field text-sm py-1.5 w-auto"
          value={sort}
          onChange={e => setSort(e.target.value)}
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

        {/* Bulk select toggle — list view only */}
        {view === 'list' && (
          <button
            onClick={() => { setBulkMode(b => !b); setSelectedIds(new Set()); }}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              bulkMode
                ? 'bg-accent/10 border-accent text-accent'
                : 'border-border text-txt-muted hover:text-txt-secondary'
            }`}
          >
            {bulkMode ? 'Cancel' : 'Select'}
          </button>
        )}

        {/* View toggle */}
        <div className="flex items-center bg-elevated rounded-lg p-1 gap-0.5 border border-border-subtle">
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-white text-txt-primary shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-white text-txt-primary shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Filter panel (inline, collapsible) ── */}
      {showFilters && (
        <div className="px-6 py-4 bg-elevated border-b border-border-subtle">
          <div className="flex flex-wrap gap-x-6 gap-y-4">

            {/* Fandom */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted">Fandom</span>
              <MultiSelectDropdown
                label="Select fandoms"
                options={availableFandoms}
                selected={filters.fandoms}
                onChange={v => setFilters(f => ({ ...f, fandoms: v }))}
              />
            </div>

            {/* Ship */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted">Ship</span>
              <MultiSelectDropdown
                label="Select ships"
                options={availableShips}
                selected={filters.ships}
                onChange={v => setFilters(f => ({ ...f, ships: v }))}
              />
            </div>

            {/* Content Rating */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted">Content Rating</span>
              <div className="flex items-center gap-1">
                {CONTENT_RATINGS.map(r => (
                  <button
                    key={r}
                    onClick={() => setFilters(f => ({
                      ...f,
                      contentRatings: f.contentRatings.includes(r)
                        ? f.contentRatings.filter(x => x !== r)
                        : [...f.contentRatings, r],
                    }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      filters.contentRatings.includes(r)
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'border-border text-txt-secondary hover:border-accent/40'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Word Count */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted">Word Count</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  className="w-24 text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent/30"
                  placeholder="Min"
                  value={filters.minWordCount}
                  onChange={e => setFilters(f => ({ ...f, minWordCount: e.target.value }))}
                />
                <span className="text-txt-muted text-xs">–</span>
                <input
                  type="number"
                  className="w-24 text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent/30"
                  placeholder="Max"
                  value={filters.maxWordCount}
                  onChange={e => setFilters(f => ({ ...f, maxWordCount: e.target.value }))}
                />
              </div>
            </div>

            {/* Stars */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted">My Rating</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => toggleRatingFilter(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      filters.minStars === String(n)
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'border-border text-txt-secondary hover:border-accent/40'
                    }`}
                  >
                    {n}★+
                  </button>
                ))}
                <button
                  onClick={toggleUnratedFilter}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    filters.unrated
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'border-border text-txt-secondary hover:border-accent/40'
                  }`}
                >
                  Unrated
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted">Tags</span>
              <input
                type="text"
                className="w-36 text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent/30"
                placeholder="Search tags…"
                value={filters.tags}
                onChange={e => setFilters(f => ({ ...f, tags: e.target.value }))}
              />
            </div>

            {/* Last Visited date range */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted">Last Visited</span>
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-txt-muted uppercase tracking-wider">From</span>
                  <input
                    type="month"
                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent/30"
                    value={filters.lastVisitedFrom}
                    max={filters.lastVisitedTo || undefined}
                    onChange={e => setFilters(f => ({ ...f, lastVisitedFrom: e.target.value }))}
                  />
                </div>
                <span className="text-txt-muted text-xs mt-4">–</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-txt-muted uppercase tracking-wider">To</span>
                  <input
                    type="month"
                    className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-accent/30"
                    value={filters.lastVisitedTo}
                    min={filters.lastVisitedFrom || undefined}
                    onChange={e => setFilters(f => ({ ...f, lastVisitedTo: e.target.value }))}
                  />
                </div>
                {(filters.lastVisitedFrom || filters.lastVisitedTo) && (
                  <button
                    onClick={() => setFilters(f => ({ ...f, lastVisitedFrom: '', lastVisitedTo: '' }))}
                    className="text-txt-muted hover:text-accent mt-4 flex-shrink-0"
                    title="Clear date range"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="mt-3 text-xs text-accent hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Active filter chips (shown when panel is closed) ── */}
      {hasActiveFilters && !showFilters && (
        <div className="px-6 py-2 bg-surface border-b border-border-subtle flex items-center gap-2 flex-wrap">
          {filterChips.map((chip, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full">
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-accent-dim ml-0.5 flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="text-xs text-txt-muted hover:text-accent transition-colors ml-1">
            Clear all
          </button>
        </div>
      )}

      {/* ── List header (with Select All checkbox) ── */}
      {view === 'list' && filteredFics.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-elevated border-b border-border-subtle text-txt-muted text-xs uppercase tracking-wider">
          {bulkMode ? (
            <button
              onClick={toggleSelectAll}
              className="flex-shrink-0"
              title={allSelected ? 'Deselect all' : 'Select all'}
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-accent" />
                : <Square className="w-4 h-4 text-txt-muted hover:text-accent transition-colors" />}
            </button>
          ) : (
            <div className="w-2.5" />
          )}
          <div className="flex-1">Title / Author</div>
          <div className="hidden md:block w-32">Fandom</div>
          <div className="hidden lg:block w-40">Ship</div>
          <div className="hidden sm:block w-16 text-right">Words</div>
          <div className="hidden md:block w-20">Rating</div>
          <div className="hidden sm:block w-24 text-center">Status</div>
          <div className="w-20 text-right">Stars</div>
        </div>
      )}

      {/* ── Content ── */}
      <div
        className="flex-1 overflow-y-auto bg-base"
        style={{ paddingBottom: bulkMode && someSelected ? '72px' : 0 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : filteredFics.length === 0 ? (
          hasActiveFilters ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-txt-primary font-semibold text-lg mb-1">No fics match your filters</h3>
              <p className="text-txt-muted text-sm text-center max-w-xs mb-5">Try adjusting or clearing your filters.</p>
              <button onClick={clearAllFilters} className="btn-secondary text-sm">Clear filters</button>
            </div>
          ) : (
            <EmptyState shelf={activeShelf} onAdd={() => setShowAdd(true)} />
          )
        ) : view === 'grid' ? (
          <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {paginatedFics.map(fic => (
              <FicCard key={fic.id} fic={fic} onClick={setSelectedFic} />
            ))}
            {page === totalPages && (
              <button
                onClick={() => setShowAdd(true)}
                className="border-2 border-dashed border-border-subtle hover:border-accent rounded-xl flex flex-col items-center justify-center gap-2 py-8 transition-colors group min-h-[180px] bg-white"
              >
                <Plus className="w-6 h-6 text-txt-muted group-hover:text-accent transition-colors" />
                <span className="text-txt-muted text-xs group-hover:text-accent transition-colors">Add fic</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-surface">
            {paginatedFics.map(fic => (
              <FicListRow
                key={fic.id}
                fic={fic}
                onClick={f => { if (!bulkMode) setSelectedFic(f); }}
                selectable={bulkMode}
                selected={selectedIds.has(fic.id)}
                onSelect={toggleSelectOne}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && filteredFics.length > PAGE_SIZE && (
        <div style={{ paddingBottom: bulkMode && someSelected ? '64px' : 0 }}>
          <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); }} />
        </div>
      )}

      {/* ── Sticky bottom bulk action toolbar ── */}
      {bulkMode && someSelected && (
        <div className="fixed bottom-0 left-56 right-0 z-40 px-6 py-3 bg-surface border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center gap-3 flex-wrap">
          <span className="text-txt-primary text-sm font-medium">
            {selectedIds.size} fic{selectedIds.size !== 1 ? 's' : ''} selected
          </span>

          <div className="h-4 w-px bg-border-subtle flex-shrink-0" />

          {/* Move to shelf */}
          <div className="relative group">
            <button
              disabled={bulkWorking}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border text-txt-secondary hover:text-txt-primary hover:bg-elevated transition-colors"
            >
              Move to shelf
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute left-0 bottom-full mb-1 bg-surface border border-border rounded-xl shadow-xl z-50 hidden group-hover:block min-w-[180px]">
              {allBulkShelves.map(s => (
                <button
                  key={s.value}
                  onClick={() => bulkMoveToShelf(s.value)}
                  disabled={bulkWorking}
                  className="w-full text-left px-3 py-2 text-sm text-txt-secondary hover:text-txt-primary hover:bg-elevated transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rate selected */}
          <button
            onClick={() => setShowBulkRateModal(true)}
            disabled={bulkWorking}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border text-txt-secondary hover:text-txt-primary hover:bg-elevated transition-colors"
          >
            Rate selected
          </button>

          {/* Remove */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={bulkWorking}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove from library
          </button>

          {bulkWorking && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
        </div>
      )}

      {/* ── Drawers & modals ── */}
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

      {showBulkRateModal && (
        <BulkRateModal
          count={selectedIds.size}
          onConfirm={handleBulkRate}
          onClose={() => setShowBulkRateModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={selectedIds.size}
          onConfirm={handleBulkDelete}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
