import React, { useState } from 'react';
import { X, Loader2, Sparkles, AlertCircle, Plus } from 'lucide-react';
import { createFic, fetchAo3 } from '../api/index.js';

const SHELVES = [
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'reading',      label: 'Currently Reading' },
  { value: 'read',         label: 'Read' },
  { value: 'dnf',          label: 'DNF' },
  { value: 're-reading',   label: 'Re-reading' },
];

const RATINGS = ['G', 'T', 'M', 'E'];
const STATUSES = [
  { value: 'complete',    label: 'Complete' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'abandoned',   label: 'Abandoned' },
];
const PLATFORMS = ['ao3', 'ffn', 'wattpad', 'tumblr', 'other'];
const COMMON_WARNINGS = [
  'Major Character Death', 'Non-Con', 'Graphic Violence', 'Underage',
];

function TagInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-elevated text-txt-secondary">
            {tag}
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-red-400 transition-colors">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input-field text-sm flex-1"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button type="button" onClick={add} className="btn-ghost text-sm px-3">Add</button>
      </div>
    </div>
  );
}

const DEFAULT_FORM = {
  title: '', author: '', fandom: '', ships: [], characters: [],
  wordCount: '', chapterCount: '1', chaptersRead: '0',
  completionStatus: 'in-progress', contentRating: 'T',
  contentWarnings: [], tags: [], language: 'English',
  seriesName: '', sourceUrl: '', sourcePlatform: 'ao3',
  lastUpdatedDate: '', shelf: 'want-to-read',
  personalRating: 0, personalNotes: '',
  dateStarted: '', dateFinished: '',
};

