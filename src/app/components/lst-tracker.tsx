import React from 'react';
import { useState, useMemo } from 'react';
import { 
  AlertTriangle, Search, Filter, CheckCircle2, ShieldCheck, XCircle, 
  TrendingUp, Users, Calendar, PlayCircle, Archive, AlertCircle, Download, MapPin 
} from 'lucide-react';
import { LST, API_BASE, API_HEADERS } from '../App';
import { toast } from 'sonner';

interface LSTTrackerProps {
  lsts: LST[];
  onRefresh: () => void;
}

type FilterType = 'status' | 'severity' | 'category' | 'location';

export function LSTTracker({ lsts, onRefresh }: LSTTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [editingResolution, setEditingResolution] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locations = lsts.map(lst => lst.location).filter(Boolean) as string[];
    return ['All', ...Array.from(new Set(locations))];
  }, [lsts]);

  // Filter and search LSTs
  const filteredLsts = useMemo(() => {
    return lsts.filter((lst) => {
      const matchesSearch = 
        lst.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lst.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'All' || lst.status === filterStatus;
      const matchesSeverity = filterSeverity === 'All' || lst.severity === filterSeverity;
      const matchesCategory = filterCategory === 'All' || lst.category === filterCategory;
      const matchesLocation = filterLocation === 'All' || lst.location === filterLocation;

      return matchesSearch && matchesStatus && matchesSeverity && matchesCategory && matchesLocation;
    });
  }, [lsts, searchQuery, filterStatus, filterSeverity, filterCategory, filterLocation]);

  // Sort by severity (High -> Medium -> Low) and then by lastSeenDate
  const sortedLsts = useMemo(() => {
    return [...filteredLsts].sort((a, b) => {
      const severityOrder = { High: 0, Medium: 1, Low: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime();
    });
  }, [filteredLsts]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = lsts.length;
    const highSeverity = lsts.filter(lst => lst.severity === 'High').length;
    const resolved = lsts.filter(lst => lst.status === 'Resolved').length;
    
    return { total, highSeverity, resolved };
  }, [lsts]);

  // Advance status
  const handleAdvanceStatus = async (lst: LST) => {
    const statusFlow: Record<string, string> = {
      'Identified': 'In Progress',
      'In Progress': 'In Progress', // Keep in progress until formally resolved
      'Recurring': 'In Progress',
    };

    const newStatus = statusFlow[lst.status];
    if (!newStatus) return;

    try {
      const payload = {
        ...lst,
        status: newStatus,
      };

      const response = await fetch(`${API_BASE}/lsts/${lst.id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Advanced to "${newStatus}"`);
        onRefresh();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Save resolution
  const handleSaveResolution = async (lst: LST) => {
    if (!resolutionText.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }

    try {
      const payload = {
        ...lst,
        resolutionNote: resolutionText,
        assignee: assignee || lst.assignee,
        status: 'Resolved',
        resolvedDate: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE}/lsts/${lst.id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Threat resolved successfully', {
          description: 'Resolution documented in system records',
          icon: '✅',
        });
        setEditingResolution(null);
        setResolutionText('');
        setAssignee('');
        onRefresh();
      } else {
        toast.error('Failed to save resolution');
      }
    } catch (error) {
      console.error('Error saving resolution:', error);
      toast.error('Failed to save resolution');
    }
  };

  // Get border and background for severity
  const getSeverityStyles = (severity: string, status: string) => {
    if (status === 'Resolved') {
      return {
        border: 'border-l-4 border-l-[#007A33]',
        bg: 'bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent',
      };
    }

    if (severity === 'High') {
      return {
        border: 'border-l-4 border-l-[#A51417]',
        bg: 'bg-gradient-to-r from-red-50/80 to-transparent dark:from-red-950/30 dark:to-transparent',
      };
    }

    if (severity === 'Medium') {
      return {
        border: 'border-l-4 border-l-orange-500',
        bg: 'bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent',
      };
    }

    return {
      border: 'border-l-4 border-l-slate-300 dark:border-l-slate-600',
      bg: 'bg-white dark:bg-slate-800',
    };
  };

  // Get status configuration
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; icon: any; color: string }> = {
      'Identified': { 
        label: 'Identified', 
        icon: AlertCircle, 
        color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' 
      },
      'In Progress': { 
        label: 'In Progress', 
        icon: PlayCircle, 
        color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
      },
      'Resolved': { 
        label: 'Resolved', 
        icon: CheckCircle2, 
        color: 'text-[#007A33] dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
      },
      'Recurring': { 
        label: 'Recurring Alert', 
        icon: TrendingUp, 
        color: 'text-[#A51417] dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' 
      },
    };

    return configs[status] || configs['Identified'];
  };

  // Get action button config
  const getActionConfig = (status: string) => {
    if (status === 'Identified' || status === 'Recurring') {
      return {
        label: 'Advance to In Progress',
        icon: PlayCircle,
        color: 'bg-blue-600 hover:bg-blue-700',
      };
    }

    if (status === 'In Progress') {
      return {
        label: 'Document Resolution',
        icon: CheckCircle2,
        color: 'bg-[#007A33] hover:bg-[#006428]',
      };
    }

    return null;
  };

  // Timeline progress
  const getTimelineProgress = (lst: LST) => {
    const stages = ['Identified', 'In Progress', 'Resolved'];
    let currentStage = 0;

    if (lst.status === 'In Progress' || lst.status === 'Recurring') currentStage = 1;
    if (lst.status === 'Resolved') currentStage = 2;

    return { stages, currentStage };
  };

  // Active filter count
  const activeFilterCount = [filterStatus, filterSeverity, filterCategory, filterLocation].filter(f => f !== 'All').length;

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = ['Title', 'Description', 'Status', 'Severity', 'Category', 'Location', 'Assignee', 'Identified Date', 'Last Seen', 'Resolved Date', 'Recommendation', 'Resolution Note', 'Recurrence Count'];
    const rows = sortedLsts.map(lst => [
      `"${(lst.title || '').replace(/"/g, '""')}"`,
      `"${(lst.description || '').replace(/"/g, '""')}"`,
      lst.status,
      lst.severity,
      lst.category,
      lst.location || '',
      lst.assignee || '',
      lst.identifiedDate ? new Date(lst.identifiedDate).toLocaleDateString() : '',
      lst.lastSeenDate ? new Date(lst.lastSeenDate).toLocaleDateString() : '',
      lst.resolvedDate ? new Date(lst.resolvedDate).toLocaleDateString() : '',
      `"${(lst.recommendation || '').replace(/"/g, '""')}"`,
      `"${(lst.resolutionNote || '').replace(/"/g, '""')}"`,
      lst.recurrenceCount || 0,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lst-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('LST data exported as CSV');
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Clinical Header */}
      <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#A51417] rounded-lg">
            <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
              Safety Threat Tracker
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Washington University Emergency Medicine System Safety Monitor
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 md:p-6 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </div>
            <Archive className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
          </div>
          <div className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Total Threats
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-2 border-[#A51417] rounded-xl p-4 md:p-6 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl md:text-5xl font-bold text-[#A51417] dark:text-red-300">
              {stats.highSeverity}
            </div>
            <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-[#A51417] dark:text-red-400" />
          </div>
          <div className="text-xs md:text-sm font-semibold text-[#A51417] dark:text-red-400 uppercase tracking-wide">
            High Priority
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-2 border-[#007A33] rounded-xl p-4 md:p-6 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl md:text-5xl font-bold text-[#007A33] dark:text-green-300">
              {stats.resolved}
            </div>
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-[#007A33] dark:text-green-400" />
          </div>
          <div className="text-xs md:text-sm font-semibold text-[#007A33] dark:text-green-400 uppercase tracking-wide">
            Resolved
          </div>
        </div>
      </div>

      {/* Unified Filter Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search threat title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#A51417] text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-white text-[#A51417] rounded-full text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Download CSV Button */}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filter Chips (Expandable) */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {/* Status Filters */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {['All', 'Identified', 'In Progress', 'Recurring', 'Resolved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filters */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Severity
              </label>
              <div className="flex flex-wrap gap-2">
                {['All', 'High', 'Medium', 'Low'].map((severity) => (
                  <button
                    key={severity}
                    onClick={() => setFilterSeverity(severity)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      filterSeverity === severity
                        ? severity === 'High'
                          ? 'bg-[#A51417] text-white shadow-md scale-105'
                          : 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filters */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {['All', 'Equipment', 'Process', 'Resources', 'Logistics'].map((category) => (
                  <button
                    key={category}
                    onClick={() => setFilterCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      filterCategory === category
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Filters */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                Location
              </label>
              <div className="flex flex-wrap gap-2">
                {uniqueLocations.map((location) => (
                  <button
                    key={location}
                    onClick={() => setFilterLocation(location)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                      filterLocation === location
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LST Cards */}
      <div className="space-y-4">
        {sortedLsts.length === 0 ? (
          // Success State
          <div className="text-center py-16 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border-2 border-[#007A33]">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-[#007A33] rounded-full">
                <ShieldCheck className="w-16 h-16 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {lsts.length === 0 ? 'System Operating Safely' : 'No Matching Threats'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {lsts.length === 0 
                ? 'No latent safety threats have been identified. Continue monitoring simulation sessions for system-level risks.'
                : 'No threats match your current filter criteria. Adjust filters to view other threats.'
              }
            </p>
            {lsts.length > 0 && (
              <button
                onClick={() => {
                  setFilterStatus('All');
                  setFilterSeverity('All');
                  setFilterCategory('All');
                  setFilterLocation('All');
                  setSearchQuery('');
                }}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          sortedLsts.map((lst) => {
            const severityStyles = getSeverityStyles(lst.severity, lst.status);
            const statusConfig = getStatusConfig(lst.status);
            const actionConfig = getActionConfig(lst.status);
            const timeline = getTimelineProgress(lst);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={lst.id}
                className={`${severityStyles.border} ${severityStyles.bg} border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all hover:shadow-xl`}
              >
                <div className="p-5 md:p-6">
                  {/* Header Section */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
                          {lst.title}
                        </h3>
                        
                        {/* Severity Badge */}
                        <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded ${
                          lst.severity === 'High' 
                            ? 'bg-[#A51417] text-white' 
                            : lst.severity === 'Medium'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-400 text-white'
                        }`}>
                          {lst.severity}
                        </span>

                        {/* Category Badge */}
                        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded uppercase tracking-wide">
                          {lst.category}
                        </span>

                        {/* Recurrence Alert */}
                        {lst.recurrenceCount && lst.recurrenceCount > 1 && (
                          <span className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 ${
                            lst.recurrenceCount >= 3
                              ? 'bg-[#A51417] text-white animate-pulse'
                              : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                          }`}>
                            <TrendingUp className="w-3 h-3" />
                            Seen {lst.recurrenceCount}×
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                        {lst.description}
                      </p>
                    </div>

                    {/* Status Display (Non-clickable) */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${statusConfig.color} flex-shrink-0`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-sm font-bold whitespace-nowrap">
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Clinical Timeline */}
                  <div className="mb-4 bg-white/50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      {timeline.stages.map((stage, index) => {
                        const isComplete = index <= timeline.currentStage;
                        const isCurrent = index === timeline.currentStage;
                        
                        return (
                          <div key={stage} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all ${
                                isComplete 
                                  ? isCurrent
                                    ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-800 scale-110'
                                    : 'bg-[#007A33] text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                {isComplete ? '✓' : index + 1}
                              </div>
                              <span className={`text-xs font-semibold mt-2 text-center ${
                                isComplete ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500'
                              }`}>
                                {stage}
                              </span>
                            </div>
                            {index < timeline.stages.length - 1 && (
                              <div className={`flex-1 h-1 mx-2 rounded-full ${
                                index < timeline.currentStage 
                                  ? 'bg-[#007A33]' 
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Date Information */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Identified: {new Date(lst.identifiedDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Last Seen: {new Date(lst.lastSeenDate).toLocaleDateString()}</span>
                      </div>
                      {lst.resolvedDate && (
                        <div className="flex items-center gap-1 text-[#007A33] dark:text-green-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Resolved: {new Date(lst.resolvedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignee/Department */}
                  <div className="mb-4 flex items-center gap-4 flex-wrap">
                    {lst.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                            Location
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {lst.location}
                          </div>
                        </div>
                      </div>
                    )}
                    {lst.assignee && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                            Assigned To
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {lst.assignee}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Section */}
                  {lst.recommendation && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r-lg p-4">
                      <div className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-1">
                        Recommended Intervention
                      </div>
                      <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                        {lst.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Resolution Section */}
                  {editingResolution === lst.id ? (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                          Resolution Documentation (Required)
                        </label>
                        <textarea
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          placeholder="Document the corrective action taken, equipment changes, policy updates, or process modifications that resolve this threat..."
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                          Assigned Department/Person (Optional)
                        </label>
                        <input
                          type="text"
                          value={assignee}
                          onChange={(e) => setAssignee(e.target.value)}
                          placeholder="e.g., Pharmacy, Nursing, Facilities"
                          className="w-full px-4 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleSaveResolution(lst)}
                          disabled={!resolutionText.trim()}
                          className="flex-1 px-4 py-3 bg-[#007A33] hover:bg-[#006428] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Save & Mark Resolved
                        </button>
                        <button
                          onClick={() => {
                            setEditingResolution(null);
                            setResolutionText('');
                            setAssignee('');
                          }}
                          className="px-4 py-3 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : lst.resolutionNote ? (
                    <div className="bg-green-50 dark:bg-green-950/30 border-l-4 border-[#007A33] rounded-r-lg p-4">
                      <div className="text-xs font-bold text-[#007A33] dark:text-green-300 uppercase tracking-wider mb-1">
                        Resolution Documented
                      </div>
                      <p className="text-sm text-green-900 dark:text-green-200 leading-relaxed">
                        {lst.resolutionNote}
                      </p>
                    </div>
                  ) : actionConfig ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (lst.status === 'In Progress') {
                            setEditingResolution(lst.id);
                            setResolutionText(lst.resolutionNote || '');
                            setAssignee(lst.assignee || '');
                          } else {
                            handleAdvanceStatus(lst);
                          }
                        }}
                        className={`flex-1 ${actionConfig.color} text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide shadow-md hover:shadow-lg`}
                      >
                        {React.createElement(actionConfig.icon, { className: 'w-4 h-4' })}
                        {actionConfig.label}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}