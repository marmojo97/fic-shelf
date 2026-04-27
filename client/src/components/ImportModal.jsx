import React, { useState, useRef, useMemo } from 'react';
import {
  X, Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  BookOpen, ChevronDown, Calendar, Filter, CheckSquare, Square,
} from 'lucide-react';
import { previewAo3Csv, confirmAo3Csv, bulkSortFics } from '../api/index.js';

const RATING_BADGE = {
  G: 'bg-green-900/50 text-green-400',
  T: 'bg-blue-900/50 text-blue-400',
  M: 'bg-orange-900/50 text-orange-400',
  E: 'bg-red-900/50 text-red-400',
};

const SORT_SHELVES = [
  { value: 'read', label: 'Read', color: 'bg-green-700 hover:bg-green-600' },
  { value: 'reading', label: 'Currently Reading', color: 'bg-teal-700 hover:bg-teal-600' },
  { value: 'want-to-read', label: 'Want to Read', color: 'bg-blue-700 hover:bg-blue-600' },
];

const DATE_RANGES = [
  { label: 'All time', value: 'all' },
  { label: 'Last month', value: '1m' },
  { label: 'Last 3 months', value: '3m' },
  { label: 'Last 6 months', value: '6m' },
  { label: 'Last year', value: '1y' },
];

function cutoffDate(range) {
  if (range === 'all') return null;
  const now = new Date();
  if (range === '1m')  now.setMonth(now.getMonth() - 1);
  if (range === '3m')  now.setMonth(now.getMonth() - 3);
  if (range === '6m')  now.setMonth(now.getMonth() - 6);
  if (range === '1y')  now.setFullYear(now.getFullYear() - 1);
  return now;
}

