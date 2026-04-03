import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Upload, Trash2, Edit, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { fetchAuditLog } from '../api';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  itemType: string;
  itemTitle: string;
  user?: string;
}

export function AuditLog() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLog();
  }, []);

  const loadAuditLog = async () => {
    try {
      const data = await fetchAuditLog();
      setAuditLog(data);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'generate':
        return <FileText className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'upload':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'generate':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'edit':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'export':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  const filteredLog = auditLog.filter(
    (entry) =>
      (entry.itemTitle || '').toLowerCase().includes(search.toLowerCase()) ||
      (entry.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (entry.itemType || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <Input
          placeholder="Search audit log..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-4"
        />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : filteredLog.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {search ? 'No matching audit entries found' : 'No audit entries yet'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Badge className={`${getActionColor(entry.action)} flex items-center gap-1 px-2 py-1`}>
                    {getActionIcon(entry.action)}
                    <span className="text-xs">{entry.action}</span>
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.itemTitle}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {entry.itemType} • {format(new Date(entry.timestamp), 'PPp')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}