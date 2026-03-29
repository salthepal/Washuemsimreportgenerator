import { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Download, Copy, Lightbulb, Target, Star } from 'lucide-react';
import { Report, SessionNote, CaseFile, API_BASE, API_HEADERS } from '../App';
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
  const caseFileSelection = useSelection<string>();
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [similarReports, setSimilarReports] = useState<Report[]>([]);
  const [recommendations, setRecommendations] = useState<Report[]>([]);

  // Memoized selections
  const selectedReportsList = useMemo(() => 
    reports.filter(r => reportSelection.selected.includes(r.id)), 
    [reports, reportSelection.selected]
  );

  const selectedNotesList = useMemo(() => 
    sessionNotes.filter(n => noteSelection.selected.includes(n.id)), 
    [sessionNotes, noteSelection.selected]
  );

  const selectedCaseFilesList = useMemo(() => 
    caseFiles.filter(cf => caseFileSelection.selected.includes(cf.id)), 
    [caseFiles, caseFileSelection.selected]
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
    setQualityScore(null);
    setSuggestedTags([]);
    setSimilarReports([]);
    
    try {
      const response = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          selectedReports: reportSelection.selected,
          selectedNotes: noteSelection.selected,
          selectedCaseFiles: caseFileSelection.selected,
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

        // Calculate quality score
        try {
          const scoreResponse = await fetch(`${API_BASE}/score-quality`, {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ content: reportContent }),
          });
          if (scoreResponse.ok) {
            const scoreData = await scoreResponse.json();
            setQualityScore(scoreData.score || 0);
          }
        } catch (err) {
          console.error('Failed to calculate quality score:', err);
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
      // Parse the text content into structured paragraphs
      const lines = generatedReport.split('\n');
      const children: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
          // Add spacing for empty lines
          children.push(new Paragraph({ text: '' }));
          continue;
        }

        // Detect headings based on patterns
        // All caps lines are likely section headers
        if (line === line.toUpperCase() && line.length > 3 && line.length < 100) {
          children.push(
            new Paragraph({
              text: line,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
            })
          );
        }
        // Lines ending with colon are likely subheadings
        else if (line.endsWith(':') && !line.includes('  ')) {
          children.push(
            new Paragraph({
              text: line,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
        }
        // Bullet points
        else if (line.match(/^[•\-\*]\s+/)) {
          children.push(
            new Paragraph({
              text: line.replace(/^[•\-\*]\s+/, ''),
              bullet: { level: 0 },
            })
          );
        }
        // Numbered lists
        else if (line.match(/^\d+[\.\)]\s+/)) {
          children.push(
            new Paragraph({
              text: line.replace(/^\d+[\.\)]\s+/, ''),
              numbering: { reference: 'default-numbering', level: 0 },
            })
          );
        }
        // Regular paragraphs
        else {
          const textRuns: TextRun[] = [];
          
          // Simple bold detection for **text** or ALL CAPS words
          const parts = line.split(/(\*\*[^*]+\*\*|\b[A-Z]{4,}\b)/);
          parts.forEach(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
              textRuns.push(new TextRun({ text: part.slice(2, -2), bold: true }));
            } else if (part.match(/^[A-Z]{4,}$/)) {
              textRuns.push(new TextRun({ text: part, bold: true }));
            } else if (part) {
              textRuns.push(new TextRun(part));
            }
          });

          children.push(
            new Paragraph({
              children: textRuns.length > 0 ? textRuns : [new TextRun(line)],
              spacing: { after: 120 },
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
                  top: 1440,
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
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
          <div className="grid md:grid-cols-3 gap-6">
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

            {/* Select Case Files (Optional) */}
            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center justify-between">
                <span>Select Case Files <span className="text-sm font-normal text-slate-500"> (Optional)</span></span>
                <span className="text-sm font-normal text-slate-600">
                  {caseFileSelection.selected.length} selected
                </span>
              </h3>
              {caseFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <p className="mb-2">No case files uploaded</p>
                  <p className="text-xs">Upload case files in the Upload tab for additional context</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {caseFiles.map((caseFile) => (
                      <label
                        key={caseFile.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          caseFileSelection.selected.includes(caseFile.id)
                            ? 'bg-purple-50 border-purple-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={caseFileSelection.selected.includes(caseFile.id)}
                          onChange={() => caseFileSelection.toggle(caseFile.id)}
                          className="mt-1 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-sm">{caseFile.fileName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {new Date(caseFile.uploadDate).toLocaleDateString()}
                          </div>
                        </div>
                        {caseFileSelection.selected.includes(caseFile.id) && (
                          <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={() => caseFileSelection.selectAll(caseFiles.map(cf => cf.id))}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={caseFileSelection.deselectAll}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      Deselect All
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

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
              {(qualityScore !== null || suggestedTags.length > 0 || similarReports.length > 0) && (
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Quality Score */}
                  {qualityScore !== null && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-900">Quality Score</h4>
                      </div>
                      <div className="text-3xl font-bold text-purple-600">{qualityScore}/100</div>
                      <p className="text-sm text-purple-700 mt-1">
                        {qualityScore >= 80 ? 'Excellent' : qualityScore >= 60 ? 'Good' : 'Needs improvement'}
                      </p>
                    </div>
                  )}

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