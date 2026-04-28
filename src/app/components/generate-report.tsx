import { useState, useEffect, useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Download, Copy, Lightbulb, Target, FolderOpen, Search, Edit3, FileText, UploadCloud, X, Image as ImageIcon } from 'lucide-react';
import { Report, SessionNote, CaseFile } from '../types';
import { API_BASE, getApiHeaders, streamGenerateReport } from '../api';
import { toast } from 'sonner';
import { downloadDocxFromMarkdown } from '../utils/docx';
import { useSelection } from '../hooks/useSelection';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDebounce } from 'use-debounce';
import jsPDF from 'jspdf';
import { useReports, useNotes, useCaseFiles } from '../hooks/useQueries';
import { Turnstile } from './ui/turnstile';
import { LayoutGrid, Cpu } from 'lucide-react';
import { compressImage } from '../../utils/image';
import { GEMINI_FLASH, GEMINI_FLASH_LITE, GEMINI_PRO, DEFAULT_MODEL } from '../constants/models';

interface GenerateReportProps {
  selectedSite?: string;
  onRefresh: () => void;
}

export function GenerateReport({ selectedSite, onRefresh }: GenerateReportProps) {
  const { data: reports = [] } = useReports();
  const { data: sessionNotes = [] } = useNotes();
  const { data: caseFiles = [] } = useCaseFiles();
  const reportSelection = useSelection<string>();
  const noteSelection = useSelection<string>();
  const caseSelection = useSelection<string>();
  const [generating, setGenerating] = useState(false);
  const [extractLST, setExtractLST] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [loadingModel, setLoadingModel] = useState(false);
  
  // Media Attachments & Box Integration
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [boxToken, setBoxToken] = useState<string | null>(null);
  
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
            headers: getApiHeaders(),
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

  // Sync model preference
  useEffect(() => {
    const fetchModel = async () => {
      try {
        const response = await fetch(`${API_BASE}/model-preference?t=${Date.now()}`, {
          headers: getApiHeaders(),
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedModel(data.model);
        }
      } catch (e) {
        console.error('Error fetching model:', e);
      }
    };
    fetchModel();
  }, []);

  const handleModelChange = async (newModel: string) => {
    const previousModel = selectedModel;
    setSelectedModel(newModel);
    try {
      const response = await fetch(`${API_BASE}/model-preference`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ model: newModel }),
      });
      if (!response.ok) throw new Error();
      toast.success(`Active logic model: ${newModel.replace('gemini-', '').replace('-latest', '').toUpperCase()}`);
    } catch (e) {
      setSelectedModel(previousModel);
      toast.error('Failed to sync model selection');
    }
  };

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
    setGeneratedReport(''); // Start with empty string for streaming
    setSuggestedTags([]);
    setSimilarReports([]);
    
    try {
      const payload = {
        selectedReports: reportSelection.selected,
        selectedNotes: noteSelection.selected,
        selectedCases: caseSelection.selected,
        selectedSite: selectedSite || '',
        extractLST,
      };

      let fullContent = '';
      const stream = streamGenerateReport(payload, turnstileToken || '');

      for await (const chunk of stream) {
        fullContent += chunk;
        setGeneratedReport(fullContent);
      }

      if (!fullContent.trim()) {
        throw new Error('No content was returned. Please try again.');
      }

      // Append images if there are any
      if (attachedImages.length > 0) {
        const imageMarkdown = '\n\n### Session Photos\n\n' + attachedImages.map(url => `![Session Photo](${url})`).join('\n\n');
        fullContent += imageMarkdown;
        setGeneratedReport(fullContent);
      }

      toast.success('Report generated successfully!');
      onRefresh();

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Generation Failed', {
        description: error.message || 'Failed to generate report. Please try again.',
      });
    } finally {
      setGenerating(false);
      // Consume the used token; the widget will re-challenge and call onVerify with a fresh one
      setTurnstileToken(null);
      setTurnstileKey(k => k + 1);
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
      
      // Split text by actual newlines to process paragraphs and images independently
      const rawLines = generatedReport.split('\n');
      
      let y = margin;
      const lineHeight = 7;
      doc.setFontSize(11);
      
      for (let i = 0; i < rawLines.length; i++) {
        const rawLine = rawLines[i].trim();
        if (!rawLine) {
          y += lineHeight;
          continue;
        }

        // Check if paragraph is an image
        if (rawLine.match(/^!\[.*?\]\((.*?)\)$/)) {
          const match = rawLine.match(/^!\[.*?\]\((.*?)\)$/);
          const url = match ? match[1] : null;

          if (url) {
            try {
              // Fetch and convert image to base64
              const response = await fetch(url);
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              // Assuming standard width of 120 and height of 90 (4:3 ratio) for the PDF
              const imgWidth = 120;
              const imgHeight = 90;
              
              // Add a new page if the image would bleed off the bottom
              if (y + imgHeight + margin > pageHeight - margin) {
                doc.addPage();
                y = margin;
              }

              const mimeMatch = base64.match(/^data:image\/(\w+);base64,/);
              const imgFormat = (mimeMatch?.[1] ?? 'jpeg').toUpperCase().replace('JPG', 'JPEG');
              doc.addImage(base64, imgFormat as any, margin, y, imgWidth, imgHeight);
              y += imgHeight + 10; // Add padding below image
            } catch (err) {
              console.warn("PDF Image Load Failed:", url);
              doc.text(`[Image unable to load: ${url}]`, margin, y);
              y += lineHeight;
            }
          }
          continue;
        }

        // If not an image, safely wrap the text string to fit the page width
        const wrappedLines = doc.splitTextToSize(rawLine, maxWidth);
        
        for (let j = 0; j < wrappedLines.length; j++) {
          if (y + lineHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(wrappedLines[j], margin, y);
          y += lineHeight;
        }
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

          {/* Media Attachments Zone */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <ImageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  <span>Session Photos (Optional)</span>
                  <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                    {attachedImages.length} attached
                  </span>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Upload photos of the simulation to be appended to the end of the report. Box support coming soon.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {attachedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {attachedImages.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden group">
                      <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploadingImage 
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
              }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Compressing & Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, WEBP or HEIC</p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  multiple
                  disabled={uploadingImage}
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    
                    setUploadingImage(true);
                    try {
                      const newUrls = [];
                      for (let i = 0; i < files.length; i++) {
                        // 1. Compress image in browser
                        const compressed = await compressImage(files[i]);
                        
                        // 2. Upload to Cloudflare worker
                        const formData = new FormData();
                        formData.append('file', compressed);
                        formData.append('turnstileToken', turnstileToken || '');
                        
                        const response = await fetch(`${API_BASE}/upload-file`, {
                          method: 'POST',
                          headers: {
                            'X-Turnstile-Token': turnstileToken || '',
                          },
                          body: formData
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          // Construct full URL using our custom R2.dev domain or worker route
                          // The endpoint returns url: '/files/xyz'
                          const fileUrl = `${API_BASE}${data.url}`;
                          newUrls.push(fileUrl);
                        } else {
                          toast.error(`Failed to upload ${files[i].name}`);
                        }
                      }
                      
                      setAttachedImages(prev => [...prev, ...newUrls]);
                      if (newUrls.length > 0) {
                        toast.success(`Successfully attached ${newUrls.length} image(s)`);
                      }
                    } catch (err) {
                      console.error('Upload error:', err);
                      toast.error('An error occurred during upload');
                    } finally {
                      setUploadingImage(false);
                      // Clear the input
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <div className="space-y-3">
            {/* LST Extraction Configuration */}
            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              extractLST 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800' 
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${extractLST ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-200 dark:bg-slate-800'}`}>
                    <Target className={`w-5 h-5 ${extractLST ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${extractLST ? 'text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>
                      Safety Intelligence Engine
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Automatically identify LSTs and sync to tracker
                    </p>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={extractLST}
                    onChange={(e) => setExtractLST(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#A51417]"></div>
                </label>
              </div>

              {extractLST && (
                <div className="mt-3 text-xs text-blue-800 dark:text-blue-300 bg-white/50 dark:bg-slate-950/50 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
                  <strong>Intelligence Active:</strong> Gemini 3.1 Flash Lite will scan this report for clinical gaps, equipment failures, and process errors.
                </div>
              )}
            </div>

            {/* Compact Model Selector */}
            <div className="bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">Active Engine</span>
                </div>
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {[
                    { id: GEMINI_FLASH_LITE, label: 'Lite', color: 'bg-green-600 text-white border-green-600', hover: 'hover:bg-green-50 text-green-700' },
                    { id: GEMINI_FLASH, label: 'Flash', color: 'bg-blue-600 text-white border-blue-600', hover: 'hover:bg-blue-50 text-blue-700' },
                    { id: GEMINI_PRO, label: 'Pro', color: 'bg-indigo-600 text-white border-indigo-600', hover: 'hover:bg-indigo-50 text-indigo-700' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleModelChange(m.id)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                        selectedModel === m.id
                          ? `${m.color} shadow-lg shadow-current/20 scale-105`
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Turnstile key={turnstileKey} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

            <button
              onClick={handleGenerate}
              disabled={generating || reportSelection.selected.length === 0 || noteSelection.selected.length === 0 || !turnstileToken}
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