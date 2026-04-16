import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Users, Ticket, MessageSquare, Sparkles, FlaskConical,
  Plus, Trash2, Eye, EyeOff, RefreshCw, LogOut, Loader2,
  Copy, Check, ToggleLeft, ToggleRight, Calendar, ChevronDown, ChevronUp,
  Image as ImageIcon, X
} from 'lucide-react';
import {
  adminLogin, adminGetStats, adminGetInviteCodes, adminCreateInviteCode,
  adminUpdateInviteCode, adminDeleteInviteCode, adminGetFeedback,
  adminDeleteFeedback, adminGetFeedbackScreenshot, adminGetChangelog,
  adminCreateChangelogEntry, adminUpdateChangelogEntry, adminDeleteChangelogEntry,
  adminGetBetaBanner, adminSetBetaBanner
} from '../api/index.js';

const TABS = [
  { id: 'stats', label: 'Overview', icon: Users },
  { id: 'invites', label: 'Invite Codes', icon: Ticket },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'changelog', label: 'Changelog', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: FlaskConical },
];

// ─── Top-level auth gate ──────────────────────────────────────────────────────

function useAdminAuth() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('archivd_admin_token'));

  const login = useCallback(async (password) => {
    const { data } = await adminLogin(password);
    localStorage.setItem('archivd_admin_token', data.token);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('archivd_admin_token');
    setAuthed(false);
  }, []);

  return { authed, login, logout };
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await onLogin(password);
    } catch {
      setError('Incorrect admin password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-txt-primary text-xl font-bold">Admin Panel</h1>
          <p className="text-txt-muted text-sm mt-1">Archivd Beta</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-txt-secondary text-xs font-medium mb-1">Admin Password</label>
              <input
                type="password" required autoFocus
                className="input-field text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-sm py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Stats tab ────────────────────────────────────────────────────────────────

function StatsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetStats().then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <TabLoader />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Users" value={data?.totalUsers ?? 0} />
        <StatCard label="Active (7 days)" value={data?.activeUsers ?? 0} />
      </div>

      <div>
        <h3 className="text-txt-primary font-semibold text-sm mb-3">All Accounts</h3>
        <div className="space-y-2">
          {(data?.users ?? []).map(user => (
            <div key={user.id} className="flex items-center gap-3 p-3 bg-elevated rounded-xl border border-border-subtle">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-xs font-semibold uppercase">{user.username?.[0]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-txt-primary text-sm font-medium truncate">{user.display_name || user.username}</p>
                <p className="text-txt-muted text-xs truncate">@{user.username} · {user.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-txt-muted text-xs">{user.fic_count} fics</p>
                <p className="text-txt-muted text-xs">{formatDate(user.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-txt-primary text-3xl font-bold">{value}</p>
      <p className="text-txt-muted text-xs mt-1">{label}</p>
    </div>
  );
}

// ─── Invite Codes tab ─────────────────────────────────────────────────────────

function InvitesTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('1');
  const [copied, setCopied] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    adminGetInviteCodes().then(({ data }) => setCodes(data.codes)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await adminCreateInviteCode({ code: newCode || undefined, maxUses: parseInt(newMaxUses) || 1 });
      setNewCode(''); setNewMaxUses('1');
      load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to create code');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(code) {
    await adminUpdateInviteCode(code.id, { isActive: !code.is_active });
    load();
  }

  async function del(id) {
    if (!confirm('Delete this invite code?')) return;
    await adminDeleteInviteCode(id);
    load();
  }

  function copy(text, id) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <TabLoader />;

  return (
    <div className="space-y-5">
      {/* Create form */}
      <form onSubmit={create} className="card p-4 space-y-3">
        <p className="text-txt-primary text-sm font-semibold">Generate Invite Code</p>
        <div className="flex gap-2">
          <input
            className="input-field text-sm flex-1 uppercase tracking-widest"
            placeholder="Auto-generate or enter custom"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            maxLength={20}
          />
          <div className="flex items-center gap-1">
            <label className="text-txt-muted text-xs whitespace-nowrap">Max uses</label>
            <input
              type="number"
              className="input-field text-sm w-16"
              value={newMaxUses}
              min="0"
              onChange={(e) => setNewMaxUses(e.target.value)}
            />
          </div>
        </div>
        <p className="text-txt-muted text-xs">Set max uses to 0 for unlimited.</p>
        <button type="submit" disabled={creating} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create Code
        </button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {codes.length === 0 && (
          <p className="text-txt-muted text-sm text-center py-8">No invite codes yet.</p>
        )}
        {codes.map(code => (
          <div key={code.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <code className="text-accent font-mono font-semibold text-sm flex-1">{code.code}</code>
              <span className="text-txt-muted text-xs">
                {code.use_count}/{code.max_uses === 0 ? '∞' : code.max_uses} uses
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => copy(code.code, code.id)} className="p-1.5 hover:bg-elevated rounded-lg transition-colors" title="Copy">
                  {copied === code.id ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5 text-txt-muted" />}
                </button>
                <button onClick={() => toggleActive(code)} className="p-1.5 hover:bg-elevated rounded-lg transition-colors" title={code.is_active ? 'Deactivate' : 'Activate'}>
                  {code.is_active
                    ? <ToggleRight className="w-4 h-4 text-accent" />
                    : <ToggleLeft className="w-4 h-4 text-txt-muted" />
                  }
                </button>
                <button onClick={() => setExpanded(expanded === code.id ? null : code.id)} className="p-1.5 hover:bg-elevated rounded-lg transition-colors">
                  {expanded === code.id ? <ChevronUp className="w-3.5 h-3.5 text-txt-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />}
                </button>
                <button onClick={() => del(code.id)} className="p-1.5 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>

            {expanded === code.id && (
              <div className="border-t border-border-subtle px-3 pb-3 pt-2 space-y-1">
                {code.uses?.length === 0
                  ? <p className="text-txt-muted text-xs">Not used yet</p>
                  : code.uses?.map((use, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-txt-secondary font-medium">{use.username || '?'}</span>
                      <span className="text-txt-muted">{use.email}</span>
                      <span className="text-txt-muted ml-auto">{formatDate(use.used_at)}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feedback tab ─────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  bug: 'text-red-400 bg-red-400/10',
  feature: 'text-yellow-400 bg-yellow-400/10',
  general: 'text-accent bg-accent/10',
};

function FeedbackTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [screenshot, setScreenshot] = useState({});
  const [loadingScreenshot, setLoadingScreenshot] = useState(null);

  const load = useCallback(() => {
    adminGetFeedback().then(({ data }) => setItems(data.feedback)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function loadScreenshot(id) {
    if (screenshot[id]) return;
    setLoadingScreenshot(id);
    try {
      const { data } = await adminGetFeedbackScreenshot(id);
      setScreenshot(prev => ({ ...prev, [id]: data.screenshot_data }));
    } catch {
      setScreenshot(prev => ({ ...prev, [id]: null }));
    } finally {
      setLoadingScreenshot(null);
    }
  }

  async function del(id) {
    if (!confirm('Delete this feedback entry?')) return;
    await adminDeleteFeedback(id);
    load();
  }

  if (loading) return <TabLoader />;

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-txt-muted text-sm text-center py-8">No feedback yet.</p>
      )}
      {items.map(item => (
        <div key={item.id} className="card overflow-hidden">
          <div
            className="flex items-start gap-3 p-3 cursor-pointer"
            onClick={() => {
              const next = expanded === item.id ? null : item.id;
              setExpanded(next);
              if (next && item.has_screenshot) loadScreenshot(item.id);
            }}
          >
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 flex-shrink-0 ${TYPE_COLORS[item.type] || ''}`}>
              {item.type}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-txt-primary text-sm line-clamp-2">{item.message}</p>
              <p className="text-txt-muted text-xs mt-0.5">
                {item.username} · {item.page_url || '/'} · {formatDate(item.created_at)}
                {item.has_screenshot && <span className="ml-1 text-accent">📷</span>}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={(e) => { e.stopPropagation(); del(item.id); }} className="p-1.5 hover:bg-red-400/10 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
              {expanded === item.id ? <ChevronUp className="w-3.5 h-3.5 text-txt-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />}
            </div>
          </div>

          {expanded === item.id && (
            <div className="border-t border-border-subtle p-3 space-y-3">
              <p className="text-txt-secondary text-sm whitespace-pre-wrap">{item.message}</p>
              {item.has_screenshot && (
                <div>
                  {loadingScreenshot === item.id
                    ? <div className="h-24 bg-elevated rounded-lg flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-txt-muted" /></div>
                    : screenshot[item.id]
                      ? <img src={screenshot[item.id]} alt="Screenshot" className="w-full rounded-lg border border-border-subtle" />
                      : <p className="text-txt-muted text-xs">Screenshot unavailable</p>
                  }
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Changelog tab ────────────────────────────────────────────────────────────

function ChangelogTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', entryDate: todayStr() });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminGetChangelog().then(({ data }) => setEntries(data.entries)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  function startEdit(entry) {
    setEditId(entry.id);
    setForm({ title: entry.title, description: entry.description, entryDate: entry.entry_date });
  }

  function cancelEdit() {
    setEditId(null);
    setForm({ title: '', description: '', entryDate: todayStr() });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await adminUpdateChangelogEntry(editId, { title: form.title, description: form.description, entryDate: form.entryDate });
      } else {
        await adminCreateChangelogEntry({ title: form.title, description: form.description, entryDate: form.entryDate });
      }
      cancelEdit();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function del(id) {
    if (!confirm('Delete this entry?')) return;
    await adminDeleteChangelogEntry(id);
    load();
  }

  if (loading) return <TabLoader />;

  return (
    <div className="space-y-5">
      {/* Form */}
      <form onSubmit={save} className="card p-4 space-y-3">
        <p className="text-txt-primary text-sm font-semibold">{editId ? 'Edit Entry' : 'New Entry'}</p>
        <div className="space-y-2">
          <input
            required
            className="input-field text-sm"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <textarea
            required
            rows={4}
            className="input-field text-sm resize-none"
            placeholder="Describe the update..."
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <input
            required
            type="date"
            className="input-field text-sm"
            value={form.entryDate}
            onChange={(e) => setForm(f => ({ ...f, entryDate: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {editId ? 'Update' : 'Add Entry'}
          </button>
          {editId && (
            <button type="button" onClick={cancelEdit} className="text-sm px-4 py-1.5 border border-border rounded-lg text-txt-muted hover:text-txt-primary transition-colors">
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="space-y-2">
        {entries.map(entry => (
          <div key={entry.id} className="card p-4 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-txt-primary font-semibold text-sm">{entry.title}</h3>
                  <span className="text-txt-muted text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{formatDate(entry.entry_date)}
                  </span>
                </div>
                <p className="text-txt-secondary text-xs mt-1 line-clamp-2">{entry.description}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => startEdit(entry)} className="p-1.5 hover:bg-elevated rounded-lg transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-txt-muted" />
                </button>
                <button onClick={() => del(entry.id)} className="p-1.5 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-txt-muted text-sm text-center py-8">No changelog entries yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminGetBetaBanner()
      .then(({ data }) => setBannerEnabled(data.enabled))
      .finally(() => setLoading(false));
  }, []);

  async function toggleBanner() {
    setSaving(true);
    const next = !bannerEnabled;
    try {
      await adminSetBetaBanner(next);
      setBannerEnabled(next);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <TabLoader />;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-txt-primary font-medium text-sm">Beta Banner</p>
            <p className="text-txt-muted text-xs mt-0.5">Show the early-beta warning bar to all users</p>
          </div>
          <button
            onClick={toggleBanner}
            disabled={saving}
            className="flex-shrink-0"
          >
            {bannerEnabled
              ? <ToggleRight className="w-8 h-8 text-accent" />
              : <ToggleLeft className="w-8 h-8 text-txt-muted" />
            }
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-2">
        <p className="text-txt-primary font-medium text-sm">Environment Variables</p>
        <div className="space-y-1 text-xs font-mono">
          {[
            'ADMIN_PASSWORD', 'ADMIN_EMAIL', 'RESEND_API_KEY', 'INVITE_ONLY', 'JWT_SECRET'
          ].map(k => (
            <div key={k} className="flex items-center gap-2 py-1 border-b border-border-subtle last:border-0">
              <span className="text-accent">{k}</span>
              <span className="text-txt-muted">— set in server .env</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-txt-muted" />
    </div>
  );
}

function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return str;
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Admin() {
  const { authed, login, logout } = useAdminAuth();
  const [tab, setTab] = useState('stats');

  if (!authed) return <AdminLogin onLogin={login} />;

  const TAB_CONTENT = {
    stats: <StatsTab />,
    invites: <InvitesTab />,
    feedback: <FeedbackTab />,
    changelog: <ChangelogTab />,
    settings: <SettingsTab />,
  };

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-border-subtle px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-txt-primary font-semibold text-sm flex-1">Archivd Admin</span>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-txt-muted hover:text-txt-secondary text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <aside className="w-44 bg-surface border-r border-border-subtle flex-shrink-0 py-4 px-2 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                tab === id
                  ? 'bg-accent/15 text-accent'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-elevated'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {TAB_CONTENT[tab]}
          </div>
        </main>
      </div>
    </div>
  );
}
