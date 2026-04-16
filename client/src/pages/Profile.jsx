import React, { useState, useEffect } from 'react';
import { Edit3, Check, BookOpen, Star, Zap, RotateCcw, Loader2, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { updateMe } from '../api/index.js';
import { getStats } from '../api/index.js';
import StarRating from '../components/StarRating.jsx';

function formatWords(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', readingSpeed: 250, annualGoal: 50 });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.display_name || '',
        bio: user.bio || '',
        readingSpeed: user.reading_speed || 250,
        annualGoal: user.annual_goal || 50,
      });
    }
  }, [user]);

  useEffect(() => {
    getStats().then(r => { setStats(r.data); setStatsLoading(false); }).catch(() => setStatsLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateMe(form);
      await refreshUser();
      setEditing(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }

  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="px-6 py-6 max-w-2xl">
      <h1 className="text-txt-primary font-bold text-xl mb-6">Profile</h1>

      {/* Profile card */}
      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-2xl font-bold uppercase">
                {user?.display_name?.[0] || user?.username?.[0] || '?'}
              </span>
            </div>
            <div>
              {editing ? (
                <input className="input-field text-base font-semibold mb-1" value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} placeholder="Display name" />
              ) : (
                <h2 className="text-txt-primary font-bold text-lg">{user?.display_name || user?.username}</h2>
              )}
              <p className="text-txt-muted text-sm">@{user?.username}</p>
              {joined && <p className="text-txt-muted text-xs mt-0.5">Reader since {joined}</p>}
            </div>
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              editing ? 'bg-accent/15 border-accent text-accent hover:bg-accent/25' : 'border-border text-txt-muted hover:text-txt-secondary'
            }`}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {/* Bio */}
        <div className="mt-4">
          {editing ? (
            <textarea className="input-field text-sm resize-none h-20 w-full" placeholder="Tell other fans about yourself..." value={form.bio} onChange={(e) => setField('bio', e.target.value)} />
          ) : (
            <p className={`text-sm leading-relaxed ${user?.bio ? 'text-txt-secondary' : 'text-txt-muted italic'}`}>
              {user?.bio || 'No bio yet. Click Edit to add one.'}
            </p>
          )}
        </div>
      </div>

      {/* Stats snapshot */}
      {!statsLoading && stats && (
        <div className="card p-5 mb-5">
          <h3 className="text-txt-primary font-semibold mb-4">Reading Snapshot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-elevated rounded-xl px-3 py-3 text-center">
              <p className="text-txt-muted text-xs mb-0.5">Fics Read</p>
              <p className="text-txt-primary font-bold text-2xl">{stats.totals?.total_read || 0}</p>
            </div>
            <div className="bg-elevated rounded-xl px-3 py-3 text-center">
              <p className="text-txt-muted text-xs mb-0.5">Words Read</p>
              <p className="text-txt-primary font-bold text-2xl">{formatWords(stats.totals?.total_words_read || 0)}</p>
            </div>
            <div className="bg-elevated rounded-xl px-3 py-3 text-center">
              <p className="text-txt-muted text-xs mb-0.5">Avg Rating</p>
              <p className="text-txt-primary font-bold text-2xl">
                {stats.totals?.avg_rating ? Number(stats.totals.avg_rating).toFixed(1) : '—'}
              </p>
            </div>
            <div className="bg-elevated rounded-xl px-3 py-3 text-center">
              <p className="text-txt-muted text-xs mb-0.5">Streak</p>
              <p className="text-accent font-bold text-2xl">{stats.streak || 0}d</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-txt-muted" />
          <h3 className="text-txt-primary font-semibold">Reading Preferences</h3>
        </div>

        <div className="space-y-4">
          {/* Reading speed */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-txt-secondary text-sm font-medium">Reading Speed</label>
              <span className="text-txt-muted text-sm">{form.readingSpeed} wpm</span>
            </div>
            <input
              type="range" min="100" max="600" step="25"
              value={form.readingSpeed}
              onChange={(e) => setField('readingSpeed', Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-txt-muted mt-0.5">
              <span>100 wpm</span>
              <span className="text-accent text-xs">Used to estimate reading time</span>
              <span>600 wpm</span>
            </div>
          </div>

          {/* Annual goal */}
          <div>
            <label className="block text-txt-secondary text-sm font-medium mb-1.5">Annual Reading Goal</label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" max="1000" className="input-field text-sm w-24" value={form.annualGoal} onChange={(e) => setField('annualGoal', Number(e.target.value))} />
              <span className="text-txt-muted text-sm">fics per year</span>
            </div>
          </div>

          {/* Save preferences */}
          <div className="pt-2 border-t border-border-subtle">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
