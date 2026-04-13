import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Report, SessionNote, CaseFile } from '../types';

interface MetadataEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, payload: any) => Promise<void>;
  document: Report | SessionNote | CaseFile | null;
  type: 'report' | 'note' | 'case';
}

export function MetadataEditModal({ isOpen, onClose, onSave, document, type }: MetadataEditModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document) {
      if (type === 'note') {
        const d = document as SessionNote;
        setTitle(d.sessionName || '');
        setDate(d.createdAt || '');
      } else {
        const d = document as Report | CaseFile;
        setTitle(d.title || '');
        setDate(d.date || d.createdAt || '');
      }
      setUploaderName(document.metadata?.uploaderName || '');
      if (type === 'case') {
        setCaseType((document as CaseFile).metadata?.caseType || '');
      }
    }
  }, [document, type, isOpen]);

  const formatForInput = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  const handleSave = async () => {
    if (!document) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (type === 'note') {
        payload.sessionName = title;
        payload.created_at = date;
      } else if (type === 'report') {
        payload.title = title;
        payload.created_at = date;
      } else {
        payload.title = title;
        payload.date = date;
        payload.uploader_name = uploaderName;
        payload.case_type = caseType;
      }
      
      // Update metadata blob for consistency where applicable
      if (type !== 'case') {
        payload.metadata = {
          ...document.metadata,
          uploaderName: uploaderName || document.metadata?.uploaderName,
          sessionName: type === 'note' ? title : document.metadata?.sessionName,
          sessionDate: date
        };
      }

      await onSave(document.id, payload);
      onClose();
    } catch (error) {
      console.error('Failed to save metadata:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Edit {type.charAt(0).toUpperCase() + type.slice(1)} Metadata
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {type === 'note' ? 'Session Name' : 'Title'}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter name"
              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Date & Time
            </Label>
            <Input
              id="date"
              type="datetime-local"
              value={formatForInput(date)}
              onChange={(e) => setDate(new Date(e.target.value).toISOString())}
              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-inner"
            />
          </div>
          {type === 'case' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="uploader" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Uploader Name</Label>
                <Input
                  id="uploader"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Optional"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="caseType" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Case Type</Label>
                <Input
                  id="caseType"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  placeholder="e.g. Cardiac Arrest"
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-slate-300 dark:border-slate-600">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !title}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