function parseVisitDate(str) {
  if (!str) return null;
  // AO3 exports dates like "16 Apr 2026" or "2026-04-16"
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(str) {
  const d = parseVisitDate(str);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PreviewCard({ fic }) {
  return (
    <div className="bg-elevated rounded-xl p-3 flex gap-3 items-start">
      <div
        className="w-8 h-12 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ background: fic.coverColor || fic.cover_color || '#14b8a6' }}
      >
        <BookOpen className="w-4 h-4 opacity-60" />
      </div>
      <div className="min-w-0">
        <p className="text-txt-primary text-sm font-medium truncate">{fic.title}</p>
        <p className="text-txt-muted text-xs truncate">{fic.author} · {fic.fandom}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {fic.contentRating && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${RATING_BADGE[fic.contentRating] || 'bg-elevated text-txt-muted'}`}>
              {fic.contentRating}
            </span>
          )}
          {(fic.wordCount || fic.word_count) > 0 && (
            <span className="text-txt-muted text-xs">
              {(fic.wordCount || fic.word_count).toLocaleString()} words
            </span>
          )}
          {fic.completionStatus && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${fic.completionStatus === 'complete' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
              {fic.completionStatus === 'complete' ? 'Complete' : 'In Progress'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SortRow({ fic, checked, onToggle, shelfOverride }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checked ? 'bg-accent/10 border border-accent/30' : 'bg-elevated hover:bg-elevated/80 border border-transparent'}`}
      onClick={onToggle}
    >
      <div className="flex-shrink-0 text-accent">
        {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-txt-muted" />}
      </div>
      <div
        className="w-6 h-9 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: fic.coverColor || '#14b8a6' }}
      >
        <BookOpen className="w-3 h-3 text-white opacity-60" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-txt-primary text-sm font-medium truncate">{fic.title}</p>
        <p className="text-txt-muted text-xs truncate">{fic.author}{fic.fandom ? ` · ${fic.fandom}` : ''}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        {shelfOverride ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
            {SORT_SHELVES.find(s => s.value === shelfOverride)?.label || shelfOverride}
          </span>
        ) : fic.lastVisited ? (
          <span className="text-txt-muted text-[10px]">{formatDate(fic.lastVisited)}</span>
        ) : null}
      </div>
    </div>
  );
}

export default function ImportModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload'); // upload | previewing | preview | importing | sort | done | error
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // Bulk sort state
  const [dateRange, setDateRange] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [assignments, setAssignments] = useState({}); // ficId → shelf
  const [sorting, setSorting] = useState(false);

  const handleFile = async (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a .csv file exported from AO3.');
      return;
    }
    setFile(f);
    setError('');
    setStep('previewing');
    try {
      const { data } = await previewAo3Csv(f);
      setPreview(data);
      setStep('preview');
    } catch (e) {
      setError(e.response?.data?.error || "Could not parse CSV. Make sure it's an AO3 history export.");
      setStep('upload');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleConfirm = async () => {
    setStep('importing');
    try {
      const { data } = await confirmAo3Csv(file, 'history');
      setResult(data);
      setSelected(new Set());
      setAssignments({});
      setStep('sort');
      onImported?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed. Please try again.');
      setStep('error');
    }
  };

  // Filtered fic list for the sort step
  const sortFics = useMemo(() => {
    if (!result?.importedFics) return [];
    const cutoff = cutoffDate(dateRange);
    if (!cutoff) return result.importedFics;
    return result.importedFics.filter(fic => {
      const d = parseVisitDate(fic.lastVisited);
      return d && d >= cutoff;
    });
  }, [result, dateRange]);

  const allVisible = sortFics.map(f => f.id);
  const allChecked = allVisible.length > 0 && allVisible.every(id => selected.has(id));

  function toggleSelectAll() {
    if (allChecked) {
      setSelected(prev => {
        const next = new Set(prev);
        allVisible.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...allVisible]));
    }
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function assignSelected(shelf) {
    setAssignments(prev => {
      const next = { ...prev };
      for (const id of selected) next[id] = shelf;
      return next;
    });
    setSelected(new Set());
  }

  async function finishSort() {
    const entries = Object.entries(assignments).map(([ficId, shelf]) => ({ ficId, shelf }));
    if (entries.length === 0) {
      onClose();
      return;
    }
    setSorting(true);
    try {
      await bulkSortFics(entries);
    } catch (_) {
      // best-effort — don't block the user
    }
    setSorting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="text-txt-primary font-semibold">
              {step === 'sort' ? 'Sort your imported fics' : 'Import from AO3'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-elevated text-txt-muted hover:text-txt-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Upload */}
          {(step === 'upload' || step === 'previewing') && (
            <>
              <p className="text-txt-secondary text-sm">
                Export your AO3 reading history using the{' '}
                <a
                  href="https://greasyfork.org/en/scripts/423714-ao3-reading-history-exporter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  AO3 History Exporter
                </a>
                {' '}userscript, then upload the CSV here.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !step.includes('ing') && fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 hover:bg-elevated/50'}
                  ${step === 'previewing' ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {step === 'previewing' ? (
                  <>
                    <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
                    <p className="text-txt-secondary text-sm font-medium">Reading CSV…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-txt-muted mx-auto mb-2" />
                    <p className="text-txt-secondary text-sm font-medium">Drop your CSV here</p>
                    <p className="text-txt-muted text-xs mt-1">or click to browse</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-900/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          {/* Preview */}
          {step === 'preview' && preview && (
            <>
              <div className="bg-elevated rounded-xl p-3 flex items-center justify-between">
                <span className="text-txt-secondary text-sm">
                  <span className="font-semibold text-txt-primary">{preview.total}</span> fics detected
                </span>
                <button
                  onClick={() => setStep('upload')}
                  className="text-txt-muted hover:text-txt-primary text-xs transition-colors"
                >
                  ← Change file
                </button>
              </div>

              <div>
                <p className="text-txt-muted text-xs uppercase tracking-wider mb-2">
                  Preview (first {preview.preview.length})
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {preview.preview.map((fic, i) => <PreviewCard key={i} fic={fic} />)}
                </div>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-xs text-txt-secondary">
                All fics will be added to your <span className="font-semibold text-txt-primary">History</span> shelf.
                After importing you'll get a chance to sort them into Read, Want to Read, or Currently Reading.
              </div>

              <div className="flex gap-2">
                <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleConfirm} className="btn-primary flex-1">
                  Import {preview.total} fics
                </button>
              </div>
            </>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-txt-primary font-medium">Importing your fics…</p>
              <p className="text-txt-muted text-sm">This may take a moment for large libraries.</p>
            </div>
          )}

          {/* Bulk Sort */}
          {step === 'sort' && result && (
            <>
              {/* Summary */}
              <div className="bg-elevated rounded-xl p-3 space-y-0.5">
                <p className="text-txt-primary text-sm font-semibold">
                  {result.imported} fics imported to History
                  {result.skipped > 0 && (
                    <span className="text-txt-muted font-normal"> · {result.skipped} duplicates skipped</span>
                  )}
                </p>
                <p className="text-txt-muted text-xs">
                  Select fics below to move them to the right shelf. Everything else stays in History.
                </p>
              </div>

              {/* Date range filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-txt-muted flex-shrink-0" />
                <label className="text-txt-muted text-xs whitespace-nowrap">Show fics visited:</label>
                <div className="relative flex-1">
                  <select
                    className="input-field w-full text-sm pr-7 appearance-none"
                    value={dateRange}
                    onChange={(e) => { setDateRange(e.target.value); setSelected(new Set()); }}
                  >
                    {DATE_RANGES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-txt-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Select all + count */}
              {sortFics.length > 0 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs text-txt-secondary hover:text-txt-primary transition-colors"
                  >
                    {allChecked
                      ? <CheckSquare className="w-3.5 h-3.5 text-accent" />
                      : <Square className="w-3.5 h-3.5" />}
                    {allChecked ? 'Deselect all' : `Select all (${sortFics.length})`}
                  </button>
                  {selected.size > 0 && (
                    <span className="text-accent text-xs font-medium">{selected.size} selected</span>
                  )}
                </div>
              )}

              {/* Fic list */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {sortFics.length === 0 ? (
                  <p className="text-txt-muted text-sm text-center py-6">
                    No fics visited in this time range.
                  </p>
                ) : (
                  sortFics.map(fic => (
                    <SortRow
                      key={fic.id}
                      fic={fic}
                      checked={selected.has(fic.id)}
                      onToggle={() => toggleOne(fic.id)}
                      shelfOverride={assignments[fic.id]}
                    />
                  ))
                )}
              </div>

              {/* Assign buttons */}
              {selected.size > 0 && (
                <div className="bg-elevated rounded-xl p-3 space-y-2">
                  <p className="text-txt-muted text-xs">Move {selected.size} selected fic{selected.size !== 1 ? 's' : ''} to:</p>
                  <div className="flex gap-2 flex-wrap">
                    {SORT_SHELVES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => assignSelected(s.value)}
                        className={`${s.color} text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment summary */}
              {Object.keys(assignments).length > 0 && (
                <div className="text-xs text-txt-muted">
                  {Object.keys(assignments).length} fic{Object.keys(assignments).length !== 1 ? 's' : ''} assigned
                  {' · '}
                  {result.imported - Object.keys(assignments).length} staying in History
                </div>
              )}
            </>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-txt-primary font-bold">Import failed</p>
                <p className="text-txt-muted text-sm mt-1">{error}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep('upload')} className="btn-secondary flex-1">Try again</button>
                <button onClick={onClose} className="btn-primary flex-1">Close</button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer for sort step */}
        {step === 'sort' && (
          <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-border">
            <button
              onClick={finishSort}
              disabled={sorting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {sorting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                Object.keys(assignments).length > 0
                  ? `Save & finish`
                  : 'Finish — keep all in History'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
