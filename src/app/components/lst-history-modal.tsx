import React from 'react';
import { useLSTHistory } from '../hooks/useQueries';
import { 
  X, History, Clock, ArrowRight, 
  CheckCircle2, AlertTriangle, Info 
} from 'lucide-react';
import { formatDate } from '../utils/document';
import { Skeleton } from './ui/skeleton';

interface LstHistoryModalProps {
  id: string;
  title: string;
  onClose: () => void;
}

export function LstHistoryModal({ id, title, onClose }: LstHistoryModalProps) {
  const { data: history = [], isLoading } = useLSTHistory(id);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700 scale-in-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-t-xl">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Audit History
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[400px]">
                {title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 mb-3">
                <Info className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">No History Recorded</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatic tracking was recently enabled. Changes from this point forward will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:border-l-2 before:border-slate-100 dark:before:border-slate-700">
              {history.map((entry: any, index: number) => (
                <div key={entry.id} className="relative flex gap-4 animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                  {/* Timeline Icon */}
                  <div className={`z-10 flex-shrink-0 w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center ${
                    entry.new_status === 'Resolved' ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {entry.new_status === 'Resolved' ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (entry.old_severity !== entry.new_severity) ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : (
                      <Clock className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Entry Details */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {formatDate(entry.created_at)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        System Event #{entry.id.split('_')[1]?.substring(0, 4)}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Status Change */}
                        {entry.old_status !== entry.new_status && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status Change</label>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400 font-semibold">{entry.old_status}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className={`px-1.5 py-0.5 rounded font-bold ${
                                entry.new_status === 'Resolved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                              }`}>{entry.new_status}</span>
                            </div>
                          </div>
                        )}

                        {/* Severity Change */}
                        {entry.old_severity !== entry.new_severity && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Severity Change</label>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400 font-semibold">{entry.old_severity}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className={`px-1.5 py-0.5 rounded font-bold ${
                                entry.new_severity === 'High' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                              }`}>{entry.new_severity}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-xl">
          <button 
            onClick={onClose}
            className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all text-xs"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}
