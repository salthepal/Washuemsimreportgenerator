import { useMemo } from 'react';
import { Report, SessionNote, LST } from '../App';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShieldAlert, CheckCircle2, AlertTriangle, MapPin, FileText, Users, Sparkles, Calendar, TrendingUp, Activity, Gauge } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface DashboardProps {
  reports: Report[];
  sessionNotes: SessionNote[];
  generatedReports: Report[];
  lsts: LST[];
  isLoading?: boolean;
  selectedSite?: string;
}

interface ActivityItem {
  id: string;
  title: string;
  type: 'prior_report' | 'session_notes' | 'generated_report' | 'lst_alert';
  createdAt: string | Date;
  tags?: string[];
  status?: string;
  severity?: string;
}


export function Dashboard({ reports, sessionNotes, generatedReports, lsts, isLoading, selectedSite }: DashboardProps) {
  // ── Site-filtered LSTs ──
  const filteredLsts = useMemo(() => {
    if (!selectedSite || selectedSite === 'All Sites') return lsts;
    return lsts.filter(l => l.location === selectedSite);
  }, [lsts, selectedSite]);

  // ── LST-focused Metrics ──
  const activeSystemGaps = useMemo(() =>
    filteredLsts.filter(l => l.status !== 'Resolved').length,
  [filteredLsts]);

  const resolutionRate = useMemo(() => {
    if (filteredLsts.length === 0) return 100;
    const resolved = filteredLsts.filter(l => l.status === 'Resolved').length;
    return Math.round((resolved / filteredLsts.length) * 100);
  }, [filteredLsts]);

  const highRiskAlerts = useMemo(() =>
    filteredLsts.filter(l => l.severity === 'High' && l.status !== 'Resolved').length,
  [filteredLsts]);

  // ── Gaps Found vs Gaps Resolved over time ──
  const gapTimelineData = useMemo(() => {
    const monthMap: Record<string, { found: number; resolved: number }> = {};

    filteredLsts.forEach(lst => {
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
  }, [filteredLsts]);

  // ── Category distribution ──
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLsts.forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLsts]);

  // ── Recent Activity ──
  const recentActivity = useMemo(() => {
    const all = [
      ...reports.map(r => ({ id: r.id, title: r.title, type: 'prior_report' as const, createdAt: r.createdAt, tags: r.tags })),
      ...sessionNotes.map(n => ({ id: n.id, title: n.sessionName, type: 'session_notes' as const, createdAt: n.createdAt, tags: n.tags })),
      ...generatedReports.map(r => ({ id: r.id, title: r.title, type: 'generated_report' as const, createdAt: r.createdAt, tags: r.tags })),
      ...filteredLsts.map(l => ({ 
        id: l.id, 
        title: l.title, 
        type: 'lst_alert' as const, 
        createdAt: l.lastSeenDate || l.identifiedDate,
        status: l.status,
        severity: l.severity
      })),
    ];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  }, [reports, sessionNotes, generatedReports, filteredLsts]);

  const getActivityIcon = (type: string, severity?: string) => {
    switch (type) {
      case 'prior_report': return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'session_notes': return <Users className="w-4 h-4 text-[#007A33] dark:text-green-400" />;
      case 'generated_report': return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'lst_alert': return <ShieldAlert className={`w-4 h-4 ${severity === 'High' ? 'text-[#A51417]' : 'text-orange-500'}`} />;
      default: return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityLabel = (type: string, status?: string) => {
    switch (type) {
      case 'prior_report': return 'Prior Report';
      case 'session_notes': return 'Session Notes';
      case 'generated_report': return 'Generated Report';
      case 'lst_alert': return status === 'Resolved' ? 'Safety Resolved' : 'Safety Alert';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Safety Intelligence Dashboard</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            System safety posture at a glance &mdash; {filteredLsts.length} tracked threats at {selectedSite || 'All Sites'}
          </p>
        </div>
      </div>

      {/* ── App Summary ── */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">WashU Sim Intelligence</span> is a specialized clinical safety platform for the Department of Emergency Medicine. It centralizes simulation data to identify **Latent Safety Threats (LSTs)**, automate institutional reporting with **AI synthesis**, and provide a searchable repository for clinical scenario intelligence.
            </p>
          </div>
        </div>
      </div>

      {/* ── Primary Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Active System Gaps */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ShieldAlert className="w-7 h-7 md:w-8 md:h-8 text-[#A51417] dark:text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#A51417] dark:text-red-400 bg-red-200 dark:bg-red-900/50 px-2 py-0.5 rounded">Active Hits</span>
          </div>
          <div className="text-3xl md:text-4xl font-black text-red-900 dark:text-red-200">{activeSystemGaps}</div>
          <div className="text-xs font-semibold text-red-700 dark:text-red-400 mt-1">Unresolved System Gaps</div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/40 dark:to-emerald-900/30 border-2 border-[#007A33]/40 dark:border-green-700 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-[#007A33] dark:text-green-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#007A33] dark:text-green-400 bg-green-200 dark:bg-green-900/50 px-2 py-0.5 rounded">Efficiency</span>
          </div>
          <div className="text-3xl md:text-4xl font-black text-[#007A33] dark:text-green-200">{resolutionRate}%</div>
          <div className="text-xs font-semibold text-[#007A33] dark:text-green-400 mt-1">Mitigation Percentage</div>
        </div>

        {/* High-Risk Alerts */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/30 border-2 border-orange-300 dark:border-orange-800 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-7 h-7 md:w-8 md:h-8 text-orange-600 dark:text-orange-400" />
            {highRiskAlerts > 0 && (
              <span className="text-xs font-bold uppercase tracking-wider text-white bg-orange-600 px-2 py-0.5 rounded animate-pulse">Critical</span>
            )}
          </div>
          <div className="text-3xl md:text-4xl font-black text-orange-900 dark:text-orange-300">{highRiskAlerts}</div>
          <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mt-1">Critical Priority Fixes</div>
        </div>

        {/* Activity Volume */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4 md:p-5 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-7 h-7 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-200 dark:bg-blue-900/50 px-2 py-0.5 rounded">Intell</span>
          </div>
          <div className="text-3xl md:text-4xl font-black text-blue-900 dark:text-blue-200">{reports.length + sessionNotes.length + generatedReports.length}</div>
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-1">Total Clinical Objects</div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gaps Found vs. Gaps Resolved */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Mitigation Pipeline Trends
          </h3>
          {gapTimelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={gapTimelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="found" name="New Threats" stroke="#A51417" strokeWidth={3} dot={{ r: 4, fill: '#A51417' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="resolved" name="Resolutions" stroke="#007A33" strokeWidth={3} dot={{ r: 4, fill: '#007A33' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-16 text-sm italic">Insufficient data for predictive trending</div>
          )}
        </div>

        {/* Category Breakdown bar chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#007A33] dark:text-green-400" />
            Threat Vector Analysis (by Category)
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#007A33" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-16 text-sm">No categorical distribution mapped</div>
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 md:p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          System Audit Log / Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">System idle &mdash; no clinical activity recorded</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentActivity.map((item: ActivityItem) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-lg transition-all shadow-sm">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    {getActivityIcon(item.type, item.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 uppercase tracking-tight">
                    <span className={item.type === 'lst_alert' ? 'font-bold text-amber-600 dark:text-amber-500' : ''}>
                        {getActivityLabel(item.type, item.status)}
                    </span>
                    <span className="opacity-30">&bull;</span>
                    <span className="font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {item.tags?.length ? (
                  <div className="flex -space-x-1 overflow-hidden opacity-80">
                    {item.tags.slice(0, 3).map((tag: string, i: number) => (
                      <div key={i} title={tag} className="w-2 h-2 rounded-full border border-white dark:border-slate-800 bg-[#A51417]/40" />
                    ))}
                  </div>
                ) : item.severity === 'High' ? (
                    <div className="w-2 h-2 rounded-full bg-[#A51417] animate-pulse shadow-[0_0_8px_#A51417]" />
                ) : null}
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
