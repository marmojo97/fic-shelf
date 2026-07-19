import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Flame, BookOpen, Star, Zap, Calendar, TrendingUp,
  Target, Trophy, Gauge, CheckCircle2, BarChart2, Book, Info,
  Settings2, X, Eye, EyeOff, GripVertical, RotateCcw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { getStats } from '../api/index.js';

// ── Block registry — defines all draggable sections ──────────────────────────
// To add a new block: add an entry here + a case in renderBlock() below.
const BLOCK_REGISTRY = [
  { id: 'personality',     label: 'Reader Personality' },
  { id: 'hero',            label: 'Key Stats' },
  { id: 'words-hero',      label: 'Words Overview' },
  { id: 'fandom-breakdown',label: 'Fandoms & Fic Breakdown' },
  { id: 'dnf',             label: 'Did Not Finish' },
  { id: 'ships',           label: 'Ships' },
  { id: 'tags',            label: 'Tag Fingerprint' },
  { id: 'words-tracker',   label: 'Words Tracker' },
  { id: 'monthly-fics',    label: 'Monthly Fics' },
  { id: 'secondary-stats', label: 'Reading Stats Row' },
  { id: 'challenge',       label: 'Annual Challenge' },
  { id: 'rating-dist',     label: 'Rating Distribution' },
  { id: 'shelf-dist',      label: 'Reading Breakdown' },
];

const DEFAULT_LAYOUT = BLOCK_REGISTRY.map(b => ({ id: b.id, visible: true }));
const LAYOUT_KEY = 'archivd_stats_layout';

// ── Layout persistence (localStorage) ────────────────────────────────────────
// To upgrade to backend sync: load from user.statsLayout (via getMe) on mount,
// fall back to localStorage, and PUT /api/settings/stats-layout on save.
// Backend: ALTER TABLE users ADD COLUMN stats_layout TEXT DEFAULT NULL;
function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return null;
    // Merge saved layout with registry — adds any new blocks, removes deleted ones
    const merged = BLOCK_REGISTRY.map(reg => {
      const saved_item = saved.find(s => s.id === reg.id);
      return saved_item ? saved_item : { id: reg.id, visible: true };
    });
    return merged;
  } catch { return null; }
}

function saveLayout(layout) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch {}
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const JEWEL_COLORS = ['#990000','#6D28D9','#1D4ED8','#B05000','#276427','#0891B2','#B45309','#0F766E','#9D174D','#4F46E5'];
const AVG_NOVEL_WORDS = 80000;
const CHART_GRID = '#E5E1DB';
const CHART_TICK = '#888888';
const SHELF_COLORS = {
  'read':'#276427','history':'#4F46E5','reading':'#0891B2',
  'want-to-read':'#1D4ED8','maybe':'#B45309','re-reading':'#6D28D9',
  'dnf':'#DC2626','uncategorized':'#9CA3AF',
};
const SHELF_LABELS = {
  'read':'Read','history':'History','reading':'Reading',
  'want-to-read':'Want to Read','maybe':'Maybe','re-reading':'Re-reading',
  'dnf':'DNF','uncategorized':'Uncategorized',
};

// ── Utility ───────────────────────────────────────────────────────────────────
function formatWords(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-txt-muted text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color || '#990000' }}>
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-txt-muted hover:text-txt-secondary transition-colors"
        aria-label="More info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 w-60 bg-txt-primary text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-txt-primary" />
        </div>
      )}
    </div>
  );
}

