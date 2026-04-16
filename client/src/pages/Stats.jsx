import React, { useState, useEffect } from 'react';
import { Loader2, Flame, BookOpen, Star, Zap, Calendar, TrendingUp, Target, Trophy, Gauge, CheckCircle2, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { getStats } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const JEWEL_COLORS = ['#14b8a6', '#7c3aed', '#2563eb', '#dc2626', '#d97706', '#059669', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className={`card p-5 flex items-start gap-4 ${accent ? 'border-accent/30 bg-accent/5' : ''}`}>
      <div className={`p-2.5 rounded-xl ${accent ? 'bg-accent/20' : 'bg-elevated'}`}>
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
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-txt-muted text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

function formatWords(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export default function Stats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
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

  if (!data) return <div className="p-6 text-txt-muted">Could not load stats.</div>;

  const {
    totals, yearStats, annualGoal, monthlyData, byFandom, byRating, byCompletion,
    streak, topShips, topTags, ratingDist,
    // V2
    completionRate, avgWordCount, avgWordsByYear, longestFic, readingPaceWpd, wrappedLabel,
  } = data;

  const goalProgress = annualGoal > 0 ? Math.min(100, Math.round((yearStats.fics_this_year / annualGoal) * 100)) : 0;

  const completionData = [
    { name: 'Complete', value: byCompletion.find(c => c.status === 'complete')?.count || 0, color: '#22c55e' },
    { name: 'In Progress', value: byCompletion.find(c => c.status === 'in-progress')?.count || 0, color: '#eab308' },
    { name: 'Abandoned', value: byCompletion.find(c => c.status === 'abandoned')?.count || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const ratingChartData = [
    { name: 'G', value: byRating.find(r => r.rating === 'G')?.count || 0, color: '#22c55e' },
    { name: 'T', value: byRating.find(r => r.rating === 'T')?.count || 0, color: '#3b82f6' },
    { name: 'M', value: byRating.find(r => r.rating === 'M')?.count || 0, color: '#f97316' },
    { name: 'E', value: byRating.find(r => r.rating === 'E')?.count || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const monthlyChartData = monthlyData.map((d, i) => ({
    month: MONTHS[i],
    fics: d.fics,
    words: d.words,
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

      {/* Fic Wrapped personality label */}
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
        <StatCard icon={BookOpen} label="Total Read" value={totals.total_read?.toLocaleString() || '0'} sub="all time" />
        <StatCard icon={TrendingUp} label="Words Read" value={formatWords(totals.total_words_read || 0)} sub="in finished fics" />
        <StatCard icon={Star} label="Avg Rating" value={totals.avg_rating ? Number(totals.avg_rating).toFixed(1) : '—'} sub="out of 5" />
        <StatCard icon={Flame} label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} sub="current streak" accent />
      </div>

      {/* V2 stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {completionRate !== null && (
          <StatCard icon={CheckCircle2} label="Completion Rate" value={`${completionRate}%`} sub="of started fics" />
        )}
        {avgWordCount > 0 && (
          <StatCard icon={BarChart2} label="Avg Word Count" value={formatWords(avgWordCount)} sub="per finished fic" />
        )}
        {readingPaceWpd !== null && (
          <StatCard icon={Gauge} label="Reading Pace" value={`${formatWords(readingPaceWpd)}/day`} sub="words on avg" />
        )}
        {longestFic && (
          <div className="card p-5 flex items-start gap-4 col-span-2 lg:col-span-1">
            <div className="p-2.5 rounded-xl bg-elevated">
              <Trophy className="w-5 h-5 text-yellow-500" />
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
        <div className="h-3 bg-elevated rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-dim rounded-full transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-txt-muted text-xs">{goalProgress}% complete</span>
          {goalProgress >= 100 ? (
            <span className="text-accent text-xs font-medium">🎉 Challenge complete!</span>
          ) : (
            <span className="text-txt-muted text-xs">{annualGoal - yearStats.fics_this_year} to go</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="bg-elevated rounded-lg px-3 py-2">
            <p className="text-txt-muted text-xs">Fics this year</p>
            <p className="text-txt-primary font-bold text-lg">{yearStats.fics_this_year}</p>
          </div>
          <div className="bg-elevated rounded-lg px-3 py-2">
            <p className="text-txt-muted text-xs">Words this year</p>
            <p className="text-txt-primary font-bold text-lg">{formatWords(yearStats.words_this_year || 0)}</p>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="card p-5">
        <h2 className="text-txt-primary font-semibold mb-4">Monthly Activity ({year})</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="fics" name="Fics" fill="#14b8a6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top fandoms */}
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
                    <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(f.count / max) * 100}%`, backgroundColor: JEWEL_COLORS[i % JEWEL_COLORS.length] }} />
                    </div>
                    <span className="text-txt-muted text-xs w-6 text-right flex-shrink-0">{f.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completion + content rating */}
        <div className="card p-5">
          <h2 className="text-txt-primary font-semibold mb-4">Fic Breakdown</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-txt-muted text-xs uppercase tracking-wider mb-3">Completion</p>
              {completionData.length > 0 ? (
                <div className="flex justify-center">
                  <PieChart width={120} height={120}>
                    <Pie data={completionData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                      {completionData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
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
                      {ratingChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" vertical={false} />
              <XAxis dataKey="rating" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" name="Fics" fill="#eab308" radius={[3, 3, 0, 0]} />
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
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elevated text-sm" style={{ color: JEWEL_COLORS[i % JEWEL_COLORS.length] }}>
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
                <span key={i} className="px-2.5 py-1 rounded-full bg-elevated text-txt-secondary hover:text-txt-primary transition-colors cursor-default"
                  style={{ fontSize: `${size}px` }}>
                  {t.tag}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Avg words by year */}
      {avgWordsByYear && avgWordsByYear.length > 1 && (
        <div className="card p-5">
          <h2 className="text-txt-primary font-semibold mb-4">Avg Word Count by Year</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[...avgWordsByYear].reverse()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" vertical={false} />
              <XAxis dataKey="yr" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatWords(v)} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => [formatWords(v), 'Avg words']} />
              <Bar dataKey="avg_words" name="Avg words" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...avgWordsByYear].reverse().map((y, i) => (
              <div key={i} className="bg-elevated rounded-lg px-3 py-2 text-center">
                <p className="text-txt-muted text-xs">{y.yr}</p>
                <p className="text-txt-primary font-semibold text-sm">{formatWords(y.avg_words)}</p>
                <p className="text-txt-muted text-xs">{y.fic_count} fics</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library summary */}
      <div className="card p-5">
        <h2 className="text-txt-primary font-semibold mb-4">Library Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total fics', value: totals.total_fics || 0 },
            { label: 'Finished', value: totals.total_read || 0 },
            { label: 'Currently reading', value: totals.currently_reading || 0 },
            { label: 'Want to read', value: totals.want_to_read || 0 },
            { label: 'DNF', value: totals.dnf || 0 },
            { label: 'Re-reading', value: totals.rereading || 0 },
          ].map((stat, i) => (
            <div key={i} className="bg-elevated rounded-xl px-3 py-3">
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
