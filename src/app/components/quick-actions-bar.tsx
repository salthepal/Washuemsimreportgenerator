import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Upload, FileDown, Plus, X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface QuickActionsBarProps {
  onQuickGenerate: () => void;
  onQuickUpload: () => void;
  onExportAll: () => void;
  onNewNote: () => void;
}

export function QuickActionsBar({
  onQuickGenerate,
  onQuickUpload,
  onExportAll,
  onNewNote,
}: QuickActionsBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Sparkles, label: 'Quick Generate', onClick: onQuickGenerate, color: 'bg-[#A51417] hover:bg-[#8B1113]' },
    { icon: Upload, label: 'Upload', onClick: onQuickUpload, color: 'bg-[#007A33] hover:bg-[#006629]' },
    { icon: FileDown, label: 'Export All', onClick: onExportAll, color: 'bg-slate-600 hover:bg-slate-700' },
    { icon: Plus, label: 'New Note', onClick: onNewNote, color: 'bg-slate-700 hover:bg-slate-800' },
  ];

  return (
    <TooltipProvider>
      <div className="fixed bottom-8 right-8 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col gap-2 mb-4"
            >
              {actions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        className={`h-12 w-12 rounded-full shadow-lg ${action.color} text-white`}
                        onClick={() => {
                          action.onClick();
                          setIsOpen(false);
                        }}
                      >
                        <action.icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>{action.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          size="icon"
          className={`h-14 w-14 rounded-full shadow-xl transition-all ${
            isOpen ? 'bg-red-500 hover:bg-red-600 rotate-45' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          } text-white`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
        </Button>
      </div>
    </TooltipProvider>
  );
}