import React, { useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Trash2, ChevronDown, ChevronUp, Bug, RefreshCw, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useErrorLog, useClearErrorLog } from '../hooks/useQueries';
import { toast } from 'sonner';

interface ErrorEntry {
  id: string;
  timestamp: string;
  action: string;
  message: string;
  stack?: string;
  context?: any;
}

export function ErrorLog() {
  const { data: logs = [], isLoading, refetch } = useErrorLog();
  const clearMutation = useClearErrorLog();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all error logs?')) return;
    try {
      await clearMutation.mutateAsync();
      toast.success('Error logs cleared');
    } catch (error) {
      toast.error('Failed to clear logs');
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <Terminal className="w-5 h-5 text-red-700 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-red-900 dark:text-red-200">System Error Log</CardTitle>
              <CardDescription className="text-xs text-red-700/70 dark:text-red-400/70">
                Track and diagnostic application-level failures
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
              disabled={isLoading}
              className="h-8 gap-1.5 text-xs font-semibold border-red-200 text-red-800 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleClear}
              disabled={logs.length === 0 || clearMutation.isPending}
              className="h-8 gap-1.5 text-xs font-bold bg-red-700 hover:bg-red-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-red-300 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-medium italic underline decoration-red-200">Retrieving diagnostic data...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center bg-green-50/20 dark:bg-green-900/5">
              <div className="inline-flex p-3 bg-green-100 dark:bg-green-900/40 rounded-full mb-3">
                <RefreshCw className="w-6 h-6 text-green-700 dark:text-green-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No system errors detected</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                Your system is operating within normal parameters. Errors will bloom here if they occur.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log: any) => (
                <div key={log.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <div 
                    className="p-4 cursor-pointer flex items-start gap-3"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 border-red-200 text-red-700 dark:border-red-900/50 dark:text-red-400">
                          {log.action}
                        </Badge>
                        <span className="text-[10px] font-medium text-slate-400 font-mono">
                          {format(new Date(log.timestamp), 'PPpp')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:line-clamp-none transition-all">
                        {log.message}
                      </p>
                    </div>
                    {expandedId === log.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                  
                  {expandedId === log.id && (
                    <div className="px-11 pb-4 animate-in slide-in-from-top-1 duration-200">
                      <div className="bg-slate-900 dark:bg-black rounded-lg p-3 overflow-x-auto border border-slate-700 shadow-inner">
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Terminal className="w-3 h-3" />
                          Stack Trace / Diagnostic Context
                        </h5>
                        <pre className="text-[11px] text-red-400 font-mono leading-relaxed whitespace-pre-wrap selection:bg-red-500/30">
                          {log.stack || 'No stack trace available'}
                        </pre>
                        {log.context && (
                          <div className="mt-3 pt-3 border-t border-slate-800">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Payload/Context</h5>
                            <pre className="text-[11px] text-blue-400 font-mono">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
