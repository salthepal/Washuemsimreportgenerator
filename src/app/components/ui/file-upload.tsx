/**
 * Reusable file upload component with drag-and-drop
 */
import { useState } from 'react';
import { FolderOpen, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: string;
  maxSize: number;
  disabled?: boolean;
  selectedFile?: File | null;
  validateFile?: (file: File) => string | null;
  id: string;
}

export function FileUpload({
  onFileSelect,
  accept,
  maxSize,
  disabled = false,
  selectedFile = null,
  validateFile,
  id,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

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

    if (validateFile) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }

    onFileSelect(file);
    toast.success(`File selected: ${file.name}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (validateFile) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }

    onFileSelect(file);
    toast.success(`File selected: ${file.name}`);
  };

  const maxSizeMB = maxSize / (1024 * 1024);

  return (
    <div
      className={`text-center py-8 md:py-12 border-2 border-dashed rounded-lg transition-all bg-white dark:bg-slate-900 ${
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
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        id={id}
      />
      <label
        htmlFor={id}
        className={`cursor-pointer flex flex-col items-center gap-3 ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <FolderOpen
          className={`w-12 h-12 md:w-16 md:h-16 transition-colors ${
            dragActive ? 'text-[#007A33]' : 'text-[#007A33]'
          }`}
        />
        <div>
          <p className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
            {selectedFile
              ? selectedFile.name
              : dragActive
              ? 'Drop file here'
              : 'Drag & Drop or Click to Select File'}
          </p>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {selectedFile ? (
              <span className="flex items-center gap-1 justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
                File selected - ready to upload
              </span>
            ) : (
              `${accept.toUpperCase().replace('.', '')} files only, max ${maxSizeMB}MB`
            )}
          </p>
        </div>
      </label>
    </div>
  );
}
