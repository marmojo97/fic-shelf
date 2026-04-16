import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import BottomNav from './BottomNav.jsx';
import BetaBanner from './BetaBanner.jsx';
import FeedbackWidget from './FeedbackWidget.jsx';
import OnboardingModal from './OnboardingModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, refreshUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding the first time a user visits after creating their account
  useEffect(() => {
    if (user && user.onboarding_done === 0) {
      // Small delay so the page renders first
      const t = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(t);
    }
  }, [user?.id, user?.onboarding_done]);

  function handleOnboardingDone() {
    setShowOnboarding(false);
    refreshUser().catch(() => {});
  }

  return (
    <div className="flex flex-col h-screen bg-base overflow-hidden">
      {/* Beta banner spans full width at the top */}
      <BetaBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-shrink-0">
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <BottomNav />
        </div>
      </div>

      {/* Persistent feedback widget (bottom-right) */}
      <FeedbackWidget />

      {/* First-time onboarding */}
      {showOnboarding && (
        <OnboardingModal onDone={handleOnboardingDone} />
      )}
    </div>
  );
}
