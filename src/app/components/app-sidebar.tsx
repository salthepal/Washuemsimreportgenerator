import { LayoutDashboard, UploadCloud, FileStack, ClipboardPaste, Wand2, ShieldAlert, Database, Settings, PanelLeftClose, PanelLeft, Hospital, ChevronDown } from 'lucide-react';
import { cn } from './ui/utils';
import { useState, useRef, useEffect } from 'react';

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
  selectedSite?: string;
  onSiteChange?: (site: string) => void;
  availableSites?: string[];
}

function SiteSelector({ selectedSite, onSiteChange, availableSites, collapsed }: {
  selectedSite: string;
  onSiteChange: (site: string) => void;
  availableSites: string[];
  collapsed?: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (collapsed) {
    return (
      <div className="px-2 mb-2" ref={ref}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'w-full flex items-center justify-center p-2 rounded-lg transition-colors',
            selectedSite !== 'All Sites'
              ? 'bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
          title={`Site: ${selectedSite}`}
          aria-label="Select hospital site"
        >
          <Hospital className="w-5 h-5" />
        </button>
        {dropdownOpen && (
          <div className="absolute left-14 top-auto z-50 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 mt-1">
            {availableSites.map(site => (
              <button
                key={site}
                onClick={() => { onSiteChange(site); setDropdownOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  selectedSite === site
                    ? 'bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                {site}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 mb-2" ref={ref}>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-1">
        <Hospital className="w-3.5 h-3.5" />
        Hospital Site
      </label>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
          selectedSite !== 'All Sites'
            ? 'border-[#007A33]/30 bg-[#007A33]/5 text-[#007A33] dark:border-[#007A33]/40 dark:bg-[#007A33]/10 dark:text-emerald-400'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        )}
        aria-label="Select hospital site"
      >
        <span className="truncate font-medium">{selectedSite}</span>
        <ChevronDown className={cn('w-4 h-4 flex-shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
      </button>
      {dropdownOpen && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
            {availableSites.map(site => (
              <button
                key={site}
                onClick={() => { onSiteChange(site); setDropdownOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  selectedSite === site
                    ? 'bg-[#007A33]/10 text-[#007A33] dark:bg-[#007A33]/20 dark:text-emerald-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                {site}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({ activeTab, onTabChange, collapsed, onCollapsedChange, mobile, open, onClose, selectedSite, onSiteChange, availableSites }: AppSidebarProps) {
  const handleClick = (value: string) => {
    onTabChange(value);
    if (mobile && onClose) onClose();
  };

  const showSiteSelector = selectedSite && onSiteChange && availableSites && availableSites.length > 1;

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

      {/* Site Selector */}
      {showSiteSelector && (
        <SiteSelector
          selectedSite={selectedSite}
          onSiteChange={onSiteChange}
          availableSites={availableSites}
          collapsed={collapsed && !mobile}
        />
      )}

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
