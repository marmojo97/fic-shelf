import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Compass, BarChart2, List, User, LogOut, Bookmark, Upload, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import ImportModal from './ImportModal.jsx';
import { getChangelogUnread } from '../api/index.js';

const NAV_ITEMS = [
  { to: '/shelf', icon: BookOpen, label: 'My Shelf' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
  { to: '/reclists', icon: List, label: 'Rec Lists' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showImport, setShowImport] = useState(false);
  const [changelogUnread, setChangelogUnread] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  // Check for unread changelog entries on mount
  useEffect(() => {
    getChangelogUnread()
      .then(({ data }) => setChangelogUnread(data.hasUnread))
      .catch(() => {});
  }, []);

  // When user navigates to /changelog, clear the dot
  useEffect(() => {
    if (location.pathname === '/changelog') {
      setChangelogUnread(false);
    }
  }, [location.pathname]);

  return (
    <div className="w-56 h-full bg-surface border-r border-border-subtle flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <Bookmark className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="text-txt-primary font-semibold text-lg tracking-tight">Archivd</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-txt-secondary hover:text-txt-primary hover:bg-elevated'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : ''}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* Changelog — with notification dot */}
        <NavLink
          to="/changelog"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-accent/15 text-accent'
                : 'text-txt-secondary hover:text-txt-primary hover:bg-elevated'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative flex-shrink-0">
                <Sparkles className={`w-4 h-4 ${isActive ? 'text-accent' : ''}`} />
                {changelogUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
                )}
              </div>
              What's New
            </>
          )}
        </NavLink>
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-border-subtle">
        {/* Notification bell + Import row */}
        <div className="flex items-center gap-1 px-2 mb-2">
          <NotificationBell />
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-elevated text-txt-secondary hover:text-txt-primary text-sm transition-colors flex-1"
            title="Import from AO3"
          >
            <Upload className="w-4 h-4 flex-shrink-0" />
            Import CSV
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-xs font-semibold uppercase">
              {user?.display_name?.[0] || user?.username?.[0] || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-txt-primary text-xs font-medium truncate">{user?.display_name || user?.username}</p>
            <p className="text-txt-muted text-xs truncate">@{user?.username}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-txt-muted hover:text-txt-secondary hover:bg-elevated transition-colors w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
