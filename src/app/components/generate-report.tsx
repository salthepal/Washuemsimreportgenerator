import { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Download, Copy, Lightbulb, Target, FolderOpen } from 'lucide-react';
import { Report, SessionNote, API_BASE, API_HEADERS } from '../App';
import { CaseFile } from './case-files';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { useSelection } from '../hooks/useSelection';

interface GenerateReportProps {
  reports: Report[];
  sessionNotes: SessionNote[];
  caseFiles: CaseFile[];
  onRefresh: () => void;
}

export function GenerateReport({ reports, sessionNotes, caseFiles, onRefresh }: GenerateReportProps) {
  const reportSelection = useSelection<string>();
  const noteSelection = useSelection<string>();
  const caseSelection = useSelection<string>();
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [similarReports, setSimilarReports] = useState<Report[]>([]);

  // Memoized selections
  const selectedReportsList = useMemo(() => 
    reports.filter(r => reportSelection.selected.includes(r.id)), 
    [reports, reportSelection.selected]
  );

  const selectedNotesList = useMemo(() => 
    sessionNotes.filter(n => noteSelection.selected.includes(n.id)), 
    [sessionNotes, noteSelection.selected]
  );

  const selectedCasesList = useMemo(() => 
    caseFiles.filter(c => caseSelection.selected.includes(c.id)), 
    [caseFiles, caseSelection.selected]
  );

  // Load smart recommendations on mount
  useMemo(() => {
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reportContent = data.report.content;
        setGeneratedReport(reportContent);
        toast.success('Report generated successfully!');
        onRefresh();

        // Auto-tag the generated report
        try {
          const tagsResponse = await fetch(`${API_BASE}/suggest-tags`, {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ content: reportContent }),
          });
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            setSuggestedTags(tagsData.tags || []);
          }
        } catch (err) {
          console.error('Failed to generate tags:', err);
        }

        // Find similar reports
        try {
          const similarResponse = await fetch(`${API_BASE}/find-similar`, {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ content: reportContent }),
          });
          if (similarResponse.ok) {
            const similarData = await similarResponse.json();
            setSimilarReports(similarData.similar || []);
          }
        } catch (err) {
          console.error('Failed to find similar reports:', err);
        }
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
      // Parse the Markdown content into structured paragraphs
      const lines = generatedReport.split('\n');
      const children: any[] = [];
      let currentFindingLevel = 0; // Track if we're in a ### subsection

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          // Add spacing for empty lines
          children.push(new Paragraph({ text: '' }));
          currentFindingLevel = 0;
          continue;
        }

        // H1: Main title with # 
        if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('##')) {
          children.push(
            new Paragraph({
              text: trimmedLine.substring(2).trim(),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            })
          );
          currentFindingLevel = 0;
        }
        // H2: Major sections with ##
        else if (trimmedLine.startsWith('## ') && !trimmedLine.startsWith('###')) {
          children.push(
            new Paragraph({
              text: trimmedLine.substring(3).trim(),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
            })
          );
          currentFindingLevel = 0;
        }
        // H3: Specific findings with ###
        else if (trimmedLine.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: trimmedLine.substring(4).trim(),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 120 },
            })
          );
          currentFindingLevel = 1; // We're now in a finding subsection
        }
        // Bullet points with - (or -, •, *)
        else if (trimmedLine.match(/^[-•*]\s+/)) {
          children.push(
            new Paragraph({
              text: trimmedLine.replace(/^[-•*]\s+/, ''),
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        }
        // Numbered lists
        else if (trimmedLine.match(/^\d+[\.)]\s+/)) {
          children.push(
            new Paragraph({
              text: trimmedLine.replace(/^\d+[\.)]\s+/, ''),
              numbering: { reference: 'default-numbering', level: 0 },
              spacing: { after: 80 },
            })
          );
        }
        // Regular paragraphs with inline formatting
        else {
          const textRuns: TextRun[] = [];
          
          // Parse inline bold (**text**) and italics (*text*)
          // Split by both bold and italic markers
          const parts = trimmedLine.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
          
          parts.forEach(part => {
            if (!part) return;
            
            // Bold text
            if (part.startsWith('**') && part.endsWith('**')) {
              textRuns.push(new TextRun({ 
                text: part.slice(2, -2), 
                bold: true 
              }));
            }
            // Italic text (but not bold)
            else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
              textRuns.push(new TextRun({ 
                text: part.slice(1, -1), 
                italics: true 
              }));
            }
            // Regular text
            else {
              textRuns.push(new TextRun(part));
            }
          });

          // Apply indentation for paragraphs under ### findings
          const indentLevel = currentFindingLevel > 0 ? 720 : 0;

          children.push(
            new Paragraph({
              children: textRuns.length > 0 ? textRuns : [new TextRun(trimmedLine)],
              spacing: { after: 120 },
              indent: indentLevel > 0 ? { left: indentLevel } : undefined,
            })
          );
        }
      }

      const doc = new Document({
        numbering: {
          config: [
            {
              reference: 'default-numbering',
              levels: [
                {
                  level: 0,
                  format: 'decimal',
                  text: '%1.',
                  alignment: 'start',
                },
              ],
            },
          ],
        },
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,    // 1 inch
                  right: 1440,  // 1 inch
                  bottom: 1440, // 1 inch
                  left: 1440,   // 1 inch
                },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `post-session-report-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Report downloaded as DOCX');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      toast.error('Failed to generate DOCX file');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate New Report</h2>
        <p className="text-slate-600">
          Select prior reports for style reference and session notes to synthesize a new report.
        </p>
      </div>

      {reports.length === 0 || sessionNotes.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Setup Required</h3>
              <p className="text-yellow-800">
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
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center justify-between">
                <span>Select Prior Reports (Style Reference)</span>
                <span className="text-sm font-normal text-slate-600">
                  {reportSelection.selected.length} selected
                </span>
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reports.map((report) => (
                  <label
                    key={report.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      reportSelection.selected.includes(report.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={reportSelection.selected.includes(report.id)}
                      onChange={() => reportSelection.toggle(report.id)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm">{report.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(report.date).toLocaleDateString()}
                      </div>
                    </div>
                    {reportSelection.selected.includes(report.id) && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
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
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Select Session Notes */}
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center justify-between">
                <span>Select Session Notes</span>
                <span className="text-sm font-normal text-slate-600">
                  {noteSelection.selected.length} selected
                </span>
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessionNotes.map((note) => (
                  <label
                    key={note.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      noteSelection.selected.includes(note.id)
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={noteSelection.selected.includes(note.id)}
                      onChange={() => noteSelection.toggle(note.id)}
                      className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm">{note.sessionName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(note.createdAt).toLocaleDateString()} • {note.participants.length} participants
                      </div>
                    </div>
                    {noteSelection.selected.includes(note.id) && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
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
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Select Case Files (Optional) */}
          {caseFiles.length > 0 && (
            <div className="bg-gradient-to-br from-[#007A33]/5 to-[#007A33]/10 rounded-lg p-5 border-2 border-[#007A33]/30">
              <div className="flex items-start gap-3 mb-4">
                <FolderOpen className="w-6 h-6 text-[#007A33] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>Select Case Files (Optional Context)</span>
                    <span className="text-sm font-normal text-slate-600">
                      {caseSelection.selected.length} selected
                    </span>
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
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
                        ? 'bg-[#007A33]/10 border-[#007A33]'
                        : 'bg-white border-slate-200 hover:border-[#007A33]/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={caseSelection.selected.includes(caseFile.id)}
                      onChange={() => caseSelection.toggle(caseFile.id)}
                      className="mt-1 w-4 h-4 text-[#007A33] rounded focus:ring-2 focus:ring-[#007A33]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm">{caseFile.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {caseFile.metadata?.caseType && (
                          <span className="px-2 py-0.5 bg-[#007A33]/20 text-[#007A33] rounded font-medium">
                            {caseFile.metadata.caseType}
                          </span>
                        )}
                        <span>{new Date(caseFile.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {caseSelection.selected.includes(caseFile.id) && (
                      <CheckCircle2 className="w-5 h-5 text-[#007A33] flex-shrink-0" />
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
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || reportSelection.selected.length === 0 || noteSelection.selected.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-lg"
          >
            <Sparkles className="w-6 h-6" />
            {generating ? 'Generating Report with Gemini AI...' : 'Generate Post-Session Report'}
          </button>

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

              <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Generated Report</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
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
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed">
                    {generatedReport}
                  </pre>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}