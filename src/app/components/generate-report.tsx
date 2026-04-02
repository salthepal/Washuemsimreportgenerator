import { useState, useEffect, useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Download, Copy, Lightbulb, Target, FolderOpen, Search, Edit3, FileText } from 'lucide-react';
import { Report, SessionNote, API_BASE, API_HEADERS } from '../App';
import { CaseFile } from './case-files';
import { toast } from 'sonner';
import { downloadDocxFromMarkdown } from '../utils/docx';
import { useSelection } from '../hooks/useSelection';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDebounce } from 'use-debounce';
import { FixedSizeList as List } from 'react-window';
import jsPDF from 'jspdf';

interface GenerateReportProps {
  reports: Report[];
  sessionNotes: SessionNote[];
  caseFiles: CaseFile[];
  onRefresh: () => void;
  selectedSite?: string;
}

export function GenerateReport({ reports, sessionNotes, caseFiles, onRefresh, selectedSite }: GenerateReportProps) {
  const reportSelection = useSelection<string>();
  const noteSelection = useSelection<string>();
  const caseSelection = useSelection<string>();
  const [generating, setGenerating] = useState(false);
  
  // Draft Persistence: Use localStorage to persist generated report
  const [generatedReport, setGeneratedReport] = useLocalStorage<string | null>('generatedReportDraft', null);
  
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [similarReports, setSimilarReports] = useState<Report[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  
  // Search & Filter: Search queries with 300ms debounce
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [debouncedReportSearch] = useDebounce(reportSearchQuery, 300);
  const [debouncedNoteSearch] = useDebounce(noteSearchQuery, 300);

  // Filtered lists based on search — useEffect to decouple from render cycle
  const [filteredReports, setFilteredReports] = useState<Report[]>(reports);
  const [filteredNotes, setFilteredNotes] = useState<SessionNote[]>(sessionNotes);

  useEffect(() => {
    if (!debouncedReportSearch) {
      setFilteredReports(reports);
    } else {
      const query = debouncedReportSearch.toLowerCase();
      setFilteredReports(reports.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.content.toLowerCase().includes(query)
      ));
    }
  }, [reports, debouncedReportSearch]);

  useEffect(() => {
    if (!debouncedNoteSearch) {
      setFilteredNotes(sessionNotes);
    } else {
      const query = debouncedNoteSearch.toLowerCase();
      setFilteredNotes(sessionNotes.filter(n =>
        n.sessionName.toLowerCase().includes(query) ||
        n.notes.toLowerCase().includes(query)
      ));
    }
  }, [sessionNotes, debouncedNoteSearch]);

  // Memoized selections
  const selectedReportsList = useMemo(() => 
    filteredReports.filter(r => reportSelection.selected.includes(r.id)), 
    [filteredReports, reportSelection.selected]
  );

  const selectedNotesList = useMemo(() => 
    filteredNotes.filter(n => noteSelection.selected.includes(n.id)), 
    [filteredNotes, noteSelection.selected]
  );

  const selectedCasesList = useMemo(() => 
    caseFiles.filter(c => caseSelection.selected.includes(c.id)), 
    [caseFiles, caseSelection.selected]
  );

  // Load smart recommendations when notes selection changes
  useEffect(() => {
    const loadRecommendations = async () => {
      if (noteSelection.selected.length > 0) {
        try {
          const response = await fetch(`${API_BASE}/recommend-reports`, {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ noteIds: noteSelection.selected }),
          });
          if (response.ok) {
            const data = await response.json();
            setRecommendations(data.recommendations || []);
          }
        } catch (error) {
          console.error('Failed to load recommendations:', error);
        }
      }
    };
    loadRecommendations();
  }, [noteSelection.selected]);

  const handleGenerate = async () => {
    if (reportSelection.selected.length === 0) {
      toast.error('Please select at least one prior report for style reference');
      return;
    }

    if (noteSelection.selected.length === 0) {
      toast.error('Please select at least one session note');
      return;
    }

    setGenerating(true);
    setGeneratedReport(null);
    setSuggestedTags([]);
    setSimilarReports([]);
    
    try {
      const response = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          selectedReports: reportSelection.selected,
          selectedNotes: noteSelection.selected,
          selectedCases: caseSelection.selected,
          selectedSite: selectedSite || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reportContent = data.report.content;
        const lstStats = data.lstStats || { new: 0, updated: 0, total: 0 };
        
        setGeneratedReport(reportContent);
        
        // Show success message with LST extraction info
        if (lstStats.total > 0) {
          toast.success(
            `Report generated successfully!`,
            {
              description: `${lstStats.total} Latent Safety Threats identified: ${lstStats.new} new, ${lstStats.updated} recurring`,
              duration: 5000,
              icon: '🔍',
            }
          );
          
          // Show additional safety alert if high-priority threats detected
          if (lstStats.new > 0) {
            setTimeout(() => {
              toast.info(
                `Safety Alert: ${lstStats.new} new threats added to LST Tracker`,
                {
                  description: 'Review and prioritize these system-level safety concerns',
                  duration: 6000,
                }
              );
            }, 1000);
          }
        } else {
          toast.success('Report generated successfully!');
        }
        
        onRefresh();

        // Parallelize post-generation tasks (tags and similar reports)
        const postGenerationTasks = Promise.allSettled([
          // Task 1: Suggest tags
          fetch(`${API_BASE}/suggest-tags`, {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ content: reportContent }),
          }).then(async (tagsResponse) => {
            if (tagsResponse.ok) {
              const tagsData = await tagsResponse.json();
              setSuggestedTags(tagsData.tags || []);
            }
          }),
          // Task 2: Find similar reports
          fetch(`${API_BASE}/find-similar`, {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ content: reportContent }),
          }).then(async (similarResponse) => {
            if (similarResponse.ok) {
              const similarData = await similarResponse.json();
              setSimilarReports(similarData.similar || []);
            }
          }),
        ]);

        // Log any errors from post-generation tasks without blocking the UX
        postGenerationTasks.then((results) => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              const taskName = index === 0 ? 'tag suggestion' : 'similar report search';
              console.error(`Failed ${taskName}:`, result.reason);
            }
          });
        });
      } else {
        const error = await response.text();
        console.error('Generation error:', error);
        toast.error(`Failed to generate report: ${error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedReport) {
      navigator.clipboard.writeText(generatedReport);
      toast.success('Report copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (generatedReport) {
      const blob = new Blob([generatedReport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `post-session-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    }
  };

  const handleDownloadDocx = async () => {
    if (!generatedReport) return;

    try {
      await downloadDocxFromMarkdown(generatedReport, {
        filename: `post-session-report-${new Date().toISOString().split('T')[0]}.docx`
      });
      toast.success('Report downloaded as DOCX');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      toast.error('Failed to generate DOCX file');
    }
  };

  const handleDownloadPDF = async () => {
    if (!generatedReport) return;

    try {
      const doc = new jsPDF();
      
      // Set font size and margins
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // Split text into lines that fit the page width
      const lines = doc.splitTextToSize(generatedReport, maxWidth);
      
      // Add text to PDF with pagination
      let y = margin;
      const lineHeight = 7;
      
      doc.setFontSize(11);
      
      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(lines[i], margin, y);
        y += lineHeight;
      }
      
      doc.save(`post-session-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report downloaded as PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF file');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Generate New Report</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Select prior reports for style reference and session notes to synthesize a new report.
        </p>
      </div>

      {reports.length === 0 || sessionNotes.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">Setup Required</h3>
              <p className="text-yellow-800 dark:text-yellow-300">
                {reports.length === 0 && sessionNotes.length === 0 && 
                  'Please upload at least one prior report and add at least one session note to generate a new report.'}
                {reports.length === 0 && sessionNotes.length > 0 && 
                  'Please upload at least one prior report to use as a style reference.'}
                {reports.length > 0 && sessionNotes.length === 0 && 
                  'Please add at least one session note to generate a report.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Select Prior Reports */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                <span>Select Prior Reports (Style Reference)</span>
                <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                  {reportSelection.selected.length} selected
                </span>
              </h3>
              
              {/* Search Input with Debounce */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredReports.map((report) => (
                  <label
                    key={report.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      reportSelection.selected.includes(report.id)
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={reportSelection.selected.includes(report.id)}
                      onChange={() => reportSelection.toggle(report.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{report.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(report.date).toLocaleDateString()}
                      </div>
                    </div>
                    {reportSelection.selected.includes(report.id) && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => reportSelection.selectAll(reports.map(r => r.id))}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={reportSelection.deselectAll}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Select Session Notes */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                <span>Select Session Notes</span>
                <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                  {noteSelection.selected.length} selected
                </span>
              </h3>
              
              {/* Search Input with Debounce */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredNotes.map((note) => (
                  <label
                    key={note.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      noteSelection.selected.includes(note.id)
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={noteSelection.selected.includes(note.id)}
                      onChange={() => noteSelection.toggle(note.id)}
                      className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{note.sessionName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(note.createdAt).toLocaleDateString()} • {note.participants.length} participants
                      </div>
                    </div>
                    {noteSelection.selected.includes(note.id) && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => noteSelection.selectAll(sessionNotes.map(n => n.id))}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={noteSelection.deselectAll}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Select Case Files (Optional) */}
          {caseFiles.length > 0 && (
            <div className="bg-gradient-to-br from-[#007A33]/5 to-[#007A33]/10 dark:from-green-900/20 dark:to-green-900/10 rounded-lg p-5 border-2 border-[#007A33]/30 dark:border-green-700/50">
              <div className="flex items-start gap-3 mb-4">
                <FolderOpen className="w-6 h-6 text-[#007A33] dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Select Case Files (Optional Context)</span>
                    <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                      {caseSelection.selected.length} selected
                    </span>
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Case files provide patient scenario details to the AI for more accurate and contextually relevant reports.
                  </p>
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {caseFiles.map((caseFile) => (
                  <label
                    key={caseFile.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      caseSelection.selected.includes(caseFile.id)
                        ? 'bg-[#007A33]/10 dark:bg-green-900/30 border-[#007A33] dark:border-green-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#007A33]/50 dark:hover:border-green-600/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={caseSelection.selected.includes(caseFile.id)}
                      onChange={() => caseSelection.toggle(caseFile.id)}
                      className="mt-1 w-4 h-4 text-[#007A33] rounded focus:ring-2 focus:ring-[#007A33]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{caseFile.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {caseFile.metadata?.caseType && (
                          <span className="px-2 py-0.5 bg-[#007A33]/20 dark:bg-green-700/30 text-[#007A33] dark:text-green-300 rounded font-medium">
                            {caseFile.metadata.caseType}
                          </span>
                        )}
                        <span>{new Date(caseFile.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {caseSelection.selected.includes(caseFile.id) && (
                      <CheckCircle2 className="w-5 h-5 text-[#007A33] dark:text-green-400 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => caseSelection.selectAll(caseFiles.map(c => c.id))}
                  className="px-4 py-2 bg-[#007A33] hover:bg-[#006629] text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={caseSelection.deselectAll}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="space-y-3">
            {/* LST Extraction Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">
                    Automatic LST Extraction Enabled
                  </h4>
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    This report will automatically identify and extract Latent Safety Threats, then sync them to the <strong>LST Tracker</strong> tab. 
                    New threats are added as "Identified" and recurring issues are marked as "Recurring" with updated timestamps.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || reportSelection.selected.length === 0 || noteSelection.selected.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
            >
              <Sparkles className="w-6 h-6" />
              {generating ? 'Generating Report with Gemini AI...' : 'Generate Post-Session Report'}
            </button>
          </div>

          {/* Generated Report Display */}
          {generatedReport && (
            <>
              {/* AI Insights Section */}
              {(suggestedTags.length > 0 || similarReports.length > 0) && (
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Suggested Tags */}
                  {suggestedTags.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">Suggested Tags</h4>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {suggestedTags.slice(0, 5).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Similar Reports */}
                  {similarReports.length > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-900">Similar Reports</h4>
                      </div>
                      <p className="text-sm text-green-700">
                        Found {similarReports.length} similar report{similarReports.length !== 1 ? 's' : ''}
                      </p>
                      <div className="text-xs text-green-600 mt-1">
                        {similarReports[0]?.title}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Generated Report</h3>
                    <Edit3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">(Editable)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={handleDownloadDocx}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download DOCX
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
                <textarea
                  value={generatedReport}
                  onChange={(e) => setGeneratedReport(e.target.value)}
                  className="w-full min-h-[600px] bg-slate-50 dark:bg-slate-800 rounded-lg p-6 font-sans text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
                  placeholder="Your generated report will appear here..."
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}