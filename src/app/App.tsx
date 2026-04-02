import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import Joyride, { Step } from 'react-joyride';
import { UploadReports } from './components/upload-reports';
import { SessionNotes } from './components/session-notes';
import { CaseFiles, CaseFile } from './components/case-files';
import { GenerateReport } from './components/generate-report';
import { ViewRepository } from './components/view-repository';
import { LSTTracker } from './components/lst-tracker';
import { QuickActionsBar } from './components/quick-actions-bar';
import { BackupRestore } from './components/backup-restore';
import { AuditLog } from './components/audit-log';
import { ViewAIPrompt } from './components/view-ai-prompt';
import { ErrorBoundary } from './components/error-boundary';
import { Toaster } from './components/ui/sonner';
import { FileText, Moon, Sun, HelpCircle, Menu, MapPin, X } from 'lucide-react';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useDarkMode } from './hooks/useDarkMode';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { useLocalStorage } from './hooks/useLocalStorage';
import { apiCache } from './utils/cache';
import { TOUR_STEPS, KEYBOARD_SHORTCUTS } from './constants/tour';
import { toast } from 'sonner';
import { AppSidebar } from './components/app-sidebar';

// Suppress React DevTools warning (harmless warning from browser extensions)
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('React DevTools')) return;
    originalWarn.apply(console, args);
  };
}

// Lazy load Dashboard to reduce initial bundle size
const Dashboard = lazy(() => import('./components/dashboard').then(module => ({ default: module.Dashboard })));

export interface Report {
  id: string;
  title: string;
  content: string;
  htmlContent?: string;
  date: string;
  type: 'prior_report' | 'generated_report';
  createdAt: string;
  basedOnReports?: string[];
  basedOnNotes?: string[];
  tags?: string[];
  status?: 'draft' | 'reviewed' | 'approved';
  editedContent?: string;
  metadata?: {
    uploaderName?: string;
    sessionName?: string;
    sessionDate?: string;
    location?: string;
    department?: string;
    timeOfDay?: string;
    facilitators?: string[];
    observers?: string[];
    relatedReports?: string[];
  };
}

export interface SessionNote {
  id: string;
  sessionName: string;
  notes: string;
  participants: string[];
  type: 'session_notes';
  createdAt: string;
  tags?: string[];
  metadata?: {
    uploaderName?: string;
    sessionDate?: string;
    location?: string;
    department?: string;
    timeOfDay?: string;
    facilitators?: string[];
    duration?: string;
  };
}

export interface LST {
  id: string;
  title: string;
  description: string;
  status: 'Identified' | 'In Progress' | 'Resolved' | 'Recurring';
  severity: 'High' | 'Medium' | 'Low';
  category: 'Equipment' | 'Process' | 'Resources' | 'Logistics';
  identifiedDate: string;
  lastSeenDate: string;
  recommendation: string;
  relatedReportId: string;
  resolutionNote?: string;
  resolvedDate?: string;
  recurrenceCount?: number;
  assignee?: string;
  location?: string;
}

