import { useState } from 'react';
import { Upload, Trash2, FileText, Calendar, FileUp, User, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { CaseFile, API_BASE, API_HEADERS } from '../App';
import { toast } from 'sonner';
import { useConfirmDialog } from './ui/confirm-dialog';
import { DocumentPreviewModal } from './document-preview-modal';

interface CaseFilesProps {
  caseFiles: CaseFile[];
  onRefresh: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CaseFiles({ caseFiles, onRefresh }: CaseFilesProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaderName, setUploaderName] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const validateFile = (file: File): string | null => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      return 'Please upload a .txt, .pdf, or .docx file';
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('case-file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    toast.info('File removed');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (!caseDescription.trim()) {
      toast.error('Please enter a case description');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    
    try {
      // Read file as text
      let content = '';
      if (selectedFile.name.endsWith('.txt')) {
        content = await selectedFile.text();
      } else {
        // For PDF and DOCX, we'll read as text for now (server can handle parsing if needed)
        content = await selectedFile.text();
      }
      
      setUploadProgress(50);
      console.log('Uploading case file:', { fileName: selectedFile.name, contentLength: content.length });
      
      // Upload with metadata - no need to escape, JSON.stringify handles it
      const response = await fetch(`${API_BASE}/case_files/upload`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ 
          fileName: selectedFile.name,
          content, 
          metadata: {
            uploaderName: uploaderName.trim() || 'Anonymous',
            description: caseDescription,
          }
        }),
      });

      setUploadProgress(90);
      const responseData = await response.json();
      console.log('Upload response:', response.status, responseData);

      if (response.ok) {
        setUploadProgress(100);
        toast.success(`Case file "${selectedFile.name}" uploaded successfully`);
        // Reset form
        setSelectedFile(null);
        setUploaderName('');
        setCaseDescription('');
        setUploadProgress(0);
        const fileInput = document.getElementById('case-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        onRefresh();
      } else {
        console.error('Upload failed:', responseData);
        toast.error(`Failed to upload: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process file: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    confirm({
      title: 'Delete Case File',
      description: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/case_files/${id}`, {
            method: 'DELETE',
            headers: API_HEADERS,
          });

          if (response.ok) {
            toast.success('Case file deleted successfully');
            onRefresh();
          } else {
            const error = await response.text();
            toast.error(`Failed to delete: ${error}`);
          }
        } catch (error) {
          console.error('Delete error:', error);
          toast.error('Failed to delete case file');
        }
      },
    });
  };

  const handlePreview = (caseFile: CaseFile) => {
    setPreviewDocument({
      id: caseFile.id,
      title: caseFile.fileName,
      content: caseFile.content,
      date: caseFile.uploadDate,
      type: 'case_file',
      createdAt: caseFile.createdAt,
    });
    setPreviewOpen(true);
  };

  // Character counts
  const descriptionCharCount = caseDescription.length;

  return (
    <div className="space-y-4 md:space-y-6">
      {dialog}
      <DocumentPreviewModal
        document={previewDocument}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Case Files</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300">
          Upload case files (patient scenarios, clinical cases) that provide context for report generation
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 md:p-6 border-2 border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FileUp className="w-4 h-4 md:w-5 md:h-5 text-[#007A33]" />
          Upload New Case File
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <User className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
              Your Name (optional)
            </label>
            <input
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="Enter your name (optional)"
              className="w-full px-3 py-2 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#A51417] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <FileText className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
              Case Description *
            </label>
            <input
              type="text"
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              placeholder="Brief description of the case"
              className="w-full px-3 py-2 text-sm md:text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#A51417] focus:border-transparent dark:bg-slate-700 dark:text-slate-100"
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {descriptionCharCount} characters
            </div>
          </div>
        </div>

        {/* Drag and Drop Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-colors ${
            dragActive
              ? 'border-[#A51417] bg-red-50 dark:bg-red-900/10'
              : 'border-slate-300 dark:border-slate-600 hover:border-[#007A33] hover:bg-green-50 dark:hover:bg-green-900/10'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-slate-400" />
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-2">
            Drag and drop your case file here, or click to browse
          </p>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-4">
            Supported formats: .txt, .pdf, .docx (max {MAX_FILE_SIZE / (1024 * 1024)}MB)
          </p>
          <input
            id="case-file-upload"
            type="file"
            accept=".txt,.pdf,.docx"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {selectedFile && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between gap-2 text-sm md:text-base text-green-800 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-xs md:text-sm">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {uploadProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs md:text-sm text-slate-600 dark:text-slate-300">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-[#A51417] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-[#A51417] to-[#8B0F12] text-white rounded-lg hover:from-[#8B0F12] hover:to-[#A51417] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md text-sm md:text-base font-medium"
          >
            {uploading ? 'Uploading...' : 'Upload Case File'}
          </button>
        </div>
      </div>

      {/* Case Files List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 md:p-6 border-2 border-slate-200 dark:border-slate-700">
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 md:w-5 md:h-5 text-[#007A33]" />
          Uploaded Case Files ({caseFiles.length})
        </h3>

        {caseFiles.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <FileText className="w-12 h-12 md:w-16 md:h-16 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">No case files uploaded yet</p>
            <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 mt-1">
              Upload case files to provide context for AI-generated reports
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {caseFiles.map((caseFile) => (
              <div
                key={caseFile.id}
                className="p-3 md:p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 truncate mb-1">
                      {caseFile.fileName}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {caseFile.metadata?.uploaderName || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(caseFile.uploadDate).toLocaleDateString()}
                      </span>
                      {caseFile.metadata?.description && (
                        <span className="text-xs italic">
                          {caseFile.metadata.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handlePreview(caseFile)}
                      className="p-1.5 md:p-2 text-[#007A33] hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(caseFile.id, caseFile.fileName)}
                      className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">About Case Files</p>
            <p>
              Case files provide clinical context and scenarios that the AI can reference when generating reports.
              They help ensure the generated reports are relevant to the specific cases discussed in your simulation sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}