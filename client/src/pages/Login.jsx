import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, FlaskConical } from 'lucide-react';
import { login, register, getInviteRequired } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function FieldLabel({ children }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-[0.09em] text-txt-muted mb-1.5">
      {children}
    </label>
  );
}

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
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[360px]">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div
            className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-4"
            style={{ boxShadow: '0 8px 20px rgba(153,0,0,0.25)' }}
          >
            <Bookmark className="w-7 h-7 text-white" fill="currentColor" />
          </div>
          <h1 className="text-txt-primary text-[26px] font-bold tracking-tight leading-tight">Archivd</h1>
          <p className="text-txt-secondary text-sm mt-1.5">Your fanfic shelf, organized.</p>
          <p className="text-txt-muted text-xs mt-1">Built for readers, by readers. ✨</p>
        </div>

        {/* Auth card */}
        <div
          className="bg-surface border border-border-subtle rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        >
          {/* Mode toggle */}
          <div className="p-4 pb-0">
            <div className="flex bg-elevated rounded-lg p-1 gap-1">
              {['login', 'register'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                    m === mode
                      ? 'bg-surface text-txt-primary shadow-sm'
                      : 'text-txt-muted hover:text-txt-secondary'
                  }`}
                >
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                type="email" required
                className="input-field text-sm"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <FieldLabel>Username</FieldLabel>
                  <input
                    type="text" required
                    className="input-field text-sm"
                    placeholder="fandom_lover"
                    value={form.username}
                    onChange={(e) => setField('username', e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Display Name</FieldLabel>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Your name (optional)"
                    value={form.displayName}
                    onChange={(e) => setField('displayName', e.target.value)}
                  />
                </div>
                {inviteRequired && (
                  <div>
                    <FieldLabel>Invite Code</FieldLabel>
                    <input
                      type="text" required
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
              <FieldLabel>Password</FieldLabel>
              <input
                type="password" required
                className="input-field text-sm"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center text-sm py-2.5 mt-1"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Get started'}
            </button>
          </form>

          <div className="px-4 pb-4">
            <div className="relative flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-txt-muted text-xs">or</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            <button
              onClick={handleDemo}
              disabled={loading}
              className="w-full py-2.5 border border-border-subtle rounded-lg text-sm text-txt-secondary hover:text-txt-primary hover:border-border transition-colors bg-elevated hover:bg-white"
            >
              Try demo account
            </button>
          </div>
        </div>

        {/* Beta chip */}
        <div className="flex justify-center mt-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
            <FlaskConical className="w-3 h-3" />
            You're using an early beta
          </div>
        </div>
      </div>
    </div>
  );
}
