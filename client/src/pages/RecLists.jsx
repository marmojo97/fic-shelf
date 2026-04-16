import React, { useState, useEffect } from 'react';
import { Plus, X, Edit3, Trash2, Heart, BookOpen, Loader2, List } from 'lucide-react';
import { StatusBadge } from '../components/Badge.jsx';
import StarRating from '../components/StarRating.jsx';
import { getRecLists, createRecList, deleteRecList, updateRecList, removeFicFromRecList, getFics, addFicToRecList } from '../api/index.js';

function FicPickerModal({ onAdd, onClose }) {
  const [fics, setFics] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFics({ shelf: 'all', search: search || undefined })
      .then(r => { setFics(r.data.fics); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface border border-border-subtle rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
          <h3 className="text-txt-primary font-semibold">Add a Fic</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-elevated rounded-lg"><X className="w-4 h-4 text-txt-muted" /></button>
        </div>
        <div className="px-4 py-3 border-b border-border-subtle flex-shrink-0">
          <input type="text" className="input-field text-sm" placeholder="Search your shelf..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-accent animate-spin" /></div>
          ) : fics.length === 0 ? (
            <p className="text-txt-muted text-sm text-center py-8">No fics found</p>
          ) : fics.map(fic => (
            <button key={fic.id} onClick={() => onAdd(fic)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-elevated transition-colors text-left border-b border-border-subtle last:border-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: fic.coverColor || '#0d4f4f' }} />
              <div className="min-w-0 flex-1">
                <p className="text-txt-primary text-sm font-medium truncate">{fic.title}</p>
                <p className="text-txt-muted text-xs truncate">by {fic.author} · {fic.fandom}</p>
              </div>
              {fic.personalRating > 0 && <StarRating value={fic.personalRating} readonly size={11} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RecLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedList, setExpandedList] = useState(null);
  const [showPicker, setShowPicker] = useState(null); // listId

  useEffect(() => {
    getRecLists().then(r => { setLists(r.data.recLists); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await createRecList({ title: newTitle, description: newDesc });
      setLists(prev => [{ ...data.recList, items: [] }, ...prev]);
      setNewTitle(''); setNewDesc(''); setShowNewForm(false);
    } catch {}
    finally { setCreating(false); }
  }

  async function handleDelete(id) {
    await deleteRecList(id);
    setLists(prev => prev.filter(l => l.id !== id));
  }

  async function handleAddFic(listId, fic) {
    try {
      await addFicToRecList(listId, fic.id);
      setLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...(l.items || []), { fic_id: fic.id, fic, note: '' }] } : l));
    } catch (e) {
      if (e?.response?.status === 409) alert('That fic is already in this list.');
    }
    setShowPicker(null);
  }

  async function handleRemoveFic(listId, ficId) {
    await removeFicFromRecList(listId, ficId);
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: (l.items || []).filter(i => i.fic_id !== ficId) } : l));
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-accent animate-spin" /></div>;

  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-txt-primary font-bold text-xl">Rec Lists</h1>
          <p className="text-txt-muted text-sm mt-0.5">Curate themed lists to share or remember</p>
        </div>
        <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> New list
        </button>
      </div>

      {/* New list form */}
      {showNewForm && (
        <form onSubmit={handleCreate} className="card p-4 mb-4 space-y-3">
          <div>
            <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">List Title</label>
            <input type="text" autoFocus className="input-field text-sm" placeholder="e.g. Essential Slow Burns 🔥" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-txt-secondary text-xs font-medium mb-1 uppercase tracking-wider">Description</label>
            <textarea className="input-field text-sm resize-none h-16" placeholder="What's this list about?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowNewForm(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={creating || !newTitle} className="btn-primary text-sm">
              {creating ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {lists.length === 0 && !showNewForm && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="text-txt-primary font-semibold mb-1">No rec lists yet</h3>
          <p className="text-txt-muted text-sm mb-5 max-w-xs mx-auto">Rec lists are the best way to share your taste. Make one for a vibe, a ship, a comfort reread.</p>
          <button onClick={() => setShowNewForm(true)} className="btn-primary text-sm mx-auto">
            <Plus className="w-4 h-4" /> Create your first list
          </button>
        </div>
      )}

      {/* Lists */}
      <div className="space-y-4">
        {lists.map(list => (
          <div key={list.id} className="card overflow-hidden">
            {/* List header */}
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-txt-primary font-semibold">{list.title}</h3>
                {list.description && <p className="text-txt-muted text-sm mt-0.5">{list.description}</p>}
                <p className="text-txt-muted text-xs mt-1.5">{(list.items || []).length} fic{(list.items || []).length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}
                  className="p-1.5 hover:bg-elevated rounded-lg transition-colors text-txt-muted hover:text-txt-secondary">
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setShowPicker(list.id)}
                  className="p-1.5 hover:bg-elevated rounded-lg transition-colors text-txt-muted hover:text-accent">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(list.id)}
                  className="p-1.5 hover:bg-elevated rounded-lg transition-colors text-txt-muted hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Preview or full list */}
            {(list.items || []).length > 0 && (
              <div className="border-t border-border-subtle">
                {(expandedList === list.id ? list.items : list.items.slice(0, 3)).map((item, i) => {
                  const fic = item.fic || item;
                  return (
                    <div key={fic.fic_id || fic.id || i} className="flex items-center gap-3 px-5 py-2.5 border-b border-border-subtle last:border-0">
                      <span className="text-txt-muted text-xs w-5 flex-shrink-0">{i + 1}</span>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: fic.cover_color || fic.coverColor || '#0d4f4f' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-txt-primary text-sm font-medium truncate">{fic.title}</p>
                        <p className="text-txt-muted text-xs truncate">by {fic.author} · {fic.fandom}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fic.personalRating > 0 && <StarRating value={fic.personalRating || fic.personal_rating} readonly size={11} />}
                        <button onClick={() => handleRemoveFic(list.id, fic.fic_id || fic.id)}
                          className="text-txt-muted hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!expandedList && list.items.length > 3 && (
                  <button onClick={() => setExpandedList(list.id)} className="w-full px-5 py-2 text-xs text-txt-muted hover:text-txt-secondary text-left hover:bg-elevated transition-colors">
                    + {list.items.length - 3} more fic{list.items.length - 3 !== 1 ? 's' : ''}
                  </button>
                )}
                {expandedList === list.id && (
                  <button onClick={() => setExpandedList(null)} className="w-full px-5 py-2 text-xs text-txt-muted hover:text-txt-secondary text-left hover:bg-elevated transition-colors">
                    Show less
                  </button>
                )}
              </div>
            )}

            {/* Empty list state */}
            {(list.items || []).length === 0 && (
              <div className="px-5 py-3 border-t border-border-subtle">
                <button onClick={() => setShowPicker(list.id)} className="text-xs text-accent hover:text-accent-dim flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add fics to this list
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fic picker modal */}
      {showPicker && (
        <FicPickerModal
          onAdd={(fic) => handleAddFic(showPicker, fic)}
          onClose={() => setShowPicker(null)}
        />
      )}
    </div>
  );
}
