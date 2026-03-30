import { Report, SessionNote } from '../App';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, FileText, Users, Sparkles, Calendar, Tag, Clock, ArrowRight } from 'lucide-react';

interface DashboardProps {
  reports: Report[];
  sessionNotes: SessionNote[];
  generatedReports: Report[];
}

export function Dashboard({ reports, sessionNotes, generatedReports }: DashboardProps) {
  // Calculate statistics
  const totalDocuments = reports.length + sessionNotes.length + generatedReports.length;
  
  // Get recent activity (last 7 days)
  const allActivity = [
    ...reports.map(r => ({ ...r, type: 'prior_report' as const, date: new Date(r.createdAt) })),
    ...sessionNotes.map(n => ({ ...n, type: 'session_notes' as const, date: new Date(n.createdAt) })),
    ...generatedReports.map(r => ({ ...r, type: 'generated_report' as const, date: new Date(r.createdAt) })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'prior_report': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'session_notes': return <Users className="w-4 h-4 text-green-600" />;
      case 'generated_report': return <Sparkles className="w-4 h-4 text-purple-600" />;
      default: return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityTitle = (item: any) => {
    if ('title' in item) return item.title;
    if ('sessionName' in item) return item.sessionName;
    return 'Unknown';
  };

  const getActivityType = (type: string) => {
    switch (type) {
      case 'prior_report': return 'Prior Report';
      case 'session_notes': return 'Session Notes';
      case 'generated_report': return 'Generated Report';
      default: return 'Unknown';
    }
  };

  // Reports by month
  const reportsByMonth = [...reports, ...generatedReports].reduce((acc, report) => {
    const month = new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = Object.entries(reportsByMonth).map(([month, count], index) => ({
    month,
    count,
  })).slice(-6);

  // Tags distribution
  const allTags = [...reports, ...sessionNotes, ...generatedReports]
    .flatMap(doc => doc.tags || []);
  
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tagData = Object.entries(tagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Status distribution for generated reports
  const statusCounts = generatedReports.reduce((acc, report) => {
    const status = report.status || 'draft';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = [
    { name: 'Draft', value: statusCounts.draft || 0, color: '#94a3b8' },
    { name: 'Reviewed', value: statusCounts.reviewed || 0, color: '#60a5fa' },
    { name: 'Approved', value: statusCounts.approved || 0, color: '#34d399' },
  ].filter(item => item.value > 0);

  // Department distribution
  const departmentCounts = [...sessionNotes].reduce((acc, note) => {
    const dept = note.metadata?.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentData = Object.entries(departmentCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Dashboard</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Overview of your post-session reports, observations, and analytics
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-950/30 border-2 border-[#A51417]/20 dark:border-[#A51417]/40 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#A51417]" />
            <div>
              <div className="text-2xl font-bold text-[#A51417]">{reports.length}</div>
              <div className="text-sm text-[#8B1113]">Past Reports</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 border-2 border-[#007A33]/20 dark:border-[#007A33]/40 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-[#007A33]" />
            <div>
              <div className="text-2xl font-bold text-[#007A33]">{sessionNotes.length}</div>
              <div className="text-sm text-[#006629]">Session Notes</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-slate-700 dark:text-slate-300" />
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{generatedReports.length}</div>
              <div className="text-sm text-slate-700 dark:text-slate-400">Generated</div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-slate-600 dark:text-slate-400" />
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalDocuments}</div>
              <div className="text-sm text-slate-700 dark:text-slate-400">Total Documents</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Reports Over Time */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reports Over Time
          </h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 py-12">No data available</div>
          )}
        </div>

        {/* Report Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Generated Report Status
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 py-12">No generated reports yet</div>
          )}
        </div>

        {/* Top Tags */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            Most Used Tags
          </h3>
          {tagData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tagData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 py-12">No tags added yet</div>
          )}
        </div>

        {/* Department Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Sessions by Department
          </h3>
          {departmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-500 py-12">No department data available</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {allActivity.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              {getActivityIcon(item.type)}
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {getActivityTitle(item)}
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1">
                  {item.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}