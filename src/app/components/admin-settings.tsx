import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Save, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

export function AdminSettings() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('washu_admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!token.trim()) {
      localStorage.removeItem('washu_admin_token');
      setIsSaved(false);
      toast.info('Admin Token cleared');
    } else {
      localStorage.setItem('washu_admin_token', token.trim());
      setIsSaved(true);
      toast.success('Admin Token saved locally');
      // Reload to update global API_HEADERS
      window.location.reload();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border-2 border-amber-200 dark:border-amber-900 shadow-sm transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Administrative Authorization</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter your <b>ADMIN_TOKEN</b> to enable destructive actions (Delete, Clear Logs, Backup).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Enter Admin Token..."
            className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm transition-all"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isSaved ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Token Active (Local)
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">
                Not authenticated for admin tasks
              </span>
            )}
          </div>
          <Button 
            onClick={handleSave}
            variant={isSaved ? "outline" : "default"}
            className={isSaved ? "border-amber-200" : "bg-amber-600 hover:bg-amber-700 text-white"}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaved ? 'Update Token' : 'Save & Authorize'}
          </Button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <b>Note:</b> This token is stored locally in your browser and never reaches the server except in headers for authorized requests. 
          Destructive actions will return <code>401 Unauthorized</code> without this token.
        </p>
      </div>
    </div>
  );
}
