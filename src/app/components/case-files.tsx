import { useState } from 'react';
import { Upload, Trash2, Calendar, Eye, FolderOpen, User, CheckCircle } from 'lucide-react';
import { API_BASE, API_HEADERS } from '../App';
import { toast } from 'sonner';
import { useConfirmDialog } from './ui/confirm-dialog';
import { DocumentPreviewModal } from './document-preview-modal';
import { FormField } from './ui/form-field';
import { ActionButton } from './ui/action-button';
import { processDocxFile, formatDate } from '../utils/document';
import { validateDocxFile } from '../utils/validation';
import { sanitizeJSON } from '../utils/sanitize';

export interface CaseFile {
  id: string;
  title: string;
  content: string;
  htmlContent?: string;
  date: string;
  type: 'case_file';
  createdAt: string;
  tags?: string[];
  metadata?: {
    uploaderName?: string;
    caseType?: string;
    uploadDate?: string;
    scenario?: string;
  };
}

interface CaseFilesProps {
  caseFiles: CaseFile[];
  onRefresh: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CaseFiles({ caseFiles, onRefresh }: CaseFilesProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaderName, setUploaderName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<CaseFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

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

    const error = validateDocxFile(file);
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

    const error = validateDocxFile(file);
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

    setUploading(true);
    setUploadProgress(10);
    
    try {
      setUploadProgress(30);
      
      const processed = await processDocxFile(selectedFile);
      setUploadProgress(70);
      
      console.log('Uploading case file:', { 
        title: processed.title, 
        contentLength: processed.content.length, 
        htmlLength: processed.htmlContent.length 
      });
      
      // Sanitize data before sending
      const payload = sanitizeJSON({
        title: processed.title,
        content: processed.content,
        htmlContent: processed.htmlContent,
        date: new Date().toISOString(),
        metadata: {
          uploaderName,
          caseType,
        }
      });
      
      // Upload with metadata
      const response = await fetch(`${API_BASE}/case-files/upload`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });

      setUploadProgress(90);
      const responseData = await response.json();
      console.log('Upload response:', response.status, responseData);

      if (response.ok) {
        setUploadProgress(100);
        toast.success(`Case file "${processed.title}" uploaded successfully`);
        // Reset form
        setSelectedFile(null);
        setUploaderName('');
        setCaseType('');
        setUploadProgress(0);
        const fileInput = document.getElementById('case-file-upload') as HTMLInputElement;
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
      title: 'Delete Case File',
      description: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/case-files/${id}`, {
            method: 'DELETE',
            headers: API_HEADERS,
          });

          if (response.ok) {
            toast.success('Case file deleted successfully');
            onRefresh();
          } else {
            toast.error('Failed to delete case file');
          }
        } catch (error) {
          console.error('Delete error:', error);
          toast.error('Failed to delete case file');
        }
      },
    });
  };

  const handlePreview = (caseFile: CaseFile) => {
    setPreviewDocument(caseFile);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {dialog}
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDocument}
        type="case"
      />

      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Case Files</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          Upload simulation case files (patient scenarios) as DOCX files. 
          The AI will use these as context when generating reports to ensure accurate case details.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
        {/* Drag and Drop File Upload */}
        <div
          className={`text-center py-8 md:py-12 border-2 border-dashed rounded-lg transition-all bg-white dark:bg-slate-900 mb-4 ${
            dragActive
              ? 'border-[#007A33] bg-green-50 dark:bg-green-900/20 scale-105'
              : 'border-slate-300 dark:border-slate-600 hover:border-[#007A33]'
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
            id="case-file-upload"
          />
          <label
            htmlFor="case-file-upload"
            className={`cursor-pointer flex flex-col items-center gap-3 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <FolderOpen className={`w-12 h-12 md:w-16 md:h-16 transition-colors ${dragActive ? 'text-[#007A33]' : 'text-[#007A33]'}`} />
            <div>
              <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                {selectedFile ? selectedFile.name : dragActive ? 'Drop case file here' : 'Drag & Drop or Click to Select Case File'}
              </p>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedFile ? (
                  <span className="flex items-center gap-1 justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    File selected - ready to upload
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
                className="bg-[#007A33] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Form Fields */}
        {selectedFile && (
          <div className="space-y-4">
            <FormField
              label="Uploader Name"
              placeholder="Enter your name"
              value={uploaderName}
              onChange={setUploaderName}
              optional
            />

            <FormField
              label="Case Type / Scenario"
              placeholder="e.g., Cardiac Arrest, Respiratory Failure, Trauma"
              value={caseType}
              onChange={setCaseType}
              optional
            />

            <ActionButton
              onClick={handleUpload}
              disabled={uploading}
              loading={uploading}
              variant="success"
              fullWidth
              icon={<Upload className="w-4 h-4 md:w-5 md:h-5" />}
            >
              Upload Case File
            </ActionButton>
          </div>
        )}
      </div>

      {/* Case Files List */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Case Files Library ({caseFiles.length})
        </h3>
        <div className="space-y-3">
          {caseFiles.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <FolderOpen className="w-10 h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">No case files uploaded yet</p>
              <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 mt-1">
                Upload your first case file to provide context for AI-generated reports
              </p>
            </div>
          ) : (
            caseFiles.map((caseFile) => (
              <div
                key={caseFile.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePreview(caseFile)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 mb-1 truncate">{caseFile.title}</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      {caseFile.metadata?.uploaderName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          <span className="truncate">{caseFile.metadata.uploaderName}</span>
                        </span>
                      )}
                      {caseFile.metadata?.caseType && (
                        <span className="px-2 py-0.5 bg-[#007A33]/10 text-[#007A33] rounded text-xs font-medium">
                          {caseFile.metadata.caseType}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        {formatDate(caseFile.date)}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                      {caseFile.content.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(caseFile);
                      }}
                      className="text-[#007A33] hover:text-[#006629] p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex-shrink-0"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(caseFile.id, caseFile.title);
                      }}
                      className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}