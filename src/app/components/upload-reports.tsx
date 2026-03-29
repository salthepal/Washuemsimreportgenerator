import { useState } from 'react';
import { Upload, Trash2, FileText, Calendar, FileUp, User, AlertCircle, CheckCircle } from 'lucide-react';
import { Report, API_BASE, API_HEADERS } from '../App';
import { toast } from 'sonner';
import mammoth from 'mammoth';
import { useConfirmDialog } from './ui/confirm-dialog';
import { DocumentPreviewModal } from './document-preview-modal';

interface UploadReportsProps {
  reports: Report[];
  onRefresh: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadReports({ reports, onRefresh }: UploadReportsProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [debugging, setDebugging] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Report | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const validateFile = (file: File): string | null => {
    if (!file.name.endsWith('.docx')) {
      return 'Please upload a .docx file';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`;
    }
    if (file.size === 0) {
      return 'File appears to be empty or corrupted';
    }
    return null;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setSelectedFile(file);
    toast.success(`File selected: ${file.name}`);
  };

  const handleDebug = async () => {
    setDebugging(true);
    try {
      const response = await fetch(`${API_BASE}/debug/all-keys`, {
        headers: API_HEADERS,
      });
      const data = await response.json();
      console.log('=== DATABASE DEBUG INFO ===');
      console.log('Total entries:', data.total);
      console.log('All keys:', data.keys);
      const jsonStr = JSON.stringify(data.keys, null, 2);
      console.log('Keys as JSON:', jsonStr);
      
      // Show first 500 chars in alert
      const preview = jsonStr.substring(0, 500);
      confirm({
        title: 'Database Debug Info',
        description: `Database has ${data.total} entries.\n\nFirst entry preview:\n${preview}...`,
        onConfirm: () => {},
        confirmText: 'OK',
      });
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Debug failed - check console');
    } finally {
      setDebugging(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setSelectedFile(file);
    toast.success(`File selected: ${file.name}`);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (!uploaderName.trim() || !sessionName.trim() || !sessionDate) {
      toast.error('Please fill in all fields');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      setUploadProgress(30);
      
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setUploadProgress(50);
      
      // Extract plain text for content field
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.value;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Auto-extract title from first heading or filename
      const firstHeading = tempDiv.querySelector('h1, h2, h3');
      const title = firstHeading?.textContent?.trim() || selectedFile.name.replace('.docx', '');
      
      setUploadProgress(70);
      console.log('Uploading report:', { title, contentLength: plainText.length, htmlLength: result.value.length, sessionDate });
      
      // Upload with metadata
      const response = await fetch(`${API_BASE}/reports/upload`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ 
          title, 
          content: plainText, 
          htmlContent: result.value, 
          date: sessionDate,
          metadata: {
            uploaderName,
            sessionName,
            sessionDate,
          }
        }),
      });

      setUploadProgress(90);
      const responseData = await response.json();
      console.log('Upload response:', response.status, responseData);

      if (response.ok) {
        setUploadProgress(100);
        toast.success(`Report "${title}" uploaded successfully`);
        // Reset form
        setSelectedFile(null);
        setUploaderName('');
        setSessionName('');
        setSessionDate('');
        setUploadProgress(0);
        const fileInput = document.getElementById('docx-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        onRefresh();
      } else {
        console.error('Upload failed:', responseData);
        toast.error(`Failed to upload: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing DOCX:', error);
      toast.error(`Failed to process DOCX file: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    confirm({
      title: 'Delete Report',
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/reports/${id}`, {
            method: 'DELETE',
            headers: API_HEADERS,
          });

          if (response.ok) {
            toast.success('Report deleted successfully');
            onRefresh();
          } else {
            toast.error('Failed to delete report');
          }
        } catch (error) {
          console.error('Delete error:', error);
          toast.error('Failed to delete report');
        }
      },
    });
  };

  const handlePreview = (report: Report) => {
    setPreviewDocument(report);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {dialog}
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDocument}
        type="report"
      />

      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Upload Prior Reports</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          Upload completed Post-Session Reports as DOCX files to preserve formatting. 
          The AI will learn from these reports to match their exact style and structure.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
        {/* Debug Button */}
        <button
          onClick={handleDebug}
          disabled={debugging}
          className="mb-4 px-3 md:px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs md:text-sm font-medium disabled:opacity-50"
        >
          {debugging ? 'Checking Database...' : '🔍 Debug Database'}
        </button>

        {/* Drag and Drop File Upload */}
        <div
          className={`text-center py-8 md:py-12 border-2 border-dashed rounded-lg transition-all bg-white dark:bg-slate-900 mb-4 ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="docx-upload"
          />
          <label
            htmlFor="docx-upload"
            className={`cursor-pointer flex flex-col items-center gap-3 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <FileUp className={`w-12 h-12 md:w-16 md:h-16 transition-colors ${dragActive ? 'text-blue-600' : 'text-blue-600'}`} />
            <div>
              <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedFile ? selectedFile.name : dragActive ? 'Drop file here' : 'Drag & Drop or Click to Select'}
              </p>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedFile ? (
                  <span className="flex items-center gap-1 justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    File selected - fill in details below
                  </span>
                ) : (
                  `DOCX files only, max ${MAX_FILE_SIZE / (1024 * 1024)}MB`
                )}
              </p>
            </div>
          </label>
        </div>

        {/* Upload Progress */}
        {uploading && uploadProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Form Fields */}
        {selectedFile && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Uploader Name
              </label>
              <input
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 md:px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm md:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Session Name
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Cardiac Arrest Simulation"
                className="w-full px-3 md:px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm md:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Session Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 md:px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm md:text-base"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading... {uploadProgress}%
                </>
              ) : (
                'Upload Report'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Reports List */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Prior Reports Library ({reports.length})
        </h3>
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <FileText className="w-10 h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">No prior reports uploaded yet</p>
              <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 mt-1">
                Upload your first report to get started
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePreview(report)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 mb-1 truncate">{report.title}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      {report.metadata?.uploaderName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">{report.metadata.uploaderName}</span>
                        </span>
                      )}
                      {report.metadata?.sessionName && (
                        <span className="truncate">{report.metadata.sessionName}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        {new Date(report.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                      {report.content.substring(0, 150)}...
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(report.id, report.title);
                    }}
                    className="ml-2 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}