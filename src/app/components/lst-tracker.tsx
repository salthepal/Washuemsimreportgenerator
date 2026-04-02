import React, { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, Search, Filter, CheckCircle2, ShieldCheck, XCircle,
  TrendingUp, Users, Calendar, PlayCircle, Archive, AlertCircle,
  Download, MapPin, Pencil, X, Save
} from 'lucide-react';
import { LST, API_BASE, API_HEADERS } from '../App';
import { toast } from 'sonner';

interface LSTTrackerProps {
  lsts: LST[];
  onRefresh: () => void;
  selectedSite?: string;
}

// ── Edit Modal State ──
interface EditModalState {
  open: boolean;
  lst: LST | null;
  status: string;
  severity: string;
  category: string;
  location: string;
  recommendation: string;
  resolutionNote: string;
  assignee: string;
}

const INITIAL_EDIT: EditModalState = {
  open: false, lst: null, status: '', severity: '', category: '',
  location: '', recommendation: '', resolutionNote: '', assignee: '',
};

export function LSTTracker({ lsts, onRefresh, selectedSite }: LSTTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<EditModalState>(INITIAL_EDIT);

  // ── Derived Data ──
  const uniqueLocations = useMemo(() => {
    const locations = lsts.map(l => l.location).filter(Boolean) as string[];
    return ['All', ...Array.from(new Set(locations))];
  }, [lsts]);

  const filteredLsts = useMemo(() => {
    return lsts.filter((lst) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || lst.title.toLowerCase().includes(q) || lst.description.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'All' || lst.status === filterStatus;
      const matchesSeverity = filterSeverity === 'All' || lst.severity === filterSeverity;
      const matchesCategory = filterCategory === 'All' || lst.category === filterCategory;
      const matchesLocation = filterLocation === 'All' || lst.location === filterLocation;
      const matchesSite = !selectedSite || selectedSite === 'All Sites' || lst.location === selectedSite;
      return matchesSearch && matchesStatus && matchesSeverity && matchesCategory && matchesLocation && matchesSite;
    });
  }, [lsts, searchQuery, filterStatus, filterSeverity, filterCategory, filterLocation, selectedSite]);

  const sortedLsts = useMemo(() => {
    return [...filteredLsts].sort((a, b) => {
      const ord: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const d = ord[a.severity] - ord[b.severity];
      if (d !== 0) return d;
      return new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime();
    });
  }, [filteredLsts]);

  const stats = useMemo(() => {
    const siteLsts = (!selectedSite || selectedSite === 'All Sites') ? lsts : lsts.filter(l => l.location === selectedSite);
    return {
      total: siteLsts.length,
      active: siteLsts.filter(l => l.status === 'Identified').length,
      highSeverity: siteLsts.filter(l => l.severity === 'High' && l.status !== 'Resolved').length,
      resolved: siteLsts.filter(l => l.status === 'Resolved').length,
    };
  }, [lsts, selectedSite]);

  const activeFilterCount = [filterStatus, filterSeverity, filterCategory, filterLocation].filter(f => f !== 'All').length;

  // ── Handlers ──
  const openEditModal = useCallback((lst: LST) => {
    setEditModal({
      open: true,
      lst,
      status: lst.status,
      severity: lst.severity,
      category: lst.category,
      location: lst.location || '',
      recommendation: lst.recommendation || '',
      resolutionNote: lst.resolutionNote || '',
      assignee: lst.assignee || '',
    });
  }, []);

  const handleSaveEdit = async () => {
    if (!editModal.lst) return;
    setSaving(true);
    try {
      const payload = {
        ...editModal.lst,
        status: editModal.status,
        severity: editModal.severity,
        category: editModal.category,
        location: editModal.location || undefined,
        recommendation: editModal.recommendation,
        resolutionNote: editModal.resolutionNote || undefined,
        assignee: editModal.assignee || undefined,
        ...(editModal.status === 'Resolved' && !editModal.lst.resolvedDate
          ? { resolvedDate: new Date().toISOString() }
          : {}),
      };

      const response = await fetch(`${API_BASE}/lsts/${editModal.lst.id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('LST updated successfully');
        setEditModal(INITIAL_EDIT);
        onRefresh();
      } else {
        const err = await response.text();
        console.error('Update LST error:', err);
        toast.error('Failed to update LST');
      }
    } catch (error) {
      console.error('Error updating LST:', error);
      toast.error('Failed to update LST');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (lst: LST) => {
    const flow: Record<string, string> = {
      'Identified': 'In Progress',
      'In Progress': 'In Progress',
      'Recurring': 'In Progress',
    };
    const newStatus = flow[lst.status];
    if (!newStatus) return;

    try {
      const response = await fetch(`${API_BASE}/lsts/${lst.id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify({ ...lst, status: newStatus }),
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

  // ── CSV Export ──
  const handleDownloadCSV = () => {
    const headers = ['Title', 'Description', 'Status', 'Severity', 'Category', 'Location', 'Assignee', 'Identified Date', 'Last Seen', 'Resolved Date', 'Recommendation', 'Resolution Note', 'Recurrence Count'];
    const rows = sortedLsts.map(lst => [
      `"${(lst.title || '').replace(/"/g, '""')}"`,
      `"${(lst.description || '').replace(/"/g, '""')}"`,
      lst.status, lst.severity, lst.category,
      lst.location || '', lst.assignee || '',
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

  // ── Badge Helpers ──
  const severityBadge = (sev: string) => {
    const cls = sev === 'High'
      ? 'bg-[#A51417] text-white'
      : sev === 'Medium'
      ? 'bg-orange-500 text-white'
      : 'bg-slate-400 text-white';
    return <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${cls}`}>{sev}</span>;
  };

  const statusBadge = (status: string) => {
    const cls = status === 'Resolved'
      ? 'bg-[#007A33]/15 text-[#007A33] dark:bg-green-900/40 dark:text-green-400 border border-[#007A33]/30 dark:border-green-700'
      : status === 'Recurring'
      ? 'bg-[#A51417]/15 text-[#A51417] dark:bg-red-900/40 dark:text-red-400 border border-[#A51417]/30 dark:border-red-700'
      : status === 'In Progress'
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-700';
    return <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${cls}`}>{status}</span>;
  };

  return (
    <div className="space-y-4 md:space-y-5 p-2 md:p-0">
      {/* ── Edit Modal Overlay ── */}
      {editModal.open && editModal.lst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditModal(INITIAL_EDIT)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#A51417]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Edit Latent Safety Threat</h3>
              </div>
              <button onClick={() => setEditModal(INITIAL_EDIT)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Threat Title</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{editModal.lst.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={editModal.status}
                    onChange={(e) => setEditModal(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Identified">Identified</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Recurring">Recurring</option>
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Severity</label>
                  <select
                    value={editModal.severity}
                    onChange={(e) => setEditModal(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={editModal.category}
                    onChange={(e) => setEditModal(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Equipment">Equipment</option>
                    <option value="Process">Process</option>
                    <option value="Resources">Resources</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    value={editModal.location}
                    onChange={(e) => setEditModal(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Christian Northwest"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Assignee / Department</label>
                <input
                  type="text"
                  value={editModal.assignee}
                  onChange={(e) => setEditModal(prev => ({ ...prev, assignee: e.target.value }))}
                  placeholder="e.g., Pharmacy, Dr. Smith"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Recommendation</label>
                <textarea
                  value={editModal.recommendation}
                  onChange={(e) => setEditModal(prev => ({ ...prev, recommendation: e.target.value }))}
                  rows={3}
                  placeholder="Recommended intervention or corrective action..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>

              {/* Resolution Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Resolution Note {editModal.status === 'Resolved' && <span className="text-[#A51417]">*</span>}
                </label>
                <textarea
                  value={editModal.resolutionNote}
                  onChange={(e) => setEditModal(prev => ({ ...prev, resolutionNote: e.target.value }))}
                  rows={3}
                  placeholder="Document corrective actions taken, equipment changes, or policy updates..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-xl">
              <button
                onClick={handleSaveEdit}
                disabled={saving || (editModal.status === 'Resolved' && !editModal.resolutionNote.trim())}
                className="flex-1 px-4 py-2.5 bg-[#007A33] hover:bg-[#006428] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditModal(INITIAL_EDIT)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#A51417] rounded-lg">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">Safety Threat Tracker</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">WashU Emergency Medicine &mdash; System Safety Monitor</p>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">{stats.total}</div>
          <div className="text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-amber-700 dark:text-amber-300">{stats.active}</div>
          <div className="text-[10px] md:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Active</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-[#A51417]/30 dark:border-red-800 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-[#A51417] dark:text-red-300">{stats.highSeverity}</div>
          <div className="text-[10px] md:text-xs font-semibold text-[#A51417] dark:text-red-400 uppercase tracking-wider">High Risk</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 border border-[#007A33]/30 dark:border-green-800 rounded-lg p-3 text-center">
          <div className="text-2xl md:text-3xl font-black text-[#007A33] dark:text-green-300">{stats.resolved}</div>
          <div className="text-[10px] md:text-xs font-semibold text-[#007A33] dark:text-green-400 uppercase tracking-wider">Resolved</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search threats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Location Dropdown */}
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500"
          >
            {uniqueLocations.map(loc => (
              <option key={loc} value={loc}>{loc === 'All' ? 'All Locations' : loc}</option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#A51417] text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-white text-[#A51417] rounded-full text-[10px] font-bold">{activeFilterCount}</span>
            )}
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        {/* Expandable Filter Chips */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
            {/* Status */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Identified', 'In Progress', 'Recurring', 'Resolved'].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                      filterStatus === s ? 'bg-blue-600 text-white shadow scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            {/* Severity */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Severity</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'High', 'Medium', 'Low'].map((s) => (
                  <button key={s} onClick={() => setFilterSeverity(s)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                      filterSeverity === s
                        ? s === 'High' ? 'bg-[#A51417] text-white shadow scale-105' : 'bg-blue-600 text-white shadow scale-105'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
            {/* Category */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Equipment', 'Process', 'Resources', 'Logistics'].map((s) => (
                  <button key={s} onClick={() => setFilterCategory(s)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all ${
                      filterCategory === s ? 'bg-blue-600 text-white shadow scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Table / Card List ── */}
      {sortedLsts.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border-2 border-[#007A33]">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-[#007A33] rounded-full">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            {lsts.length === 0 ? 'System Operating Safely' : 'No Matching Threats'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {lsts.length === 0
              ? 'No latent safety threats identified. Continue monitoring simulation sessions.'
              : 'Adjust filters to view other threats.'}
          </p>
          {lsts.length > 0 && (
            <button
              onClick={() => { setFilterStatus('All'); setFilterSeverity('All'); setFilterCategory('All'); setFilterLocation('All'); setSearchQuery(''); }}
              className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedLsts.map((lst) => {
            const borderColor = lst.status === 'Resolved'
              ? 'border-l-[#007A33]'
              : lst.severity === 'High'
              ? 'border-l-[#A51417]'
              : lst.severity === 'Medium'
              ? 'border-l-orange-500'
              : 'border-l-slate-300 dark:border-l-slate-600';

            const bgColor = lst.status === 'Resolved'
              ? 'bg-green-50/40 dark:bg-green-950/10'
              : lst.severity === 'High'
              ? 'bg-red-50/40 dark:bg-red-950/10'
              : 'bg-white dark:bg-slate-800';

            return (
              <div
                key={lst.id}
                className={`border-l-4 ${borderColor} ${bgColor} border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-all hover:shadow-md`}
              >
                <div className="p-3 md:p-4">
                  {/* Row 1: Title + Badges + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{lst.title}</h3>
                        {severityBadge(lst.severity)}
                        {statusBadge(lst.status)}
                        {lst.recurrenceCount && lst.recurrenceCount > 1 && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-0.5 ${
                            lst.recurrenceCount >= 3
                              ? 'bg-[#A51417] text-white animate-pulse'
                              : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                          }`}>
                            <TrendingUp className="w-2.5 h-2.5" />
                            {lst.recurrenceCount}×
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{lst.description}</p>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(lst)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-xs font-semibold flex-shrink-0"
                      title="Edit this LST"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>

                  {/* Row 2: Metadata chips */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{lst.category}</span>
                    </span>
                    {lst.location && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-indigo-700 dark:text-indigo-300">
                        <MapPin className="w-2.5 h-2.5" />
                        {lst.location}
                      </span>
                    )}
                    {lst.assignee && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
                        <Users className="w-2.5 h-2.5" />
                        {lst.assignee}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(lst.identifiedDate).toLocaleDateString()}
                    </span>
                    {lst.resolvedDate && (
                      <span className="flex items-center gap-1 text-[#007A33] dark:text-green-400 font-semibold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Resolved {new Date(lst.resolvedDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Recommendation + Resolution (compact) */}
                  {lst.recommendation && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/20 border-l-2 border-blue-400 rounded-r px-3 py-2">
                      <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                        <span className="font-bold">Recommendation:</span> {lst.recommendation}
                      </p>
                    </div>
                  )}

                  {lst.resolutionNote && (
                    <div className="mt-2 bg-green-50 dark:bg-green-950/20 border-l-2 border-[#007A33] rounded-r px-3 py-2">
                      <p className="text-[11px] text-green-900 dark:text-green-200 leading-relaxed">
                        <span className="font-bold">Resolution:</span> {lst.resolutionNote}
                      </p>
                    </div>
                  )}

                  {/* Quick Action: Advance status for non-resolved */}
                  {lst.status !== 'Resolved' && (
                    <div className="mt-2 flex gap-2">
                      {(lst.status === 'Identified' || lst.status === 'Recurring') && (
                        <button
                          onClick={() => handleAdvanceStatus(lst)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <PlayCircle className="w-3 h-3" />
                          Start Progress
                        </button>
                      )}
                      {lst.status === 'In Progress' && (
                        <button
                          onClick={() => openEditModal(lst)}
                          className="px-3 py-1.5 bg-[#007A33] hover:bg-[#006428] text-white font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Document Resolution
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}