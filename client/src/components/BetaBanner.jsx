import React, { useState, useEffect } from 'react';
import { X, FlaskConical } from 'lucide-react';
import { getBetaBanner, dismissBetaBanner } from '../api/index.js';

export default function BetaBanner() {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getBetaBanner()
      .then(({ data }) => {
        // Show if globally enabled AND user hasn't dismissed
        setVisible(data.enabled && !data.dismissed);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleDismiss() {
    setVisible(false);
    dismissBetaBanner().catch(() => {});
  }

  if (!loaded || !visible) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-accent/10 border-b border-accent/20 text-sm">
      <FlaskConical className="w-4 h-4 text-accent flex-shrink-0" />
      <p className="text-txt-secondary flex-1">
        <span className="text-accent font-medium">You're using an early beta</span>
        {' '}— bugs are expected.{' '}
        <span className="text-txt-muted">Share feedback using the button below.</span>
      </p>
      <button
        onClick={handleDismiss}
        className="text-txt-muted hover:text-txt-primary transition-colors flex-shrink-0"
        aria-label="Dismiss beta banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