export default function AddFicModal({ onClose, onAdded }) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState('url'); // 'url' | 'form'

  async function handleFetchUrl() {
    if (!url.trim()) { setStep('form'); return; }
    setFetching(true); setFetchError(null); setFetchNote(null);
    try {
      const { data } = await fetchAo3(url.trim());
      if (data.canAutoFill) {
        setForm(prev => ({
          ...prev,
          title: data.data.title || '',
          author: data.data.author || '',
          fandom: data.data.fandom || '',
          ships: data.data.ships || [],
          characters: data.data.characters || [],
          wordCount: String(data.data.wordCount || ''),
          chapterCount: String(data.data.chapterCount || '1'),
          completionStatus: data.data.completionStatus || 'in-progress',
          contentRating: data.data.contentRating || 'T',
          contentWarnings: data.data.contentWarnings || [],
          tags: data.data.tags || [],
          language: data.data.language || 'English',
          seriesName: data.data.seriesName || '',
          sourceUrl: url.trim(),
          sourcePlatform: data.data.sourcePlatform || 'ao3',
          lastUpdatedDate: data.data.lastUpdatedDate || '',
        }));
        setFetchNote(data.data.note || null);
      }
    } catch (e) {
      setFetchError('Couldn\'t auto-fill. You can enter details manually.');
    } finally {
      setFetching(false);
      setStep('form');
    }
  }

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) return;
    setSaving(true);
    try {
      const { data } = await createFic({
        ...form,
        wordCount: parseInt(form.wordCount) || 0,
        chapterCount: parseInt(form.chapterCount) || 1,
        chaptersRead: parseInt(form.chaptersRead) || 0,
      });
      onAdded(data.fic);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50 modal-overlay flex items-start justify-center pt-8 pb-8 px-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="bg-surface border border-border-subtle rounded-2xl w-full max-w-xl modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <div>
              <h2 className="text-txt-primary font-semibold text-lg">Add a fic</h2>
              <p className="text-txt-muted text-xs mt-0.5">Paste an AO3 link to auto-fill, or add manually</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-elevated rounded-lg transition-colors">
              <X className="w-4 h-4 text-txt-muted" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* URL field */}
            <div>
              <label className="block text-txt-secondary text-xs font-medium mb-1.5 uppercase tracking-wider">Source URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  className="input-field text-sm flex-1"
                  placeholder="https://archiveofourown.org/works/..."
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setStep('url'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchUrl(); } }}
                />
                <button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={fetching}
                  className="btn-primary text-sm px-4 flex-shrink-0"
                >
                  {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {fetching ? 'Fetching...' : 'Auto-fill'}
                </button>
              </div>
              {fetchNote && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-accent bg-accent/10 rounded-lg px-3 py-2">
                  <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {fetchNote}
                </div>
              )}
              {fetchError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {fetchError}
                </div>
              )}
              {step === 'url' && !fetchNote && !fetchError && (
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="mt-2 text-xs text-txt-muted hover:text-txt-secondary underline"
                >
                  Skip and add manually →
                </button>
              )}
            </div>

            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Required fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Title *</label>
                    <input type="text" required className="input-field text-sm" placeholder="Fic title" value={form.title} onChange={(e) => setField('title', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Author *</label>
                    <input type="text" required className="input-field text-sm" placeholder="Author name" value={form.author} onChange={(e) => setField('author', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Fandom</label>
                    <input type="text" className="input-field text-sm" placeholder="e.g. Harry Potter, MCU" value={form.fandom} onChange={(e) => setField('fandom', e.target.value)} />
                  </div>
                </div>

                {/* Ships */}
                <div>
                  <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Ships / Pairings</label>
                  <TagInput value={form.ships} onChange={(v) => setField('ships', v)} placeholder="e.g. Remus/Sirius — press Enter" />
                </div>

                {/* Word count + chapters */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Word Count</label>
                    <input type="number" min="0" className="input-field text-sm" placeholder="0" value={form.wordCount} onChange={(e) => setField('wordCount', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Chapters</label>
                    <input type="number" min="1" className="input-field text-sm" value={form.chapterCount} onChange={(e) => setField('chapterCount', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Read so far</label>
                    <input type="number" min="0" className="input-field text-sm" value={form.chaptersRead} onChange={(e) => setField('chaptersRead', e.target.value)} />
                  </div>
                </div>

                {/* Status + Rating */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Completion</label>
                    <select className="input-field text-sm" value={form.completionStatus} onChange={(e) => setField('completionStatus', e.target.value)}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Content Rating</label>
                    <div className="flex gap-1.5">
                      {RATINGS.map(r => (
                        <button key={r} type="button"
                          onClick={() => setField('contentRating', r)}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${form.contentRating === r ? 'bg-accent/20 border-accent text-accent' : 'border-border text-txt-muted hover:border-border'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Shelf */}
                <div>
                  <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Add to Shelf</label>
                  <select className="input-field text-sm" value={form.shelf} onChange={(e) => setField('shelf', e.target.value)}>
                    {SHELVES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {/* Content warnings */}
                <div>
                  <label className="block text-txt-secondary text-xs font-medium mb-1.5 uppercase tracking-wider">Content Warnings</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COMMON_WARNINGS.map(w => (
                      <button key={w} type="button"
                        onClick={() => setField('contentWarnings', form.contentWarnings.includes(w) ? form.contentWarnings.filter(x => x !== w) : [...form.contentWarnings, w])}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.contentWarnings.includes(w) ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'border-border text-txt-muted hover:text-txt-secondary'}`}>
                        {w}
                      </button>
                    ))}
                  </div>
                  <TagInput value={form.contentWarnings} onChange={(v) => setField('contentWarnings', v)} placeholder="Add custom warning..." />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Tags</label>
                  <TagInput value={form.tags} onChange={(v) => setField('tags', v)} placeholder="e.g. Slow Burn, Hurt/Comfort — press Enter" />
                </div>

                {/* Advanced */}
                <div>
                  <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-txt-muted hover:text-txt-secondary flex items-center gap-1">
                    <Plus className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-45' : ''}`} />
                    {showAdvanced ? 'Hide' : 'Show'} advanced fields
                  </button>
                  {showAdvanced && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-border-subtle">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Date Started</label>
                          <input type="date" className="input-field text-sm" value={form.dateStarted} onChange={(e) => setField('dateStarted', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Date Finished</label>
                          <input type="date" className="input-field text-sm" value={form.dateFinished} onChange={(e) => setField('dateFinished', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Series Name</label>
                        <input type="text" className="input-field text-sm" value={form.seriesName} onChange={(e) => setField('seriesName', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Characters</label>
                        <TagInput value={form.characters} onChange={(v) => setField('characters', v)} placeholder="Add character..." />
                      </div>
                      <div>
                        <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Language</label>
                        <input type="text" className="input-field text-sm" value={form.language} onChange={(e) => setField('language', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Notes</label>
                        <textarea className="input-field text-sm min-h-[80px] resize-none" placeholder="Your initial thoughts..." value={form.personalNotes} onChange={(e) => setField('personalNotes', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                  <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
                  <button type="submit" disabled={saving || !form.title || !form.author} className="btn-primary text-sm">
                    {saving ? 'Adding...' : 'Add to Shelf'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
