import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import Joyride, { Step } from 'react-joyride';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
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
import { FileText, Moon, Sun, HelpCircle } from 'lucide-react';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useDarkMode } from './hooks/useDarkMode';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { useLocalStorage } from './hooks/useLocalStorage';
import { apiCache } from './utils/cache';
import { TOUR_STEPS, KEYBOARD_SHORTCUTS } from './constants/tour';
import { toast } from 'sonner';

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

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching data from:', API_BASE);
      
      // Fetch all data in parallel for faster loading
      const [reportsRes, notesRes, caseFilesRes, generatedRes, lstsRes] = await Promise.all([
        fetch(`${API_BASE}/reports`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/notes`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/case-files`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/reports/generated`, { headers: API_HEADERS }),
        fetch(`${API_BASE}/lsts`, { headers: API_HEADERS }),
      ]);
      
      console.log('All responses received - status codes:', {
        reports: reportsRes.status,
        notes: notesRes.status,
        caseFiles: caseFilesRes.status,
        generated: generatedRes.status,
        lsts: lstsRes.status,
      });
      
      // Process reports
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        console.log('Reports data:', reportsData);
        setReports(reportsData.reports || []);
      } else {
        const errorData = await reportsRes.json();
        console.error('Failed to fetch reports:', errorData);
        
        // Check if it's a table missing error
        if (errorData.error?.includes('kv_store_7fe18c53')) {
          toast.error('Database table not found!', {
            description: 'Please create the table in Supabase SQL Editor',
            duration: 10000,
          });
          console.error('⚠️ DATABASE SETUP REQUIRED ⚠️');
          console.log('Please run this SQL in your Supabase SQL Editor:');
          console.log('CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (key TEXT NOT NULL PRIMARY KEY, value JSONB NOT NULL);');
        }
      }

      // Process session notes
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        console.log('Notes data:', notesData);
        setSessionNotes(notesData.notes || []);
      } else {
        const errorText = await notesRes.text();
        console.error('Failed to fetch session notes:', errorText);
      }

      // Process case files
      if (caseFilesRes.ok) {
        const caseFilesData = await caseFilesRes.json();
        console.log('Case files data:', caseFilesData);
        setCaseFiles(caseFilesData.caseFiles || []);
      } else {
        const errorText = await caseFilesRes.text();
        console.error('Failed to fetch case files:', errorText);
      }

      // Process generated reports
      if (generatedRes.ok) {
        const generatedData = await generatedRes.json();
        console.log('Generated reports data:', generatedData);
        setGeneratedReports(generatedData.reports || []);
      } else {
        const errorText = await generatedRes.text();
        console.error('Failed to fetch generated reports:', errorText);
      }

      // Process LSTs
      if (lstsRes.ok) {
        const lstsData = await lstsRes.json();
        console.log('LSTs data:', lstsData);
        setLsts(lstsData.lsts || []);
      } else {
        const errorText = await lstsRes.text();
        console.error('Failed to fetch LSTs:', errorText);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
            <div className="container mx-auto px-3 md:px-6 py-4 md:py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <FileText className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-lg md:text-3xl font-bold truncate">WashU Emergency Medicine</h1>
                    <p className="text-xs md:text-sm text-red-100 truncate">Simulation & Safety Intelligence</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDarkMode(!darkMode)}
                    className="text-white hover:bg-white/20 w-8 h-8 md:w-10 md:h-10"
                  >
                    {darkMode ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTourRunning(true)}
                    className="text-white hover:bg-white/20 w-8 h-8 md:w-10 md:h-10"
                  >
                    <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-2 md:px-6 py-4 md:py-8">
            <Tabs defaultValue="dashboard" className="space-y-4 md:space-y-6">
              <TabsList className="flex items-center justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-full no-scrollbar">
                <TabsTrigger value="dashboard" className="dashboard-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="upload" className="upload-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  Upload
                </TabsTrigger>
                <TabsTrigger value="cases" className="cases-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  Cases
                </TabsTrigger>
                <TabsTrigger value="notes" className="notes-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  Notes
                </TabsTrigger>
                <TabsTrigger value="generate" className="generate-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  Generate
                </TabsTrigger>
                <TabsTrigger value="lst-tracker" className="lst-tracker-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  LST Tracker
                </TabsTrigger>
                <TabsTrigger value="repository" className="repository-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  Repository
                </TabsTrigger>
                <TabsTrigger value="settings" className="settings-tab text-xs md:text-sm py-2.5 md:py-3 px-3 md:px-4 whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="p-2 md:p-6">
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
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="upload" className="p-2 md:p-6">
                <UploadReports reports={reports} onRefresh={fetchData} />
              </TabsContent>

              <TabsContent value="cases" className="p-2 md:p-6">
                <CaseFiles caseFiles={caseFiles} onRefresh={fetchData} />
              </TabsContent>

              <TabsContent value="notes" className="p-2 md:p-6">
                <SessionNotes sessionNotes={sessionNotes} onRefresh={fetchData} />
              </TabsContent>

              <TabsContent value="generate" className="p-2 md:p-6">
                <GenerateReport
                  reports={reports}
                  sessionNotes={sessionNotes}
                  caseFiles={caseFiles}
                  onRefresh={fetchData}
                />
              </TabsContent>

              <TabsContent value="lst-tracker" className="p-2 md:p-6">
                <LSTTracker lsts={lsts} onRefresh={fetchData} />
              </TabsContent>

              <TabsContent value="repository" className="p-2 md:p-6">
                <ViewRepository
                  reports={reports}
                  sessionNotes={sessionNotes}
                  generatedReports={generatedReports}
                  onRefresh={fetchData}
                />
              </TabsContent>

              <TabsContent value="settings" className="p-3 md:p-6">
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
                      <p><strong>Version:</strong> 2.0.0 (Optimized)</p>
                      <p><strong>Total Documents:</strong> {reports.length + sessionNotes.length + generatedReports.length}</p>
                      <p><strong>Gemini Model:</strong> gemini-3-flash-preview</p>
                      <p><strong>Features:</strong> AI Generation, Batch Operations, Audit Logging, Dark Mode</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </main>

          {/* Quick Actions Bar */}
          <QuickActionsBar
            onQuickUpload={() => {
              const uploadTab = document.querySelector('.upload-tab') as HTMLElement;
              uploadTab?.click();
            }}
            onQuickGenerate={() => {
              const generateTab = document.querySelector('.generate-tab') as HTMLElement;
              generateTab?.click();
            }}
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
            onNewNote={() => {
              const notesTab = document.querySelector('.notes-tab') as HTMLElement;
              notesTab?.click();
            }}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}