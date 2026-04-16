import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { previewAo3Csv, confirmAo3Csv } from '../api/index.js';

const SHELVES = [
  { value: 'read', label: 'Read' },
  { value: 'want-to-read', label: 'Want to Read' },
  { value: 'reading', label: 'Currently Reading' },
];

const RATING_BADGE = { G: 'bg-green-900/50 text-green-400', T: 'bg-blue-900/50 text-blue-400', M: 'bg-orange-900/50 text-orange-400', E: 'bg-red-900/50 text-red-400' };

function PreviewCard({ fic }) {
  return (
    <div className="bg-elevated rounded-xl p-3 flex gap-3 items-start">
      <div className="w-8 h-12 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: fic.cover_color || '#14b8a6' }}>
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
          {fic.wordCount > 0 && (
            <span className="text-txt-muted text-xs">{fic.wordCount.toLocaleString()} words</span>
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

export default function ImportModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload'); // upload | preview | importing | done | error
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [shelf, setShelf] = useState('read');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a .csv file exported from AO3.');
      return;
    }
    setFile(f);
    setError('');
    setStep('preview');
    try {
      const { data } = await previewAo3Csv(f);
      setPreview(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not parse CSV. Make sure it\'s an AO3 export.');
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
      const { data } = await confirmAo3Csv(file, shelf);
      setResult(data);
      setStep('done');
      onImported?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed. Please try again.');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h2 className="text-txt-primary font-semibold">Import from AO3</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-elevated text-txt-muted hover:text-txt-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Upload step */}
          {step === 'upload' && (
            <>
              <p className="text-txt-secondary text-sm">
                Export your reading history from AO3: <strong className="text-txt-primary">My AO3 → Export Data</strong>, then upload the CSV here.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 hover:bg-elevated/50'}`}
              >
                <Upload className="w-8 h-8 text-txt-muted mx-auto mb-2" />
                <p className="text-txt-secondary text-sm font-medium">Drop your CSV here</p>
                <p className="text-txt-muted text-xs mt-1">or click to browse</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-900/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          {/* Preview step */}
          {step === 'preview' && preview && (
            <>
              <div className="bg-elevated rounded-xl p-3 flex items-center justify-between">
                <span className="text-txt-secondary text-sm">{preview.total} fics detected</span>
                <button onClick={() => setStep('upload')} className="text-txt-muted hover:text-txt-primary text-xs transition-colors">← Change file</button>
              </div>

              <div>
                <p className="text-txt-muted text-xs uppercase tracking-wider mb-2">Preview (first 5)</p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {preview.preview.map((fic, i) => <PreviewCard key={i} fic={fic} />)}
                </div>
              </div>

              <div>
                <label className="text-txt-muted text-xs uppercase tracking-wider block mb-1.5">Add to shelf</label>
                <select
                  className="input-field w-full text-sm"
                  value={shelf}
                  onChange={(e) => setShelf(e.target.value)}
                >
                  {SHELVES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
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

          {/* Done */}
          {step === 'done' && result && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-txt-primary font-bold text-lg">{result.imported} fics imported!</p>
                {result.skipped > 0 && (
                  <p className="text-txt-muted text-sm mt-1">{result.skipped} duplicates skipped</p>
                )}
              </div>
              {result.skippedTitles?.length > 0 && (
                <details className="text-left">
                  <summary className="text-txt-muted text-xs cursor-pointer hover:text-txt-secondary">View skipped titles</summary>
                  <div className="mt-2 max-h-24 overflow-y-auto">
                    {result.skippedTitles.map((t, i) => (
                      <p key={i} className="text-txt-muted text-xs py-0.5">{t}</p>
                    ))}
                  </div>
                </details>
              )}
              <button onClick={onClose} className="btn-primary w-full">Done</button>
            </div>
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
      </div>
    </div>
  );
}
