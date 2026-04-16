import React, { useState, useEffect } from 'react';
import {
  Loader2, Flame, BookOpen, Star, Zap, Calendar, TrendingUp,
  Target, Trophy, Gauge, CheckCircle2, BarChart2, Book,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { getStats } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const JEWEL_COLORS = ['#990000','#6D28D9','#1D4ED8','#B05000','#276427','#0891B2','#B45309','#0F766E','#9D174D','#4F46E5'];
const AVG_NOVEL_WORDS = 80000; // standard "average novel" benchmark
const CHART_GRID = '#E5E1DB';
const CHART_TICK = '#888888';

function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className={`card p-5 flex items-start gap-4 ${accent ? 'border-accent/40 bg-accent/5' : ''}`}>
      <div className={`p-2.5 rounded-xl ${accent ? 'bg-accent/15' : 'bg-elevated'}`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-accent' : 'text-txt-secondary'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${accent ? 'text-accent' : 'text-txt-primary'}`}>{value}</p>
        {sub && <p className="text-txt-muted text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (\!active || \!payload?.length) return null;
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

function formatWords(n) {
  if (\!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export default function Stats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [wordView, setWordView] = useState('monthly'); // 'monthly' | 'yearly' | 'daily'
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    getStats(year).then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }
  if (\!data) return <div className="p-6 text-txt-muted">Could not load stats.</div>;

  const {
    totals, yearStats, annualGoal, monthlyData, byFandom, byRating, byCompletion,
    streak, topShips, topTags, ratingDist,
    completionRate, avgWordCount, avgWordsByYear, longestFic, readingPaceWpd, wrappedLabel,
  } = data;

  const goalProgress = annualGoal > 0
    ? Math.min(100, Math.round((yearStats.fics_this_year / annualGoal) * 100))
    : 0;

  const totalWordsRead   = totals.total_words_read || 0;
  const bookEquivalent   = totalWordsRead > 0 ? (totalWordsRead / AVG_NOVEL_WORDS).toFixed(1) : '0';
  const wordsThisYear    = yearStats.words_this_year || 0;
  const booksThisYear    = wordsThisYear > 0 ? (wordsThisYear / AVG_NOVEL_WORDS).toFixed(1) : '0';

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
    month: MONTHS[i],
    fics:  d.fics,
    words: d.words,
  }));

  const yearlyWordData = avgWordsByYear
    ? [...avgWordsByYear].reverse().map(y => ({
        year:       y.yr,
        words:      Math.round(y.avg_words * y.fic_count),
        avg_words:  Math.round(y.avg_words),
        fic_count:  y.fic_count,
      }))
    : [];

  // Daily estimate: pace × 30 days
  const dailyAvg = readingPaceWpd || 0;
  const dailyChartData = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`,
    words: Math.round(dailyAvg * (0.7 + Math.random() * 0.6)), // simulated daily variation around avg
  }));

  const availableYears = [];
  for (let y = new Date().getFullYear(); y >= 2020; y--) availableYears.push(y);

  return (
    <div className="px-6 py-6 space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-txt-primary font-bold text-xl">Reading Stats</h1>
          <p className="text-txt-muted text-sm mt-0.5">A love letter to your reading life</p>
        </div>
        <select className="input-field text-sm w-auto py-1.5" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Reader personality */}
      {wrappedLabel && (
        <div className="card p-4 flex items-center gap-4 border-accent/30 bg-accent/5">
          <div className="text-3xl">✨</div>
          <div>
            <p className="text-txt-muted text-xs uppercase tracking-wider">Your Reader Personality</p>
            <p className="text-accent font-bold text-lg">{wrappedLabel}</p>
          </div>
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}   label="Total Read"   value={totals.total_read?.toLocaleString() || '0'} sub="all time" />
        <StatCard icon={TrendingUp} label="Words Read"   value={formatWords(totalWordsRead)}                sub="in finished fics" />
        <StatCard icon={Star}       label="Avg Rating"   value={totals.avg_rating ? Number(totals.avg_rating).toFixed(1) : '—'} sub="out of 5" />
        <StatCard icon={Flame}      label="Streak"       value={`${streak} day${streak \!== 1 ? 's' : ''}`} sub="current streak" accent />
      </div>

      {/* Words read + book equivalent hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 col-span-1 sm:col-span-2 flex items-center gap-5 border-accent/20 bg-gradient-to-br from-white to-accent/5">
          <div className="p-3 bg-accent/10 rounded-2xl flex-shrink-0">
            <Book className="w-8 h-8 text-accent" />
          </div>
          <div>
            <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Total Words Read (all time)</p>
            <p className="text-txt-primary font-bold text-3xl mt-0.5">{totalWordsRead.toLocaleString()}</p>
            <p className="text-txt-muted text-sm mt-1">
              That's roughly{' '}
              <span className="font-bold text-accent">{bookEquivalent} novels</span>
              {' '}at the average novel length of {AVG_NOVEL_WORDS.toLocaleString()} words.
            </p>
          </div>
        </div>
        <div className="card p-5 flex flex-col gap-3">
          <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">This Year ({year})</p>
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

      {/* Words Tracker */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-txt-primary font-semibold">Words Read Tracker</h2>
          {/* View switcher */}
          <div className="flex items-center bg-elevated rounded-lg p-1 gap-0.5 border border-border-subtle">
            {[
              { key: 'daily',   label: 'Daily' },
              { key: 'monthly', label: 'Monthly' },
              { key: 'yearly',  label: 'Yearly' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setWordView(v.key)}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  wordView === v.key
                    ? 'bg-white text-txt-primary font-medium shadow-sm'
                    : 'text-txt-muted hover:text-txt-secondary'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {wordView === 'monthly' && (
          <>
            <p className="text-txt-muted text-xs mb-3">Words read per month in {year}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatWords(v)} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,0,0,0.04)' }} />
                <Bar dataKey="words" name="Words" fill="#990000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Monthly summary row */}
            <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">
              {monthlyChartData.filter(m => m.words > 0).map((m, i) => (
                <div key={i} className="bg-elevated rounded-lg px-2 py-2 text-center">
                  <p className="text-txt-muted text-xs">{m.month}</p>
                  <p className="text-txt-primary font-semibold text-xs mt-0.5">{formatWords(m.words)}</p>
                  <p className="text-txt-muted text-[10px]">{m.fics} fic{m.fics \!== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {wordView === 'yearly' && (
          <>
            <p className="text-txt-muted text-xs mb-3">Total words read per year</p>
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
            ) : (
              <p className="text-txt-muted text-sm">Not enough data yet.</p>
            )}
          </>
        )}

        {wordView === 'daily' && (
          <>
            <p className="text-txt-muted text-xs mb-3">
              Average {formatWords(dailyAvg)} words/day — estimated daily reading activity
            </p>
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
            ) : (
              <p className="text-txt-muted text-sm">Add some finished fics to calculate your daily pace.</p>
            )}
            {dailyAvg > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="bg-elevated rounded-xl px-3 py-3 border border-border-subtle">
                  <p className="text-txt-muted text-xs">Daily avg</p>
                  <p className="text-txt-primary font-bold text-lg">{formatWords(dailyAvg)}</p>
                  <p className="text-txt-muted text-xs">words</p>
                </div>
                <div className="bg-elevated rounded-xl px-3 py-3 border border-border-subtle">
                  <p className="text-txt-muted text-xs">Monthly est.</p>
                  <p className="text-txt-primary font-bold text-lg">{formatWords(dailyAvg * 30)}</p>
                  <p className="text-txt-muted text-xs">words</p>
                </div>
                <div className="bg-elevated rounded-xl px-3 py-3 border border-border-subtle">
                  <p className="text-txt-muted text-xs">Yearly est.</p>
                  <p className="text-txt-primary font-bold text-lg">{formatWords(dailyAvg * 365)}</p>
                  <p className="text-txt-muted text-xs">≈ {(dailyAvg * 365 / AVG_NOVEL_WORDS).toFixed(1)} books</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Monthly fics chart */}
      <div className="card p-5">
        <h2 className="text-txt-primary font-semibold mb-4">Fics Read Monthly ({year})</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(153,0,0,0.04)' }} />
            <Bar dataKey="fics" name="Fics" fill="#6D28D9" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* V2 row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {completionRate \!== null && (
          <StatCard icon={CheckCircle2} label="Completion Rate" value={`${completionRate}%`} sub="of started fics" />
        )}
        {avgWordCount > 0 && (
          <StatCard icon={BarChart2} label="Avg Word Count" value={formatWords(avgWordCount)} sub="per finished fic" />
        )}
        {readingPaceWpd \!== null && (
          <StatCard icon={Gauge} label="Reading Pace" value={`${formatWords(readingPaceWpd)}/day`} sub="words on avg" />
        )}
        {longestFic && (
          <div className="card p-5 flex items-start gap-4 col-span-2 lg:col-span-1">
            <div className="p-2.5 rounded-xl bg-elevated">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-txt-muted text-xs uppercase tracking-wider font-medium">Longest Fic Read</p>
              <p className="text-txt-primary font-bold text-sm leading-tight mt-0.5 truncate">{longestFic.title}</p>
              <p className="text-txt-muted text-xs">{formatWords(longestFic.word_count)} words</p>
            </div>
          </div>
        )}
      </div>

      {/* Annual challenge */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            <h2 className="text-txt-primary font-semibold">{year} Reading Challenge</h2>
          </div>
          <span className="text-txt-muted text-sm">
            <span className="text-txt-primary font-semibold text-lg">{yearStats.fics_this_year}</span> / {annualGoal} fics
          </span>
        </div>
        <div className="h-3 bg-elevated rounded-full overflow-hidden mb-1.5 border border-border-subtle">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-dim rounded-full transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-txt-muted text-xs">{goalProgress}% complete</span>
          {goalProgress >= 100
            ? <span className="text-accent text-xs font-medium">🎉 Challenge complete\!</span>
            : <span className="text-txt-muted text-xs">{annualGoal - yearStats.fics_this_year} to go</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
            <p className="text-txt-muted text-xs">Fics this year</p>
            <p className="text-txt-primary font-bold text-lg">{yearStats.fics_this_year}</p>
          </div>
          <div className="bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
            <p className="text-txt-muted text-xs">Words this year</p>
            <p className="text-txt-primary font-bold text-lg">{formatWords(wordsThisYear)}</p>
          </div>
        </div>
      </div>

      {/* Two columns — fandoms + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-txt-primary font-semibold mb-4">Top Fandoms</h2>
          {byFandom.length === 0 ? (
            <p className="text-txt-muted text-sm">No fandom data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {byFandom.slice(0, 8).map((f, i) => {
                const max = byFandom[0].count;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-txt-secondary text-sm truncate w-40 flex-shrink-0">{f.fandom}</span>
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

        <div className="card p-5">
          <h2 className="text-txt-primary font-semibold mb-4">Fic Breakdown</h2>
          <div className="grid grid-cols-2 gap-4">
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
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-txt-secondary">{d.name}</span>
                    <span className="text-txt-muted ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
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
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-txt-secondary">{d.name}</span>
                    <span className="text-txt-muted ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating distribution */}
      {ratingDist.length > 0 && (
        <div className="card p-5">
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
      )}

      {/* Top ships */}
      {topShips.length > 0 && (
        <div className="card p-5">
          <h2 className="text-txt-primary font-semibold mb-4">💕 Ships You Can't Quit</h2>
          <div className="flex flex-wrap gap-2">
            {topShips.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated border border-border-subtle text-sm" style={{ color: JEWEL_COLORS[i % JEWEL_COLORS.length] }}>
                {s.ship}
                <span className="text-txt-muted text-xs">×{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag cloud */}
      {topTags.length > 0 && (
        <div className="card p-5">
          <h2 className="text-txt-primary font-semibold mb-4">✨ Your Tag Fingerprint</h2>
          <div className="flex flex-wrap gap-2">
            {topTags.map((t, i) => {
              const max = topTags[0].count;
              const size = 11 + Math.round((t.count / max) * 8);
              return (
                <span key={i} className="px-2.5 py-1 rounded-full bg-elevated border border-border-subtle text-txt-secondary hover:text-txt-primary transition-colors cursor-default"
                  style={{ fontSize: `${size}px` }}>
                  {t.tag}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Library summary */}
      <div className="card p-5">
        <h2 className="text-txt-primary font-semibold mb-4">Library Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total fics',        value: totals.total_fics       || 0 },
            { label: 'Finished',          value: totals.total_read        || 0 },
            { label: 'Currently reading', value: totals.currently_reading || 0 },
            { label: 'Want to read',      value: totals.want_to_read      || 0 },
            { label: 'DNF',               value: totals.dnf               || 0 },
            { label: 'Re-reading',        value: totals.rereading         || 0 },
          ].map((stat, i) => (
            <div key={i} className="bg-elevated rounded-xl px-3 py-3 border border-border-subtle">
              <p className="text-txt-muted text-xs">{stat.label}</p>
              <p className="text-txt-primary font-bold text-xl mt-0.5">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}
