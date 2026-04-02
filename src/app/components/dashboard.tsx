import { useMemo } from 'react';
import { Report, SessionNote, LST } from '../App';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShieldAlert, CheckCircle2, AlertTriangle, MapPin, FileText, Users, Sparkles, Calendar, TrendingUp, Activity } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface DashboardProps {
  reports: Report[];
  sessionNotes: SessionNote[];
  generatedReports: Report[];
  lsts: LST[];
  isLoading?: boolean;
}

export function Dashboard({ reports, sessionNotes, generatedReports, lsts, isLoading }: DashboardProps) {
  // ── LST-focused Metrics ──
  const activeSystemGaps = useMemo(() =>
    lsts.filter(l => l.status !== 'Resolved').length,
  [lsts]);

  const resolutionRate = useMemo(() => {
    if (lsts.length === 0) return 0;
    const resolved = lsts.filter(l => l.status === 'Resolved').length;
    return Math.round((resolved / lsts.length) * 100);
  }, [lsts]);

  const highRiskAlerts = useMemo(() =>
    lsts.filter(l => l.severity === 'High' && l.status !== 'Resolved').length,
  [lsts]);

  const topSimulationSite = useMemo(() => {
    const locationCounts: Record<string, number> = {};
    lsts.forEach(l => {
      const loc = l.location || 'Unknown';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    let topSite = 'N/A';
    let maxCount = 0;
    Object.entries(locationCounts).forEach(([loc, count]) => {
      if (count > maxCount && loc !== 'Unknown') {
        topSite = loc;
        maxCount = count;
      }
    });
    return { name: topSite, count: maxCount };
  }, [lsts]);

  // ── Gaps Found vs Gaps Resolved over time ──
  const gapTimelineData = useMemo(() => {
    const monthMap: Record<string, { found: number; resolved: number }> = {};

    lsts.forEach(lst => {
      const foundMonth = new Date(lst.identifiedDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthMap[foundMonth]) monthMap[foundMonth] = { found: 0, resolved: 0 };
      monthMap[foundMonth].found += 1;

      if (lst.resolvedDate) {
        const resMonth = new Date(lst.resolvedDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!monthMap[resMonth]) monthMap[resMonth] = { found: 0, resolved: 0 };
        monthMap[resMonth].resolved += 1;
      }
    });

    return Object.entries(monthMap)
      .sort((a, b) => {
        const da = new Date(a[0]);
        const db = new Date(b[0]);
        return da.getTime() - db.getTime();
      })
      .map(([month, data], idx) => ({ id: `gap-${idx}`, month, ...data }))
      .slice(-8);
  }, [lsts]);

  // ── Severity distribution pie ──
  const severityPieData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    lsts.forEach(l => { counts[l.severity] = (counts[l.severity] || 0) + 1; });
    return [
      { name: 'High', value: counts.High, color: '#A51417' },
      { name: 'Medium', value: counts.Medium, color: '#f97316' },
      { name: 'Low', value: counts.Low, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [lsts]);

  // ── LSTs by Location bar chart ──
  const locationBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    lsts.forEach(l => {
      const loc = l.location || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [lsts]);

  // ── Category distribution ──
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    lsts.forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [lsts]);

  // ── Recent Activity ──
  const recentActivity = useMemo(() => {
    const all = [
      ...reports.map(r => ({ id: r.id, title: r.title, type: 'prior_report' as const, createdAt: r.createdAt, tags: r.tags })),
      ...sessionNotes.map(n => ({ id: n.id, title: n.sessionName, type: 'session_notes' as const, createdAt: n.createdAt, tags: n.tags })),
      ...generatedReports.map(r => ({ id: r.id, title: r.title, type: 'generated_report' as const, createdAt: r.createdAt, tags: r.tags })),
    ];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [reports, sessionNotes, generatedReports]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'prior_report': return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'session_notes': return <Users className="w-4 h-4 text-[#007A33] dark:text-green-400" />;
      case 'generated_report': return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      default: return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'prior_report': return 'Prior Report';
      case 'session_notes': return 'Session Notes';
      case 'generated_report': return 'Generated Report';
      default: return 'Document';
    }
  };

  return (
    <div className="space-y-6">
      {isLoading && reports.length === 0 && lsts.length === 0 ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={`stat-${i}`} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={`chart-${i}`} className="h-64 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
      <>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Safety Intelligence Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          System safety posture at a glance &mdash; {lsts.length} total threats tracked across {reports.length + sessionNotes.length + generatedReports.length} documents
        </p>
      </div>

      {/* ── Primary Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Active System Gaps */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="w-7 h-7 md:w-8 md:h-8 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-200 dark:bg-amber-900/50 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="text-3xl md:text-4xl font-black text-amber-800 dark:text-amber-200">{activeSystemGaps}</div>
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-1">Active System Gaps</div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/30 border-2 border-[#007A33]/40 dark:border-green-700 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-[#007A33] dark:text-green-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#007A33] dark:text-green-400 bg-green-200 dark:bg-green-900/50 px-2 py-0.5 rounded">Rate</span>
          </div>
          <div className="text-3xl md:text-4xl font-black text-[#007A33] dark:text-green-200">{resolutionRate}%</div>
          <div className="text-xs font-semibold text-[#007A33] dark:text-green-400 mt-1">Safety Resolution Rate</div>
        </div>

        {/* High-Risk Alerts */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30 border-2 border-[#A51417]/40 dark:border-red-700 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-7 h-7 md:w-8 md:h-8 text-[#A51417] dark:text-red-400" />
            {highRiskAlerts > 0 && (
              <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#A51417] px-2 py-0.5 rounded animate-pulse">Alert</span>
            )}
          </div>
          <div className="text-3xl md:text-4xl font-black text-[#A51417] dark:text-red-300">{highRiskAlerts}</div>
          <div className="text-xs font-semibold text-[#A51417] dark:text-red-400 mt-1">High-Risk Alerts</div>
        </div>

        {/* Top Simulation Site */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-7 h-7 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" />
            {topSimulationSite.count > 0 && (
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-200 dark:bg-indigo-900/50 px-2 py-0.5 rounded">{topSimulationSite.count} LSTs</span>
            )}
          </div>
          <div className="text-lg md:text-xl font-black text-indigo-900 dark:text-indigo-200 truncate leading-tight mt-1">{topSimulationSite.name}</div>
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mt-1">Top Simulation Site</div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gaps Found vs. Gaps Resolved */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Gaps Found vs. Gaps Resolved
          </h3>
          {gapTimelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={gapTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #ffffff)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="found" name="Gaps Found" stroke="#A51417" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="resolved" name="Gaps Resolved" stroke="#007A33" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-16 text-sm">No LST timeline data yet &mdash; generate a report to begin tracking</div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            Threat Severity Distribution
          </h3>
          {severityPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {severityPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #ffffff)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-16 text-sm">No threats recorded yet</div>
          )}
        </div>

        {/* LSTs by Location */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Threats by Site Location
          </h3>
          {locationBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={locationBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={120} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #ffffff)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#A51417" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-16 text-sm">No location data yet</div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#007A33] dark:text-green-400" />
            Threats by Category
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #ffffff)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#007A33" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-16 text-sm">No category data yet</div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">No activity yet &mdash; upload a report to get started</div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                {getActivityIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{getActivityLabel(item.type)}</span>
                    <span>&middot;</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div className="hidden sm:flex gap-1">
                    {item.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}