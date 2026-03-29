import { Step } from 'react-joyride';

export const TOUR_STEPS: Step[] = [
  {
    target: '.dashboard-tab',
    content: 'View analytics and summaries of all your post-session reports and notes.',
    title: 'Dashboard Overview',
  },
  {
    target: '.upload-tab',
    content: 'Upload past post-session reports to establish your writing style and report structure.',
    title: 'Upload Past Reports',
  },
  {
    target: '.notes-tab',
    content: 'Enter or import session observations, debriefing notes, and facilitator comments.',
    title: 'Session Notes',
  },
  {
    target: '.generate-tab',
    content: 'Generate new reports that mirror your established style while incorporating new session insights.',
    title: 'Generate Report',
  },
  {
    target: '.repository-tab',
    content: 'Search, filter, and manage all your reports and session notes.',
    title: 'Repository',
  },
  {
    target: '.settings-tab',
    content: 'Manage templates, backups, and system settings.',
    title: 'Settings',
  },
];

export const KEYBOARD_SHORTCUTS = [
  { label: 'Start Tour', key: 'T' },
  { label: 'Quick Generate', key: 'Ctrl+G' },
  { label: 'Upload', key: 'Ctrl+U' },
  { label: 'Search', key: 'Ctrl+F' },
] as const;
