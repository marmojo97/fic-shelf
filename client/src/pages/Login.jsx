import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { login, register, getInviteRequired } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '', inviteCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteRequired, setInviteRequired] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getInviteRequired()
      .then(({ data }) => setInviteRequired(data.required))
      .catch(() => {});
  }, []);

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const { data } = await fn(form);
      signIn(data.token, data.user);
      navigate('/shelf');
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setLoading(true);
    try {
      const { data } = await login({ email: 'demo@archivd.app', password: 'archivd' });
      signIn(data.token, data.user);
      navigate('/shelf');
    } catch {
      setError('Demo account not found. Run: cd server && npm run seed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-3">
            <Bookmark className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <h1 className="text-txt-primary text-2xl font-bold tracking-tight">Archivd</h1>
          <p className="text-txt-muted text-sm mt-1">Your fanfic shelf, organized</p>
        </div>

        <div className="card p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex bg-elevated rounded-lg p-1">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${m === mode ? 'bg-surface text-txt-primary shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-txt-secondary text-xs font-medium mb-1">Email</label>
              <input type="email" required className="input-field text-sm" placeholder="you@example.com"
                value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-txt-secondary text-xs font-medium mb-1">Username</label>
                  <input type="text" required className="input-field text-sm" placeholder="fandom_lover"
                    value={form.username} onChange={(e) => setField('username', e.target.value)} />
                </div>
                <div>
                  <label className="block text-txt-secondary text-xs font-medium mb-1">Display Name <span className="text-txt-muted">(optional)</span></label>
                  <input type="text" className="input-field text-sm" placeholder="Your name"
                    value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} />
                </div>
                {inviteRequired && (
                  <div>
                    <label className="block text-txt-secondary text-xs font-medium mb-1">
                      Invite Code <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field text-sm uppercase tracking-widest"
                      placeholder="XXXXXXXX"
                      value={form.inviteCode}
                      onChange={(e) => setField('inviteCode', e.target.value.toUpperCase())}
                    />
                    <p className="text-txt-muted text-xs mt-1">Archivd is currently invite-only.</p>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="block text-txt-secondary text-xs font-medium mb-1">Password</label>
              <input type="password" required className="input-field text-sm" placeholder="••••••••"
                value={form.password} onChange={(e) => setField('password', e.target.value)} />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-sm py-2.5">
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-txt-muted text-xs">or</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <button onClick={handleDemo} disabled={loading}
            className="w-full py-2.5 border border-border rounded-lg text-sm text-txt-secondary hover:text-txt-primary hover:border-border transition-colors">
            Try demo account
          </button>
        </div>

        <p className="text-center text-txt-muted text-xs mt-4">
          Built for readers, by readers. ✨
        </p>
      </div>
    </div>
  );
}
