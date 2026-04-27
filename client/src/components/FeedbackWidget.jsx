import React, { useState, useRef } from 'react';
import { MessageSquare, X, Bug, Lightbulb, MessageCircle, Camera, Send, Loader2 } from 'lucide-react';
import { submitFeedback } from '../api/index.js';

const TYPES = [
  { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  { id: 'general', label: 'General Feedback', icon: MessageCircle, color: 'text-accent', bg: 'bg-accent/10 border-accent/30' },
];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(null);
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setType(null);
    setMessage('');
    setScreenshot(null);
    setError('');
    setSubmitted(false);
  }

  function handleClose() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  async function captureScreenshot() {
    setCapturingScreenshot(true);
    try {
      // Dynamically import html2canvas to avoid blocking initial load
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.id === 'feedback-widget-root',
      });
      setScreenshot(canvas.toDataURL('image/jpeg', 0.7));
    } catch (err) {
      console.error('[Screenshot]', err);
      setError('Screenshot failed. You can still submit without one.');
    } finally {
      setCapturingScreenshot(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!type || !message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await submitFeedback({
        type,
        message: message.trim(),
        pageUrl: window.location.pathname,
        screenshotData: screenshot,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="feedback-widget-root" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-full shadow-lg transition-all text-sm font-medium"
          aria-label="Send feedback"
        >
          <MessageSquare className="w-4 h-4" />
          Feedback
        </button>
      )}

      {/* Modal panel */}
      {open && (
        <div className="w-80 bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <span className="text-txt-primary text-sm font-semibold">Send Feedback</span>
            </div>
            <button onClick={handleClose} className="text-txt-muted hover:text-txt-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Send className="w-5 h-5 text-accent" />
                </div>
                <p className="text-txt-primary text-sm font-medium">Thanks for the feedback!</p>
                <p className="text-txt-muted text-xs">We read every submission and use it to make Archivd better.</p>
                <button onClick={handleClose} className="btn-primary text-xs py-1.5 px-4 mt-1">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Type picker */}
                {!type ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-txt-secondary text-xs font-medium">What kind of feedback?</p>
                    {TYPES.map(({ id, label, icon: Icon, color, bg }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setType(id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors text-left ${bg}`}
                      >
                        <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                        <span className="text-txt-primary">{label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Selected type badge */}
                    <div className="flex items-center gap-2">
                      {(() => {
                        const t = TYPES.find(t => t.id === type);
                        const Icon = t.icon;
                        return (
                          <button
                            type="button"
                            onClick={() => setType(null)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${t.bg}`}
                          >
                            <Icon className={`w-3 h-3 ${t.color}`} />
                            <span className="text-txt-primary">{t.label}</span>
                            <X className="w-3 h-3 text-txt-muted ml-0.5" />
                          </button>
                        );
                      })()}
                      <span className="text-txt-muted text-xs">on {window.location.pathname}</span>
                    </div>

                    {/* Message */}
                    <textarea
                      required
                      autoFocus
                      rows={4}
                      className="input-field text-sm resize-none"
                      placeholder={
                        type === 'bug' ? 'What happened? What did you expect?' :
                        type === 'feature' ? 'Describe the feature you\'d love to see...' :
                        'Share your thoughts...'
                      }
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />

                    {/* Screenshot */}
                    <div className="flex items-center gap-2">
                      {screenshot ? (
                        <div className="relative flex-1">
                          <img src={screenshot} alt="Screenshot" className="w-full h-16 object-cover rounded-lg border border-border-subtle" />
                          <button
                            type="button"
                            onClick={() => setScreenshot(null)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={captureScreenshot}
                          disabled={capturingScreenshot}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs text-txt-muted hover:text-txt-secondary hover:border-border transition-colors"
                        >
                          {capturingScreenshot
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Camera className="w-3 h-3" />
                          }
                          {capturingScreenshot ? 'Capturing...' : 'Add screenshot'}
                        </button>
                      )}
                    </div>

                    {error && (
                      <p className="text-red-400 text-xs bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !message.trim()}
                      className="btn-primary w-full justify-center text-sm py-2"
                    >
                      {submitting
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                        : <><Send className="w-3.5 h-3.5" /> Send Feedback</>
                      }
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
