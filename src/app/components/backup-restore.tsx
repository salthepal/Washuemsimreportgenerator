import { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { fetchBackup, restoreData } from '../api';
import { toast } from 'sonner';

export function BackupRestore() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleBackup = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const data = await fetchBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `latent-safety-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Backup downloaded successfully' });
      toast.success('Backup created successfully');
    } catch (error) {
      console.error('Backup error:', error);
      setStatus({ type: 'error', message: 'Failed to create backup' });
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await restoreData(data);
      setStatus({ type: 'success', message: 'Data restored successfully. Reload the page to see changes.' });
      toast.success('Data restored successfully. Please reload the page.');
    } catch (error) {
      console.error('Restore error:', error);
      setStatus({ type: 'error', message: 'Failed to restore data. Please check the file format.' });
      toast.error('Failed to restore data');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>
          Export all your data as a JSON file or restore from a previous backup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
            {status.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button onClick={handleBackup} disabled={loading} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Export All Data
          </Button>

          <Button variant="outline" disabled={loading} className="flex-1" asChild>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Restore from Backup
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestore}
                disabled={loading}
              />
            </label>
          </Button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p>• Backup includes all reports, session notes, and templates</p>
          <p>• Restore will merge with existing data (duplicates will be skipped)</p>
          <p>• Keep backups in a secure location</p>
        </div>
      </CardContent>
    </Card>
  );
}