// ── Customize panel ───────────────────────────────────────────────────────────
function CustomizePanel({ layout, setLayout, onClose }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  function toggleVisible(id) {
    setLayout(prev => {
      const next = prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b);
      saveLayout(next);
      return next;
    });
  }

  function handleDragStart(e, idx) {
    e.dataTransfer.effectAllowed = 'move';
    setDragIdx(idx);
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragIdx) setOverIdx(idx);
  }

  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setLayout(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      saveLayout(next);
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setOverIdx(null);
  }

  function resetToDefault() {
    const def = DEFAULT_LAYOUT;
    setLayout(def);
    saveLayout(def);
  }

  const visibleCount = layout.filter(b => b.visible).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-surface shadow-2xl flex flex-col border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-txt-primary text-sm">Customize Layout</h2>
            <p className="text-txt-muted text-xs mt-0.5">{visibleCount} of {layout.length} sections visible</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-elevated transition-colors text-txt-muted hover:text-txt-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hint */}
        <div className="px-4 py-2.5 bg-elevated border-b border-border flex-shrink-0">
          <p className="text-txt-muted text-xs flex items-center gap-1.5">
            <GripVertical className="w-3 h-3 flex-shrink-0" />
            Drag to reorder · click eye to show/hide
          </p>
        </div>

        {/* Sortable list */}
        <div className="flex-1 overflow-y-auto py-2">
          {layout.map((item, idx) => {
            const reg = BLOCK_REGISTRY.find(b => b.id === item.id);
            if (!reg) return null;
            const isDragging = dragIdx === idx;
            const isOver = overIdx === idx && dragIdx !== idx;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={[
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg select-none transition-all',
                  isDragging ? 'opacity-40 bg-elevated' : 'hover:bg-elevated cursor-grab active:cursor-grabbing',
                  isOver ? 'border-t-2 border-accent' : 'border-t-2 border-transparent',
                  !item.visible ? 'opacity-60' : '',
                ].join(' ')}
              >
                <GripVertical className="w-4 h-4 text-txt-muted flex-shrink-0" />
                <span className={`flex-1 text-sm ${item.visible ? 'text-txt-secondary' : 'text-txt-muted line-through'}`}>
                  {reg.label}
                </span>
                <button
                  onClick={() => toggleVisible(item.id)}
                  className={`p-1 rounded transition-colors ${
                    item.visible
                      ? 'text-txt-secondary hover:text-txt-primary'
                      : 'text-txt-muted hover:text-txt-secondary'
                  }`}
                  title={item.visible ? 'Hide section' : 'Show section'}
                >
                  {item.visible
                    ? <Eye className="w-3.5 h-3.5" />
                    : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 text-xs text-txt-muted hover:text-txt-secondary transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to default
          </button>
          <p className="text-txt-muted text-[10px] mt-2 leading-relaxed">
            Layout saved to this browser. Sign in on another device to get cloud sync in a future update.
          </p>
        </div>
      </div>
    </>
  );
}

// ── Main Stats page ───────────────────────────────────────────────────────────
export default function Stats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [wordView, setWordView] = useState('monthly');
  const [layout, setLayout] = useState(() => loadLayout() || DEFAULT_LAYOUT);
  const [showCustomize, setShowCustomize] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setStatsError(null);
    getStats(year)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(err => {
        setStatsError(err?.response?.data?.detail || err.message || 'Unknown error');
        setLoading(false);
      });
  }, [year]);

  const isVisible = useCallback((id) => {
    const item = layout.find(b => b.id === id);
    return item ? item.visible : true;
  }, [layout]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }
  if (!data) return (
    <div className="p-6">
      <p className="text-txt-muted">Could not load stats.</p>
      {statsError && (
        <p className="text-red-500 text-xs mt-2 font-mono bg-red-50 px-3 py-2 rounded-lg border border-red-200 max-w-lg">
          {statsError}
        </p>
      )}
    </div>
  );

  const {
    totals, yearStats, annualGoal, monthlyData, byFandom, byRating, byCompletion,
    streak, longestStreak, topShips, topTags, ratingDist,
    completionRate, avgWordCount, avgWordsByYear, longestFic, readingPaceWpd, ficsPerMonth,
    wrappedLabel, dnfStats, shelfDist,
  } = data;

  const yearLabel = year === 0 ? 'All Time' : String(year);
  const goalProgress = annualGoal > 0
    ? Math.min(100, Math.round((yearStats.fics_this_year / annualGoal) * 100))
    : 0;
  const totalWordsRead = totals.total_words_read || 0;
  const bookEquivalent = totalWordsRead > 0 ? (totalWordsRead / AVG_NOVEL_WORDS).toFixed(1) : '0';
  const wordsThisYear = yearStats.words_this_year || 0;
  const booksThisYear = wordsThisYear > 0 ? (wordsThisYear / AVG_NOVEL_WORDS).toFixed(1) : '0';

  const completionData = [
    { name: 'Complete',    value: byCompletion.find(c => c.status === 'complete')?.count    || 0, color: '#276427' },
    { name: 'In Progress', value: byCompletion.find(c => c.status === 'in-progress')?.count || 0, color: '#B07A00' },
    { name: 'Abandoned',   value: byCompletion.find(c => c.status === 'abandoned')?.count   || 0, color: '#6B7280' },
  ].filter(d => d.value > 0);

  const ratingChartData = [
    { name: 'G', value: byRating.find(r => r.rating === 'G')?.count || 0, color: '#276427' },
    { name: 'T', value: byRating.find(r => r.rating === 'T')?.count || 0, color: '#1D4ED8' },
    { name: 'M', value: byRating.find(r => r.rating === 'M')?.count || 0, color: '#B05000' },
    { name: 'E', value: byRating.find(r => r.rating === 'E')?.count || 0, color: '#CC0000' },
  ].filter(d => d.value > 0);

  const monthlyChartData = monthlyData.map((d, i) => ({
    month: MONTHS[i], monthNum: i + 1, fics: d.fics, words: d.words, avg_words: d.avg_words || 0,
  }));

  const yearlyWordData = avgWordsByYear
    ? [...avgWordsByYear].reverse().map(y => ({
        year: y.yr,
        words: Math.round(y.avg_words * y.fic_count),
        avg_words: Math.round(y.avg_words),
        fic_count: y.fic_count,
      }))
    : [];

  const dailyAvg = readingPaceWpd || 0;
  const dailyChartData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    words: Math.round(dailyAvg * (0.7 + Math.random() * 0.6)),
  }));

  const bestWordMonth = monthlyChartData.reduce(
    (best, m) => m.words > 0 && (!best || m.words > best.words) ? m : best, null
  );
  const bestFicMonth = monthlyChartData.reduce(
    (best, m) => m.fics > 0 && (!best || m.fics > best.fics) ? m : best, null
  );

  const wordCountTrend = monthlyChartData
    .filter(m => m.fics > 0)
    .map(m => ({ month: m.month, avg: m.avg_words || Math.round(m.words / m.fics) }));

  const shelfDistData = (shelfDist || [])
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(s => ({ name: s.shelf, value: s.count }));

  const availableYears = [0];
  for (let y = new Date().getFullYear(); y >= 2020; y--) availableYears.push(y);

  const DATE_INFO = 'Dates reflect when you marked fics as read. Re-import your AO3 CSV to correct historical dates.';

  // ── Block renderer — single source of truth for all block content ──────────
  function renderBlock(id) {
    switch (id) {

      case 'personality':
        if (!wrappedLabel) return null;
        return (
          <div key="personality" className="card p-4 flex items-center gap-4 border-accent/30 bg-accent/5">
            <div className="text-3xl">✨</div>
            <div>
              <p className="text-txt-muted text-xs uppercase tracking-wider">Your Reader Personality</p>
              <p className="text-accent font-bold text-lg">{wrappedLabel}</p>
            </div>
          </div>
        );

      case 'hero':
        return (
          <div key="hero" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fics Read */}
            <div className="card p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-elevated flex-shrink-0">
                <BookOpen className="w-5 h-5 text-txt-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Fics Read</p>
                <div className="flex items-end gap-3 mt-0.5 flex-wrap">
                  <div>
                    <p className="text-2xl font-bold text-txt-primary">{(totals.total_read || 0).toLocaleString()}</p>
                    <p className="text-txt-muted text-xs">all time</p>
                  </div>
                  {year !== 0 && (
                    <div className="border-l border-border-subtle pl-3">
                      <p className="text-xl font-bold text-txt-primary">{yearStats.fics_this_year}</p>
                      <p className="text-txt-muted text-xs">in {year}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Words Read */}
            <div className="card p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-elevated flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-txt-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Words Read</p>
                <p className="text-2xl font-bold text-txt-primary mt-0.5">{formatWords(totalWordsRead)}</p>
                <p className="text-txt-muted text-xs">all time</p>
              </div>
            </div>
            {/* Avg Rating */}
            <div className="card p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-elevated flex-shrink-0">
                <Star className="w-5 h-5 text-txt-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Avg Rating</p>
                {totals.avg_rating ? (
                  <>
                    <p className="text-2xl font-bold text-txt-primary mt-0.5">{Number(totals.avg_rating).toFixed(1)}</p>
                    <p className="text-txt-muted text-xs">out of 5 · all time</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-txt-primary mt-0.5">—</p>
                    <button onClick={() => navigate('/shelf?shelf=read')} className="text-accent text-xs hover:underline text-left mt-0.5">
                      Rate your finished fics
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Streak */}
            <div className="card p-5 flex items-start gap-4 border-accent/40 bg-accent/5">
              <div className="p-2.5 rounded-xl bg-accent/15 flex-shrink-0">
                <Flame className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Streak</p>
                <p className="text-2xl font-bold text-accent mt-0.5">{streak} day{streak !== 1 ? 's' : ''}</p>
                <p className="text-txt-muted text-xs">
                  current{longestStreak > 0 && <> · best {longestStreak}d{streak > 0 && streak === longestStreak ? ' 🏆' : ''}</>}
                </p>
              </div>
            </div>
          </div>
        );

      case 'words-hero':
        return (
          <div key="words-hero" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 col-span-1 sm:col-span-2 flex items-center gap-5 border-accent/20 bg-gradient-to-br from-white to-accent/5">
              <div className="p-3 bg-accent/10 rounded-2xl flex-shrink-0">
                <Book className="w-8 h-8 text-accent" />
              </div>
              <div>
                <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Total Words Read (all time)</p>
                <p className="text-txt-primary font-bold text-3xl mt-0.5">{totalWordsRead.toLocaleString()}</p>
                <p className="text-txt-muted text-sm mt-1">
                  Roughly <span className="font-bold text-accent">{bookEquivalent} novels</span> at {AVG_NOVEL_WORDS.toLocaleString()} words each.
                </p>
              </div>
            </div>
            <div className="card p-5 flex flex-col gap-3">
              <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">{year === 0 ? 'All Time' : `This Year (${year})`}</p>
              <div>
                <p className="text-txt-primary font-bold text-2xl">{wordsThisYear.toLocaleString()}</p>
                <p className="text-txt-muted text-xs">words</p>
              </div>
              <div className="border-t border-border-subtle pt-3">
                <p className="text-txt-primary font-bold text-xl">{booksThisYear}</p>
                <p className="text-txt-muted text-xs">book equivalents</p>
              </div>
            </div>
          </div>
        );

      case 'fandom-breakdown':
        return (
          <div key="fandom-breakdown" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top fandoms */}
            <div className="card p-5">
              <h2 className="text-txt-primary font-semibold mb-1">Top Fandoms</h2>
              <p className="text-txt-muted text-xs mb-4">based on finished fics{year !== 0 ? ` · ${year}` : ' · all time'}</p>
              {byFandom.length === 0 ? (
                <p className="text-txt-muted text-sm">No fandom data yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {byFandom.slice(0, 8).map((f, i) => {
                    const max = byFandom[0].count;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-txt-secondary text-sm truncate w-40 flex-shrink-0 cursor-default" title={f.fandom}>{f.fandom}</span>
                        <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden border border-border-subtle">
                          <div className="h-full rounded-full" style={{ width: `${(f.count / max) * 100}%`, backgroundColor: JEWEL_COLORS[i % JEWEL_COLORS.length] }} />
                        </div>
                        <span className="text-txt-muted text-xs w-6 text-right">{f.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Fic breakdown donuts */}
            <div className="card p-5">
              <h2 className="text-txt-primary font-semibold mb-1">Fic Breakdown</h2>
              <p className="text-txt-muted text-xs mb-4">across your shelved fics · all time</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Completion donut */}
                <div>
                  <p className="text-txt-muted text-xs uppercase tracking-wider mb-3">Completion</p>
                  {completionData.length > 0 ? (
                    <div className="flex justify-center">
                      <PieChart width={120} height={120}>
                        <Pie data={completionData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                          {completionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </div>
                  ) : <p className="text-txt-muted text-sm">No data</p>}
                  <div className="space-y-1 mt-2">
                    {completionData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-txt-secondary">{d.name}</span>
                        <span className="text-txt-muted ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Rating donut */}
                <div>
                  <p className="text-txt-muted text-xs uppercase tracking-wider mb-3">Content Rating</p>
                  {ratingChartData.length > 0 ? (
                    <div className="flex justify-center">
                      <PieChart width={120} height={120}>
                        <Pie data={ratingChartData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                          {ratingChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </div>
                  ) : <p className="text-txt-muted text-sm">No data</p>}
                  <div className="space-y-1 mt-2">
                    {ratingChartData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-txt-secondary">{d.name}</span>
                        <span className="text-txt-muted ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'dnf':
        if ((dnfStats?.count ?? 0) === 0) return null;
        return (
          <div key="dnf" className="card p-5">
            {dnfStats.count <= 1 ? (
              <p className="text-txt-secondary text-sm">You rarely give up on a fic — {dnfStats.count} DNF all time 🎖️</p>
            ) : (
              <>
                <h2 className="text-txt-primary font-semibold mb-3">Did Not Finish</h2>
                <div className="flex items-start gap-6 flex-wrap">
                  <div>
                    <p className="text-3xl font-bold text-txt-primary">{dnfStats.count}</p>
                    <p className="text-txt-muted text-xs mt-0.5">all time</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-600">{dnfStats.rate}%</p>
                    <p className="text-txt-muted text-xs mt-0.5">DNF rate · all time</p>
                  </div>
                  {dnfStats.topFandoms?.length > 0 && (
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-txt-muted text-xs mb-2">Most DNF'd fandoms</p>
                      {dnfStats.topFandoms.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1.5">
                          <span className="text-txt-secondary text-sm truncate flex-1" title={f.fandom}>{f.fandom}</span>
                          <span className="text-txt-muted text-xs flex-shrink-0">×{f.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 'ships':
        if (!topShips.length) return null;
        return (
          <div key="ships" className="card p-5">
            <h2 className="text-txt-primary font-semibold mb-1">💕 Ships You Can't Quit</h2>
            <p className="text-txt-muted text-xs mb-3">based on your finished fics · all time</p>
            <div className="flex flex-wrap gap-2">
              {topShips.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated border border-border-subtle text-sm" style={{ color: JEWEL_COLORS[i % JEWEL_COLORS.length] }}>
                  {s.ship}<span className="text-txt-muted text-xs">×{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'tags':
        if (!topTags.length) return null;
        return (
          <div key="tags" className="card p-5">
            <h2 className="text-txt-primary font-semibold mb-1">✨ Your Tag Fingerprint</h2>
            <p className="text-txt-muted text-xs mb-3">based on your finished fics · all time</p>
            <div className="flex flex-wrap gap-2">
              {topTags.map((t, i) => {
                const max = topTags[0].count;
                const size = 11 + Math.round((t.count / max) * 8);
                return (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-elevated border border-border-subtle text-txt-secondary hover:text-txt-primary transition-colors cursor-default" style={{ fontSize: `${size}px` }}>
                    {t.tag}
                  </span>
                );
              })}
            </div>
          </div>
        );

      case 'words-tracker':
        return (
          <div key="words-tracker" className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-txt-primary font-semibold">Words Read Tracker</h2>
                <InfoTooltip text={DATE_INFO} />
              </div>
              <div className="flex items-center bg-elevated rounded-lg p-1 gap-0.5 border border-border-subtle">
                {[{ key: 'daily', label: 'Daily' }, { key: 'monthly', label: 'Monthly' }, { key: 'yearly', label: 'Yearly' }].map(v => (
                  <button key={v.key} onClick={() => setWordView(v.key)} className={`text-xs px-3 py-1.5 rounded transition-colors ${wordView === v.key ? 'bg-white text-txt-primary font-medium shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            {wordView === 'monthly' && (
              <>
                <p className="text-txt-muted text-xs mb-3">Words read per month · {yearLabel}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatWords(v)} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,0,0,0.04)' }} />
                    <Bar dataKey="words" name="Words" fill="#990000" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {monthlyChartData.filter(m => m.words > 0).map((m, i) => (
                    <div key={i} className={`bg-elevated rounded-lg px-2 py-2 text-center ${bestWordMonth?.month === m.month ? 'ring-1 ring-accent/40' : ''}`}>
                      <p className="text-txt-muted text-xs">{m.month}</p>
                      <p className="text-txt-primary font-semibold text-xs mt-0.5">{formatWords(m.words)}</p>
                      <p className="text-txt-muted text-[10px]">{m.fics} fic{m.fics !== 1 ? 's' : ''}</p>
                    </div>
                  ))}
                </div>
                {bestWordMonth?.words > 0 && (
                  <div className="mt-3 bg-accent/5 border border-accent/20 rounded-xl p-3">
                    <p className="text-txt-secondary text-sm">
                      📖 Best month: <span className="font-semibold text-txt-primary">{bestWordMonth.month} {yearLabel !== 'All Time' ? yearLabel : ''}</span> — {formatWords(bestWordMonth.words)} words across {bestWordMonth.fics} fic{bestWordMonth.fics !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </>
            )}
            {wordView === 'yearly' && (
              <>
                <p className="text-txt-muted text-xs mb-3">Total words read per year · all time</p>
                {yearlyWordData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={yearlyWordData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatWords(v)} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,0,0,0.04)' }} />
                        <Bar dataKey="words" name="Total words" fill="#990000" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {yearlyWordData.map((y, i) => (
                        <div key={i} className="bg-elevated rounded-lg px-3 py-2 text-center border border-border-subtle">
                          <p className="text-txt-muted text-xs">{y.year}</p>
                          <p className="text-txt-primary font-bold text-sm">{formatWords(y.words)}</p>
                          <p className="text-txt-muted text-xs">{y.fic_count} fics</p>
                          <p className="text-txt-muted text-[10px]">≈ {(y.words / AVG_NOVEL_WORDS).toFixed(1)} books</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-txt-muted text-sm">Not enough data yet.</p>}
              </>
            )}
            {wordView === 'daily' && (
              <>
                <p className="text-txt-muted text-xs mb-3">Average {formatWords(dailyAvg)} words/day — estimated daily reading activity · all time</p>
                {dailyAvg > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: CHART_TICK, fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatWords(v)} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,0,0,0.04)' }} />
                      <Bar dataKey="words" name="Words" fill="#990000" radius={[3, 3, 0, 0]} opacity={0.75} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-txt-muted text-sm">Add some finished fics to calculate your daily pace.</p>}
                {dailyAvg > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Daily avg · all time', value: formatWords(dailyAvg), sub: 'words' },
                      { label: 'Monthly est.', value: formatWords(dailyAvg * 30), sub: 'words' },
                      { label: 'Yearly est.', value: formatWords(dailyAvg * 365), sub: `≈ ${(dailyAvg * 365 / AVG_NOVEL_WORDS).toFixed(1)} books` },
                    ].map((s, i) => (
                      <div key={i} className="bg-elevated rounded-xl px-3 py-3 border border-border-subtle">
                        <p className="text-txt-muted text-xs">{s.label}</p>
                        <p className="text-txt-primary font-bold text-lg">{s.value}</p>
                        <p className="text-txt-muted text-xs">{s.sub}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'monthly-fics':
        return (
          <div key="monthly-fics" className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-txt-primary font-semibold">Fics Read Monthly ({yearLabel})</h2>
              <InfoTooltip text={DATE_INFO} />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,0,0,0.04)' }} />
                <Bar dataKey="fics" name="Fics" fill="#6D28D9" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {bestFicMonth?.fics > 0 && (
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
                <p className="text-purple-900 text-sm">
                  📚 Most active month: <span className="font-semibold">{bestFicMonth.month} {yearLabel !== 'All Time' ? yearLabel : ''}</span> — {bestFicMonth.fics} fic{bestFicMonth.fics !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        );

      case 'secondary-stats':
        return (
          <div key="secondary-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {completionRate !== null && (
              <div className="card p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-elevated flex-shrink-0"><CheckCircle2 className="w-5 h-5 text-txt-secondary" /></div>
                <div className="min-w-0">
                  <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Completion Rate</p>
                  <p className="text-2xl font-bold text-txt-primary mt-0.5">{completionRate}%</p>
                  <p className="text-txt-muted text-xs">of started fics · all time</p>
                </div>
              </div>
            )}
            {avgWordCount > 0 && (
              <div className="card p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-elevated flex-shrink-0"><BarChart2 className="w-5 h-5 text-txt-secondary" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Avg Word Count</p>
                  <p className="text-2xl font-bold text-txt-primary mt-0.5">{formatWords(avgWordCount)}</p>
                  <p className="text-txt-muted text-xs">per finished fic · all time</p>
                  {wordCountTrend.length > 2 && (
                    <div className="mt-2">
                      <p className="text-txt-muted text-[10px] mb-1">Trend this year ↗</p>
                      <ResponsiveContainer width="100%" height={36}>
                        <LineChart data={wordCountTrend} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                          <Line type="monotone" dataKey="avg" stroke="#990000" strokeWidth={1.5} dot={false} />
                          <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                            <div className="bg-surface border border-border rounded px-2 py-1 shadow text-xs">
                              <p className="text-txt-muted">{label}</p>
                              <p className="font-medium text-txt-primary">{formatWords(payload[0].value)} avg</p>
                            </div>
                          ) : null} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(readingPaceWpd !== null || ficsPerMonth !== null) && (
              <div className="card p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-elevated flex-shrink-0"><Gauge className="w-5 h-5 text-txt-secondary" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Reading Pace</p>
                  <div className="flex items-end gap-3 mt-0.5 flex-wrap">
                    {ficsPerMonth !== null && (
                      <div>
                        <p className="text-2xl font-bold text-txt-primary">{ficsPerMonth}</p>
                        <p className="text-txt-muted text-xs">fics/month avg</p>
                      </div>
                    )}
                    {readingPaceWpd !== null && ficsPerMonth !== null && (
                      <div className="border-l border-border-subtle pl-3">
                        <p className="text-xl font-bold text-txt-primary">{formatWords(readingPaceWpd)}</p>
                        <p className="text-txt-muted text-xs">words/day avg</p>
                      </div>
                    )}
                    {readingPaceWpd !== null && ficsPerMonth === null && (
                      <div>
                        <p className="text-2xl font-bold text-txt-primary">{formatWords(readingPaceWpd)}</p>
                        <p className="text-txt-muted text-xs">words/day avg</p>
                      </div>
                    )}
                  </div>
                  <p className="text-txt-muted text-[10px] mt-0.5">avg reading pace · all time</p>
                </div>
              </div>
            )}
            {longestFic && (
              <div className="card p-5 flex items-start gap-4 col-span-2 lg:col-span-1">
                <div className="p-2.5 rounded-xl bg-elevated flex-shrink-0"><Trophy className="w-5 h-5 text-yellow-600" /></div>
                <div className="min-w-0">
                  <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Longest Fic Read</p>
                  <p className="text-txt-primary font-bold text-sm leading-tight mt-0.5 truncate" title={longestFic.title}>{longestFic.title}</p>
                  <p className="text-txt-muted text-xs">{formatWords(longestFic.word_count)} words · all time</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'challenge':
        return (
          <div key="challenge" className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                <h2 className="text-txt-primary font-semibold">{year === 0 ? 'Reading Challenge' : `${year} Reading Challenge`}</h2>
              </div>
              <span className="text-txt-muted text-sm">
                <span className="text-txt-primary font-semibold text-lg">{yearStats.fics_this_year}</span> / {annualGoal} fics
              </span>
            </div>
            <div className="h-3 bg-elevated rounded-full overflow-hidden mb-1.5 border border-border-subtle">
              <div className="h-full bg-gradient-to-r from-accent to-accent-dim rounded-full transition-all duration-500" style={{ width: `${goalProgress}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-txt-muted text-xs">{goalProgress}% complete</span>
              {goalProgress >= 100
                ? <span className="text-accent text-xs font-medium">🎉 Challenge complete!</span>
                : <span className="text-txt-muted text-xs">{annualGoal - yearStats.fics_this_year} to go</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
                <p className="text-txt-muted text-xs">Fics {year === 0 ? 'all time' : `in ${year}`}</p>
                <p className="text-txt-primary font-bold text-lg">{yearStats.fics_this_year}</p>
              </div>
              <div className="bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
                <p className="text-txt-muted text-xs">Words {year === 0 ? 'all time' : `in ${year}`}</p>
                <p className="text-txt-primary font-bold text-lg">{formatWords(wordsThisYear)}</p>
              </div>
            </div>
          </div>
        );

      case 'rating-dist':
        if (!ratingDist.length) return null;
        return (
          <div key="rating-dist" className="card p-5">
            <h2 className="text-txt-primary font-semibold mb-4">Your Rating Distribution</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={ratingDist.map(r => ({ rating: `★ ${r.rating}`, count: r.count }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="rating" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,0,0,0.04)' }} />
                <Bar dataKey="count" name="Fics" fill="#B45309" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'shelf-dist':
        if (!shelfDistData.length) return null;
        return (
          <div key="shelf-dist" className="card p-5">
            <h2 className="text-txt-primary font-semibold mb-4">Your Reading Breakdown</h2>
            <div className="flex items-start gap-6 flex-wrap">
              <PieChart width={180} height={180}>
                <Pie data={shelfDistData} cx={85} cy={85} innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {shelfDistData.map((entry, i) => <Cell key={i} fill={SHELF_COLORS[entry.name] || '#9CA3AF'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
              <div className="space-y-2 flex-1 min-w-[160px]">
                {shelfDistData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SHELF_COLORS[d.name] || '#9CA3AF' }} />
                    <span className="text-txt-secondary flex-1">{SHELF_LABELS[d.name] || d.name}</span>
                    <span className="text-txt-muted font-medium">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // Ordered, filtered block list based on current layout
  const orderedVisibleBlocks = layout
    .filter(item => item.visible)
    .map(item => item.id);

  return (
    <div className="px-6 py-6 max-w-6xl">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-txt-primary font-bold text-xl">Reading Stats</h1>
          <p className="text-txt-muted text-sm mt-0.5">A love letter to your reading life</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-field text-sm w-auto py-1.5"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            <option value={0}>All Time</option>
            {availableYears.slice(1).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setShowCustomize(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showCustomize
                ? 'bg-accent text-white border-accent'
                : 'border-border-subtle text-txt-secondary hover:text-txt-primary hover:bg-elevated'
            }`}
            title="Customize layout"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Customize</span>
          </button>
        </div>
      </div>

      {/* ── Blocks rendered in user-defined order ── */}
      <div className="space-y-6">
        {orderedVisibleBlocks.map(id => renderBlock(id))}
      </div>

      <div className="h-4" />

      {/* ── Customize panel ── */}
      {showCustomize && (
        <CustomizePanel
          layout={layout}
          setLayout={setLayout}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </div>
  );
}
