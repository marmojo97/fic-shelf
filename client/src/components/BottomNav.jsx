import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Compass, BarChart2, List, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/shelf', icon: BookOpen, label: 'Shelf' },
  { to: '/discover', icon: Compass, label: 'Discover' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
  { to: '/reclists', icon: List, label: 'Recs' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <div className="bg-surface border-t border-border-subtle flex items-center justify-around px-2 py-2 safe-area-pb">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
              isActive ? 'text-accent' : 'text-txt-muted hover:text-txt-secondary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : ''}`} />
              <span className="text-xs font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
