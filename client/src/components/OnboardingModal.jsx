import React, { useState } from 'react';
import { BookOpen, Upload, Puzzle, ChevronRight, X, ArrowRight } from 'lucide-react';
import { markOnboardingDone } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const STEPS = [
  {
    icon: BookOpen,
    title: 'Welcome to Archivd! 📚',
    description: 'Your personal fanfiction shelf — track what you\'ve read, what you\'re reading, and what you want to read next. Rate fics, create rec lists, and share your taste with friends.',
    action: null,
  },
  {
    icon: Upload,
    title: 'Import your AO3 history',
    description: 'Import your AO3 reading history using the Tampermonkey userscript method — it takes about 5 minutes to set up and works directly from your browser.',
    steps: [
      'Install the Tampermonkey extension from tampermonkey.net',
      'In Chrome: go to chrome://extensions → enable Developer Mode',
      'In Tampermonkey: go to Settings → enable "Allow access to file URLs" and set Config Mode to "Advanced"',
      'Create a new script in Tampermonkey and paste in the AO3 History export script',
      'Go to your AO3 History page — a "Download History" button will appear',
      'Click it to download your history as a CSV, then import it here',
    ],
    action: {
      label: 'Get the AO3 History export script',
      href: 'https://greasyfork.org/en/scripts/423714-ao3-reading-history-exporter',
    },
    hint: 'You can always import later — use the Import CSV button in the sidebar at any time.',
  },
  {
    icon: Puzzle,
    title: 'Get the browser extension',
    description: 'Install the Archivd browser extension to add fics to your shelf directly from AO3 — no copy-pasting URLs needed.',
    action: {
      label: 'Download extension',
      href: '#',  // Update with real link once published
    },
    hint: 'Available for Chrome and Firefox. You can always install it later from your Profile page.',
  },
];

export default function OnboardingModal({ onDone }) {
  const [step, setStep] = useState(0);
  const { refreshUser } = useAuth();

  async function finish() {
    await markOnboardingDone().catch(() => {});
    await refreshUser().catch(() => {});
    onDone?.();
  }

  function skip() { finish(); }

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Step indicator */}
        <div className="flex gap-1.5 px-6 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-elevated'}`}
            />
          ))}
        </div>

        <div className="px-6 py-6 flex flex-col gap-5">
          {/* Icon */}
          <div className="w-12 h-12 bg-accent/15 rounded-2xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-accent" />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h2 className="text-txt-primary text-xl font-bold">{current.title}</h2>
            <p className="text-txt-secondary text-sm leading-relaxed">{current.description}</p>
            {current.steps && (
              <ol className="mt-2 space-y-1.5">
                {current.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-txt-secondary">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            )}
            {current.hint && (
              <p className="text-txt-muted text-xs leading-relaxed bg-elevated rounded-lg px-3 py-2 mt-2">
                {current.hint}
              </p>
            )}
          </div>

          {/* Action link */}
          {current.action && (
            <a
              href={current.action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-accent text-sm font-medium hover:underline"
            >
              {current.action.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5">
          <button
            onClick={skip}
            className="text-txt-muted text-sm hover:text-txt-secondary transition-colors"
          >
            {isLast ? 'Done' : 'Skip all'}
          </button>

          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                onClick={skip}
                className="text-txt-muted text-sm hover:text-txt-secondary transition-colors px-3 py-1.5"
              >
                Skip
              </button>
            )}
            <button
              onClick={() => isLast ? finish() : setStep(s => s + 1)}
              className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5"
            >
              {isLast ? 'Get started' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
