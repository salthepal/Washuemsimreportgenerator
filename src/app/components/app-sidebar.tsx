import { LayoutDashboard, UploadCloud, FileStack, ClipboardPaste, Wand2, ShieldAlert, Database, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from './ui/utils';

export interface SidebarItem {
  value: string;
  label: string;
  icon: React.ReactNode;
  className?: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, className: 'dashboard-tab' },
  { value: 'upload', label: 'Upload', icon: <UploadCloud className="w-5 h-5" />, className: 'upload-tab' },
  { value: 'cases', label: 'Cases', icon: <FileStack className="w-5 h-5" />, className: 'cases-tab' },
  { value: 'notes', label: 'Notes', icon: <ClipboardPaste className="w-5 h-5" />, className: 'notes-tab' },
  { value: 'generate', label: 'Generate', icon: <Wand2 className="w-5 h-5" />, className: 'generate-tab' },
  { value: 'lst-tracker', label: 'LST Tracker', icon: <ShieldAlert className="w-5 h-5" />, className: 'lst-tracker-tab' },
  { value: 'repository', label: 'Repository', icon: <Database className="w-5 h-5" />, className: 'repository-tab' },
  { value: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, className: 'settings-tab' },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobile?: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ activeTab, onTabChange, collapsed, onCollapsedChange, mobile, open, onClose }: AppSidebarProps) {
  const handleClick = (value: string) => {
    onTabChange(value);
    if (mobile && onClose) onClose();
  };

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-3">
      <div className={cn("flex items-center mb-2", collapsed ? "justify-center" : "justify-between px-2")}>
        {!collapsed && <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Navigation</span>}
        {!mobile && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>
      {SIDEBAR_ITEMS.map((item) => (
        <button
          key={item.value}
          onClick={() => handleClick(item.value)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
            item.className,
            collapsed && !mobile && 'justify-center px-2',
            activeTab === item.value
              ? 'bg-[#A51417] text-white shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
          )}
          title={collapsed ? item.label : undefined}
        >
          {item.icon}
          {(!collapsed || mobile) && <span>{item.label}</span>}
        </button>
      ))}
    </nav>
  );

  // Mobile: overlay drawer
  if (mobile) {
    return (
      <>
        {open && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
        )}
        <aside
          className={cn(
            'fixed top-0 left-0 z-50 h-full w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Menu</span>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        'sticky top-0 h-screen flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-200 overflow-y-auto',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
