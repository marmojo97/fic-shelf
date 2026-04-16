/**
 * ShareTarget.jsx
 * Handles URLs shared to Archivd via the PWA Web Share Target API.
 * When a user taps "Share" on an AO3/FFN page in mobile browser and picks Archivd,
 * they land here with ?shared_url=... in the query string.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink, BookOpen } from 'lucide-react';
import { fetchAo3 } from '../api/index.js';
import AddFicModal from '../components/AddFicModal.jsx';

export default function ShareTarget() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sharedUrl = searchParams.get('shared_url') || searchParams.get('url') || '';
  const sharedTitle = searchParams.get('shared_title') || searchParams.get('title') || '';

  const [status, setStatus] = useState('loading'); // loading | ready | error | no-url
  const [prefill, setPrefill] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!sharedUrl) {
      setStatus('no-url');
      return;
    }

    const isAo3 = sharedUrl.includes('archiveofourown.org/works/');

    if (isAo3) {
      setStatus('fetching');
      fetchAo3(sharedUrl)
        .then(({ data }) => {
          setPrefill(data);
          setStatus('ready');
          setShowModal(true);
        })
        .catch(() => {
          // Fall back to just showing the URL
          setPrefill({ title: sharedTitle || sharedUrl, sourceUrl: sharedUrl });
          setStatus('ready');
          setShowModal(true);
        });
    } else {
      // Non-AO3 — open modal with just the URL prefilled
      setPrefill({ title: sharedTitle || '', sourceUrl: sharedUrl });
      setStatus('ready');
      setShowModal(true);
    }
  }, [sharedUrl]);

  const handleSaved = () => {
    navigate('/shelf');
  };

  const handleClose = () => {
    navigate('/shelf');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base px-6 text-center">
      {status === 'loading' || status === 'fetching' ? (
        <div className="space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-txt-secondary text-sm">
            {status === 'fetching' ? 'Fetching fic details from AO3…' : 'Loading…'}
          </p>
        </div>
      ) : status === 'no-url' ? (
        <div className="space-y-4">
          <BookOpen className="w-12 h-12 text-txt-muted mx-auto opacity-40" />
          <div>
            <h2 className="text-txt-primary font-semibold">Nothing to add</h2>
            <p className="text-txt-muted text-sm mt-1">Share a fic URL to add it to your shelf.</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/shelf')}>Back to shelf</button>
        </div>
      ) : status === 'error' ? (
        <div className="space-y-4">
          <p className="text-txt-primary font-semibold">Something went wrong</p>
          <button className="btn-primary" onClick={() => navigate('/shelf')}>Back to shelf</button>
        </div>
      ) : null}

      {showModal && prefill && (
        <AddFicModal
          initialData={prefill}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
