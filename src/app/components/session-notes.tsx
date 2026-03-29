import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Users, Calendar, User, Save, Eye } from 'lucide-react';
import { SessionNote, API_BASE, API_HEADERS } from '../App';
import { toast } from 'sonner';
import { useConfirmDialog } from './ui/confirm-dialog';
import { DocumentPreviewModal } from './document-preview-modal';

interface SessionNotesProps {
  sessionNotes: SessionNote[];
  onRefresh: () => void;
}

const MIN_RECOMMENDED_WORDS = 100;
const MIN_RECOMMENDED_CHARS = 500;

export function SessionNotes({ sessionNotes, onRefresh }: SessionNotesProps) {
  const [uploaderName, setUploaderName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<SessionNote | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  // Calculate word and character counts
  const wordCount = notes.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = notes.length;
  const isMinimumMet = wordCount >= MIN_RECOMMENDED_WORDS && charCount >= MIN_RECOMMENDED_CHARS;

  // Auto-save to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (notes.trim() || sessionName.trim() || uploaderName.trim()) {
      setAutoSaving(true);
      localStorage.setItem('sessionNotesDraft', JSON.stringify({
        uploaderName,
        sessionName,
        sessionDate,
        notes,
        savedAt: new Date().toISOString(),
      }));
      setLastSaved(new Date());
      setTimeout(() => setAutoSaving(false), 500);
    }
  }, [uploaderName, sessionName, sessionDate, notes]);

  // Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveToLocalStorage();
    }, 10000);
    return () => clearInterval(interval);
  }, [saveToLocalStorage]);

  // Restore from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('sessionNotesDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.notes || parsed.sessionName) {
          confirm({
            title: 'Restore Draft',
            description: `Found unsaved session notes from ${new Date(parsed.savedAt).toLocaleString()}. Would you like to restore them?`,
            confirmText: 'Restore',
            onConfirm: () => {
              setUploaderName(parsed.uploaderName || '');
              setSessionName(parsed.sessionName || '');
              setSessionDate(parsed.sessionDate || '');
              setNotes(parsed.notes || '');
              toast.success('Draft restored');
            },
          });
        }
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploaderName.trim() || !sessionName.trim() || !sessionDate || !notes.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isMinimumMet) {
      confirm({
        title: 'Short Notes Detected',
        description: `Your notes are below the recommended minimum of ${MIN_RECOMMENDED_WORDS} words. More detailed notes help the AI generate better reports. Continue anyway?`,
        confirmText: 'Continue',
        onConfirm: () => submitNotes(),
      });
      return;
    }

    await submitNotes();
  };

  const submitNotes = async () => {
    setAdding(true);
    try {
      const response = await fetch(`${API_BASE}/notes/add`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ 
          sessionName, 
          notes, 
          participants: [],
          tags: [],
          metadata: {
            uploaderName,
            sessionDate,
          }
        }),
      });

      if (response.ok) {
        toast.success('Session notes added successfully');
        // Clear form and localStorage
        setUploaderName('');
        setSessionName('');
        setSessionDate('');
        setNotes('');
        setLastSaved(null);
        localStorage.removeItem('sessionNotesDraft');
        onRefresh();
      } else {
        const error = await response.text();
        console.error('Add notes error:', error);
        toast.error('Failed to add session notes');
      }
    } catch (error) {
      console.error('Add notes error:', error);
      toast.error('Failed to add session notes');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, sessionName: string) => {
    confirm({
      title: 'Delete Session Notes',
      description: `Are you sure you want to delete notes for "${sessionName}"? This action cannot be undone.`,
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE}/notes/${id}`, {
            method: 'DELETE',
            headers: API_HEADERS,
          });

          if (response.ok) {
            toast.success('Session notes deleted successfully');
            onRefresh();
          } else {
            toast.error('Failed to delete session notes');
          }
        } catch (error) {
          console.error('Delete error:', error);
          toast.error('Failed to delete session notes');
        }
      },
    });
  };

  const handlePreview = (note: SessionNote) => {
    setPreviewDocument(note);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {dialog}
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDocument}
        type="note"
      />

      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Simulation Session Notes</h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
          Add notes from your simulation sessions for report generation.
        </p>
      </div>

      {/* Add Notes Form */}
      <form onSubmit={handleAdd} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
        {/* Auto-save indicator */}
        {lastSaved && (
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            {autoSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Saving draft...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-green-600" />
                <span>Draft saved at {lastSaved.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        )}

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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Session Notes
              </label>
              <div className="flex items-center gap-3 text-xs">
                <span className={`font-medium ${isMinimumMet ? 'text-green-600' : 'text-amber-600'}`}>
                  {wordCount} words • {charCount} chars
                </span>
                {!isMinimumMet && (
                  <span className="text-amber-600">
                    (Minimum {MIN_RECOMMENDED_WORDS} words recommended)
                  </span>
                )}
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste all notes from this simulation session, including observations from all participants..."
              rows={10}
              className="w-full px-3 md:px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs md:text-sm"
            />
            {!isMinimumMet && notes.length > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                More detailed notes help generate higher quality reports. Consider adding more observations, specific examples, and details.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={adding}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
          >
            {adding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                Add Session Notes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Session Notes List */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Session Notes ({sessionNotes.length})
        </h3>
        <div className="space-y-3">
          {sessionNotes.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <Users className="w-10 h-10 md:w-12 md:h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">No session notes added yet</p>
              <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 mt-1">
                Add notes from your first in-situ simulation session
              </p>
            </div>
          ) : (
            sessionNotes.map((note) => {
              const noteWordCount = note.notes.trim().split(/\s+/).filter(w => w.length > 0).length;
              return (
                <div
                  key={note.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePreview(note)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm md:text-base text-slate-900 dark:text-slate-100 mb-1 truncate">{note.sessionName}</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-2">
                        {note.metadata?.uploaderName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="truncate">{note.metadata.uploaderName}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          {note.metadata?.sessionDate 
                            ? new Date(note.metadata.sessionDate).toLocaleDateString()
                            : new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {noteWordCount} words
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                        {note.notes.substring(0, 200)}...
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(note);
                        }}
                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex-shrink-0"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id, note.sessionName);
                        }}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}