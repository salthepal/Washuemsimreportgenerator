import { useState, useMemo } from 'react';
import { AlertTriangle, Search, Filter, Clock, CheckCircle2, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { LST, API_BASE, API_HEADERS } from '../App';
import { toast } from 'sonner';
import { useConfirmDialog } from './ui/confirm-dialog';
import { ActionButton } from './ui/action-button';

interface LSTTrackerProps {
  lsts: LST[];
  onRefresh: () => void;
}

export function LSTTracker({ lsts, onRefresh }: LSTTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [editingResolution, setEditingResolution] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const { confirm, dialog } = useConfirmDialog();

  // Filter and search LSTs
  const filteredLsts = useMemo(() => {
    return lsts.filter((lst) => {
      const matchesSearch = 
        lst.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lst.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'All' || lst.status === filterStatus;
      const matchesSeverity = filterSeverity === 'All' || lst.severity === filterSeverity;
      const matchesCategory = filterCategory === 'All' || lst.category === filterCategory;

      return matchesSearch && matchesStatus && matchesSeverity && matchesCategory;
    });
  }, [lsts, searchQuery, filterStatus, filterSeverity, filterCategory]);

  // Sort by severity (High -> Medium -> Low) and then by lastSeenDate
  const sortedLsts = useMemo(() => {
    return [...filteredLsts].sort((a, b) => {
      // Sort by severity first
      const severityOrder = { High: 0, Medium: 1, Low: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by most recent lastSeenDate
      return new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime();
    });
  }, [filteredLsts]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = lsts.length;
    const identified = lsts.filter(lst => lst.status === 'Identified').length;
    const inProgress = lsts.filter(lst => lst.status === 'In Progress').length;
    const resolved = lsts.filter(lst => lst.status === 'Resolved').length;
    const recurring = lsts.filter(lst => lst.status === 'Recurring').length;
    const high = lsts.filter(lst => lst.severity === 'High').length;
    
    return { total, identified, inProgress, resolved, recurring, high };
  }, [lsts]);

  // Toggle status
  const handleStatusToggle = async (lst: LST) => {
    const statusFlow: Record<string, string> = {
      'Identified': 'In Progress',
      'In Progress': 'Resolved',
      'Resolved': 'Resolved', // Stay resolved
      'Recurring': 'In Progress',
    };

    const newStatus = statusFlow[lst.status] || 'Identified';

    try {
      const payload = {
        ...lst,
        status: newStatus,
        resolvedDate: newStatus === 'Resolved' ? new Date().toISOString() : lst.resolvedDate,
      };

      const response = await fetch(`${API_BASE}/lsts/${lst.id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Status updated to "${newStatus}"`);
        onRefresh();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Save resolution note
  const handleSaveResolution = async (lst: LST) => {
    try {
      const payload = {
        ...lst,
        resolutionNote: resolutionText,
        status: 'Resolved',
        resolvedDate: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE}/lsts/${lst.id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Resolution note saved');
        setEditingResolution(null);
        setResolutionText('');
        onRefresh();
      } else {
        toast.error('Failed to save resolution note');
      }
    } catch (error) {
      console.error('Error saving resolution:', error);
      toast.error('Failed to save resolution note');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Identified': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      'Resolved': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
      'Recurring': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
    };

    return styles[status] || '';
  };

  // Get severity indicator
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'High': 'bg-red-500',
      'Medium': 'bg-orange-500',
      'Low': 'bg-yellow-500',
    };
    return colors[severity] || 'bg-gray-500';
  };

  // Get recurrence badge
  const getRecurrenceBadge = (lst: LST) => {
    if (!lst.recurrenceCount || lst.recurrenceCount <= 1) return null;
    
    return (
      <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded">
        Seen {lst.recurrenceCount}x
      </span>
    );
  };

  // Calculate days since last seen
  const getDaysSinceLastSeen = (lastSeenDate: string) => {
    const now = new Date();
    const last = new Date(lastSeenDate);
    const diffTime = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {dialog}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-[#A51417]" />
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Latent Safety Threat Tracker
          </h2>
        </div>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          Track, prioritize, and resolve system-level safety threats identified during simulations.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4">
          <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
          <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">Total Threats</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 md:p-4">
          <div className="text-2xl md:text-3xl font-bold text-yellow-800 dark:text-yellow-300">{stats.identified}</div>
          <div className="text-xs md:text-sm text-yellow-700 dark:text-yellow-400 mt-1">Identified</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 md:p-4">
          <div className="text-2xl md:text-3xl font-bold text-blue-800 dark:text-blue-300">{stats.inProgress}</div>
          <div className="text-xs md:text-sm text-blue-700 dark:text-blue-400 mt-1">In Progress</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 md:p-4">
          <div className="text-2xl md:text-3xl font-bold text-green-800 dark:text-green-300">{stats.resolved}</div>
          <div className="text-xs md:text-sm text-green-700 dark:text-green-400 mt-1">Resolved</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 md:p-4">
          <div className="text-2xl md:text-3xl font-bold text-red-800 dark:text-red-300">{stats.recurring}</div>
          <div className="text-xs md:text-sm text-red-700 dark:text-red-400 mt-1">Recurring</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 md:p-4">
          <div className="text-2xl md:text-3xl font-bold text-red-800 dark:text-red-300">{stats.high}</div>
          <div className="text-xs md:text-sm text-red-700 dark:text-red-400 mt-1">High Severity</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search threats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Status</option>
              <option value="Identified">Identified</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Recurring">Recurring</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Severity</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        
        {/* Category Filter */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {['All', 'Equipment', 'Process', 'Resources', 'Logistics'].map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterCategory === category
                    ? 'bg-[#A51417] text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LST List */}
      <div className="space-y-3">
        {sortedLsts.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {lsts.length === 0 
                ? 'No latent safety threats identified yet'
                : 'No threats match your filters'
              }
            </p>
          </div>
        ) : (
          sortedLsts.map((lst) => (
            <div
              key={lst.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Severity Indicator */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(lst.severity)}`} title={`${lst.severity} Severity`} />
                  </div>

                  {/* Title and Category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                        {lst.title}
                      </h3>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded">
                        {lst.category}
                      </span>
                      {getRecurrenceBadge(lst)}
                    </div>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {lst.description}
                    </p>
                  </div>
                </div>

                {/* Status Badge (Clickable) */}
                <button
                  onClick={() => handleStatusToggle(lst)}
                  disabled={lst.status === 'Resolved'}
                  className={`px-3 py-1 border rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${getStatusBadge(lst.status)} ${
                    lst.status !== 'Resolved' ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
                  }`}
                  title={lst.status !== 'Resolved' ? 'Click to advance status' : 'Resolved'}
                >
                  {lst.status}
                </button>
              </div>

              {/* Details Row */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs text-slate-600 dark:text-slate-400 mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Identified: {new Date(lst.identifiedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>
                    Last Seen: {new Date(lst.lastSeenDate).toLocaleDateString()} 
                    {getDaysSinceLastSeen(lst.lastSeenDate) === 0 ? ' (Today)' : ` (${getDaysSinceLastSeen(lst.lastSeenDate)}d ago)`}
                  </span>
                </div>
                {lst.resolvedDate && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      Resolved: {new Date(lst.resolvedDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Recommendation */}
              {lst.recommendation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                  <p className="text-xs md:text-sm text-blue-900 dark:text-blue-200">
                    <strong>Recommendation:</strong> {lst.recommendation}
                  </p>
                </div>
              )}

              {/* Resolution Note */}
              {editingResolution === lst.id ? (
                <div className="space-y-2">
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe the resolution action taken..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveResolution(lst)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      Save & Resolve
                    </button>
                    <button
                      onClick={() => {
                        setEditingResolution(null);
                        setResolutionText('');
                      }}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : lst.resolutionNote ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-xs md:text-sm text-green-900 dark:text-green-200">
                    <strong>Resolution:</strong> {lst.resolutionNote}
                  </p>
                </div>
              ) : lst.status !== 'Resolved' ? (
                <button
                  onClick={() => {
                    setEditingResolution(lst.id);
                    setResolutionText(lst.resolutionNote || '');
                  }}
                  className="px-3 py-1 bg-[#007A33] hover:bg-[#006428] text-white rounded-lg text-xs md:text-sm font-medium flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Add Resolution Note
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