export const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-7fe18c53`;
export const API_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [generatedReports, setGeneratedReports] = useState<Report[]>([]);
  const [lsts, setLsts] = useState<LST[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourRunning, setTourRunning] = useState(false);
  const [darkMode, setDarkMode] = useDarkMode();
  const [tourSteps, setTourSteps] = useLocalStorage<Step[]>('tourSteps', TOUR_STEPS);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebarCollapsed', false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>('All Sites');

  const availableSites = useMemo(() => {
    const sites = new Set<string>();
    lsts.forEach(l => { if (l.location) sites.add(l.location); });
    reports.forEach(r => { if (r.metadata?.location) sites.add(r.metadata.location); });
    sessionNotes.forEach(n => { if (n.metadata?.location) sites.add(n.metadata.location); });
    return ['All Sites', ...Array.from(sites).sort()];
  }, [lsts, reports, sessionNotes]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching data from:', API_BASE);
      
      // Use allSettled so one failure doesn't block the rest
      const results = await Promise.allSettled([
        fetch(`${API_BASE}/reports`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/notes`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/case-files`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/reports/generated`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/lsts`, { headers: API_HEADERS }),
      ]);

      // Process each result independently
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status !== 'fulfilled') {
          console.error(`Request ${i} rejected:`, result.reason);
          continue;
        }
        const res = result.value;
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Request ${i} failed (${res.status}):`, errorText);
          
          // Check for table missing error on first request
          if (i === 0 && errorText.includes('kv_store_7fe18c53')) {
            toast.error('Database table not found!', {
              description: 'Please create the table in Supabase SQL Editor',
              duration: 10000,
            });
            console.error('⚠️ DATABASE SETUP REQUIRED ⚠️');
            console.log('Please run this SQL in your Supabase SQL Editor:');
            console.log('CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (key TEXT NOT NULL PRIMARY KEY, value JSONB NOT NULL);');
          }
          continue;
        }
        try {
          const data = await res.json();
          switch (i) {
            case 0: setReports(data.reports || []); break;
            case 1: setSessionNotes(data.notes || []); break;
            case 2: setCaseFiles(data.caseFiles || []); break;
            case 3: setGeneratedReports(data.reports || []); break;
            case 4: setLsts(data.lsts || []); break;
          }
        } catch (parseErr) {
          console.error(`Request ${i} JSON parse error:`, parseErr);
        }
      }

      // Log any failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        toast.error('Systems are slow to respond. Some data may be missing.');
      }
    } catch (error) {
      console.error('Critical Load Error:', error);
      toast.error('Failed to connect to server', {
        description: 'Check console for details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useKeyboardShortcut('t', () => {
    setTourRunning(true);
  });

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors">
          <Toaster />
          <Joyride
            steps={tourSteps}
            run={tourRunning}
            continuous
            showProgress
            showSkipButton
            styles={{
              options: {
                primaryColor: '#A51417',
                zIndex: 10000,
              },
            }}
          />

          {/* Header */}
          <header className="bg-gradient-to-r from-[#A51417] to-[#8B0F12] text-white shadow-lg">
            <div className="px-3 md:px-6 py-2.5 md:py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileSidebarOpen(true)}
                      className="text-white hover:bg-white/20 w-8 h-8 flex-shrink-0"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  )}
                  <FileText className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-base md:text-xl font-bold truncate">WashU Emergency Medicine: Simulation & Safety Intelligence</h1>
                    <p className="text-xs text-red-100 truncate hidden md:block">Post-Session Report &amp; LST Management Platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDarkMode(!darkMode)}
                    className="text-white hover:bg-white/20 w-8 h-8"
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTourRunning(true)}
                    className="text-white hover:bg-white/20 w-8 h-8"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Sidebar + Main Content */}
          <div className="flex">
            {/* Mobile Sidebar */}
            {isMobile && (
              <AppSidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                collapsed={false}
                onCollapsedChange={() => {}}
                mobile
                open={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
                selectedSite={selectedSite}
                onSiteChange={setSelectedSite}
                availableSites={availableSites}
              />
            )}

            {/* Desktop Sidebar */}
            {!isMobile && (
              <AppSidebar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
                selectedSite={selectedSite}
                onSiteChange={setSelectedSite}
                availableSites={availableSites}
              />
            )}

            <main className="flex-1 min-w-0 px-2 md:px-6 py-4 md:py-6">
              {/* Site Filter Badge */}
              {selectedSite !== 'All Sites' && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400 border border-[#007A33]/20 dark:border-[#007A33]/30">
                    <MapPin className="w-3.5 h-3.5" />
                    Filtered by {selectedSite}
                    <button
                      onClick={() => setSelectedSite('All Sites')}
                      className="ml-1 hover:bg-[#007A33]/20 rounded-full p-0.5 transition-colors"
                      aria-label="Clear site filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}

              {activeTab === 'dashboard' && (
                <Suspense fallback={
                  <div className="space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <div className="grid grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-64" />
                      ))}
                    </div>
                  </div>
                }>
                  <Dashboard
                    reports={reports}
                    sessionNotes={sessionNotes}
                    generatedReports={generatedReports}
                    lsts={lsts}
                    isLoading={loading}
                    selectedSite={selectedSite}
                  />
                </Suspense>
              )}

              {activeTab === 'upload' && (
                <div className="p-2 md:p-6">
                  <UploadReports reports={reports} onRefresh={fetchData} />
                </div>
              )}

              {activeTab === 'cases' && (
                <div className="p-2 md:p-6">
                  <CaseFiles caseFiles={caseFiles} onRefresh={fetchData} />
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="p-2 md:p-6">
                  <SessionNotes sessionNotes={sessionNotes} onRefresh={fetchData} />
                </div>
              )}

              {activeTab === 'generate' && (
                <div className="p-2 md:p-6">
                  <GenerateReport
                    reports={reports}
                    sessionNotes={sessionNotes}
                    caseFiles={caseFiles}
                    onRefresh={fetchData}
                    selectedSite={selectedSite}
                  />
                </div>
              )}

              {activeTab === 'lst-tracker' && (
                <div className="p-2 md:p-6">
                  <LSTTracker lsts={lsts} onRefresh={fetchData} selectedSite={selectedSite} />
                </div>
              )}

              {activeTab === 'repository' && (
                <div className="p-2 md:p-6">
                  <ViewRepository
                    reports={reports}
                    sessionNotes={sessionNotes}
                    generatedReports={generatedReports}
                    onRefresh={fetchData}
                    isLoading={loading}
                    selectedSite={selectedSite}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="p-3 md:p-6">
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Settings & Administration</h2>
                      <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
                        Manage backups, audit logs, and system configuration
                      </p>
                    </div>

                    <ViewAIPrompt />

                    <BackupRestore />

                    <AuditLog />
                    
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Keyboard Shortcuts</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
                        {KEYBOARD_SHORTCUTS.map((shortcut) => (
                          <div key={shortcut.key} className="flex justify-between items-center">
                            <span className="text-slate-600 dark:text-slate-400">{shortcut.label}</span>
                            <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-slate-100">{shortcut.key}</kbd>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 md:p-6 border border-blue-200 dark:border-blue-800">
                      <h3 className="text-base md:text-lg font-bold text-blue-900 dark:text-blue-200 mb-2">System Information</h3>
                      <div className="space-y-2 text-xs md:text-sm text-blue-800 dark:text-blue-300">
                        <p><strong>Version:</strong> 3.0.0 (Comprehensive Intelligence Platform)</p>
                        <p><strong>Build:</strong> 26 Major Optimization Features</p>
                        <p><strong>Total Documents:</strong> {reports.length + sessionNotes.length + generatedReports.length}</p>
                        <p><strong>Active LSTs:</strong> {lsts.filter(lst => lst.status !== 'Resolved').length}</p>
                        <p><strong>AI Model:</strong> Gemini 3.0 Flash Experimental</p>
                        <p><strong>Backend:</strong> Supabase Edge Functions + KV Store</p>
                        <p><strong>Core Capabilities:</strong> AI-Powered Report Generation, LST Intelligence, Workflow Automation</p>
                        <p><strong>UX Features:</strong> Dark Mode (WCAG AA), Sidebar Navigation, 3 Export Formats (Copy/DOCX/PDF)</p>
                        <p><strong>Data Management:</strong> Batch Operations, Audit Logging, Backup/Restore, Advanced Filtering</p>
                        <p><strong>Branding:</strong> WashU PMS 200 (#A51417) & PMS 350 (#007A33)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>

          {/* Quick Actions Bar */}
          <QuickActionsBar
            onQuickUpload={() => setActiveTab('upload')}
            onQuickGenerate={() => setActiveTab('generate')}
            onExportAll={async () => {
              try {
                const response = await fetch(`${API_BASE}/backup`, {
                  headers: API_HEADERS,
                });
                if (response.ok) {
                  const data = await response.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Data exported successfully');
                }
              } catch (error) {
                console.error('Export error:', error);
                toast.error('Failed to export data');
              }
            }}
            onNewNote={() => setActiveTab('notes')}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}