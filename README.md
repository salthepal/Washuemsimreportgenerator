# WashU Emergency Medicine: Simulation & Safety Intelligence Platform

**Version 1.0.0** - Comprehensive Intelligence Platform for Post-Session Report Generation & LST Management

![WashU Colors](https://img.shields.io/badge/WashU-PMS%20200%20%7C%20PMS%20350-A51417)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Build](https://img.shields.io/badge/build-26%20optimizations-success)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-success)

## Overview

A comprehensive web application designed for Washington University Emergency Medicine simulation programs to streamline post-session report generation and track Latent Safety Threats (LSTs). Built with AI-powered intelligence using Google's Gemini 3.0 Flash Experimental model, this platform enables efficient documentation workflows for bedside clinical use.

## 🚀 Key Features

### Core Capabilities
- **AI-Powered Report Generation** - Synthesize professional reports from session notes using Gemini 3.0 Flash Experimental
- **LST Intelligence** - Track, manage, and resolve system gaps with severity, location, and recurrence monitoring
- **Workflow Automation** - Batch operations, audit logging, and streamlined document management
- **Style Guide Training** - Upload past reports to establish consistent writing patterns

### User Experience
- **Dark Mode** - Full WCAG AA compliant accessibility with theme persistence
- **Horizontal Scroll Tabs** - Optimized for bedside tablet use
- **3 Export Formats** - Copy to clipboard, DOCX download, and PDF export
- **Responsive Design** - Mobile and desktop optimized
- **Skeleton Loading** - Instant UI with background data loading

### Data Management
- **7 Main Tabs**: Dashboard, Upload, Cases, Notes, Generate, LST Tracker, Repository, Settings
- **Advanced Filtering** - Search by tags, metadata, date ranges, and custom fields
- **Backup & Restore** - Full data export/import capabilities
- **Audit Logging** - Complete action history tracking
- **React Query State Management** - Extensively cached data layer prioritizing background syncing and stale-time caching.

## 🛠️ Technology Stack

- **Frontend**: React 18.3.1 + TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI Components
- **AI Model**: Google Gemini 3.0 Flash Experimental
- **Backend/State**: Supabase Edge Functions + TanStack React Query
- **Database**: Supabase PostgreSQL with KV Store
- **Build Tool**: Vite 6.3.5
- **Routing**: React Router (HashRouter Mode for static hosts)
- **Deployment**: GitHub Pages

## 📦 Installation

### Prerequisites
- Node.js 18+ or Bun
- Supabase Account (for backend functionality)
- Google Gemini API Key
- GitHub Account (for deployment)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/washusimintelligence.git
cd washusimintelligence
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the following SQL in the SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_kv_store_key ON kv_store_7fe18c53(key);
```

4. **Configure environment variables**
   - The app will prompt you to enter:
     - `GEMINI_API_KEY` - Your Google Gemini API key ([Get it here](https://ai.google.dev/))
     - Supabase credentials (URL, Anon Key, Service Role Key) - Available in your Supabase project settings

5. **Run development server**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

## 🌐 GitHub Pages Deployment

This project is configured for GitHub Pages deployment at `/washusimintelligence/`.

### Automated Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Manual Deployment Steps

1. **Build the project**
```bash
npm run build
```

2. **Deploy to GitHub Pages**
```bash
# Install gh-pages if not already installed
npm install -g gh-pages

# Deploy dist folder to gh-pages branch
gh-pages -d dist
```

3. **Configure GitHub Repository**
   - Go to repository **Settings** → **Pages**
   - Set **Source** to `gh-pages` branch
   - The app will be available at: `https://yourusername.github.io/washusimintelligence/`

### Important Notes for GitHub Pages

- The base path `/washusimintelligence/` is configured in `vite.config.ts`
- All routes will work correctly with this base path
- Assets and imports are automatically prefixed with the base path
- If you change the repository name, update the `base` in `vite.config.ts`

## 📖 Usage Guide

### 1. Upload Past Reports (Style Guides)
Navigate to the **Upload** tab and upload previous post-session reports (PDF/DOCX format). These serve as AI training examples for consistent formatting and structure.

### 2. Add Session Notes
Use the **Notes** tab to document observations, debriefing notes, and facilitator comments with rich metadata (date, facilitator, participants).

### 3. Manage Case Files
Store simulation case information in the **Cases** tab including location, participants, equipment details, and scenario descriptions.

### 4. Generate Reports
In the **Generate** tab:
- Select style guide reports (minimum 1 recommended)
- Choose session notes and case files
- Click "Generate Report" to create AI-synthesized documentation
- Review, edit, and export in your preferred format (Copy/DOCX/PDF)

### 5. Track LSTs
The **LST Tracker** provides:
- Color-coded severity badges (High/Medium/Low)
- Status tracking (Identified/In Progress/Resolved/Recurring)
- Location and assignee management
- Full edit capabilities with resolution notes
- Recurrence tracking for systemic issues

### 6. Dashboard Analytics
View real-time metrics including:
- Total documents, cases, and active LSTs
- Recent activity timeline with quick actions
- LST distribution by status and severity
- Document trend analysis over time
- Quick action buttons for common workflows

### 7. Repository Management
Browse, search, and manage all generated reports with:
- Tag-based filtering and metadata search
- Bulk export and deletion operations
- Document comparison view
- Version history and audit trails

## ⌨️ Keyboard Shortcuts

- `T` - Start interactive tour
- `Ctrl+G` - Quick generate report
- `Ctrl+U` - Upload files
- `Ctrl+F` - Search/filter
- `Ctrl+/` - Show all shortcuts
- `Esc` - Close modals

## 🎨 Branding

This application uses official Washington University color palette:
- **PMS 200 (Red)**: `#A51417` - Primary brand color for headers, active states, and high-priority items
- **PMS 350 (Green)**: `#007A33` - Accent color for success states and resolved LSTs

Colors are applied subtly throughout the interface while maintaining excellent contrast ratios for WCAG AA accessibility.

## 🔒 Security & Privacy

- All API keys stored securely in Supabase environment variables (never exposed in code)
- Private Supabase storage buckets with time-limited signed URLs
- Service role key isolated to backend Edge Functions only
- Comprehensive audit logging for compliance and accountability
- Input sanitization and validation on all user-submitted data
- CORS protection on backend endpoints

## 📊 System Requirements

### Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Recommended Specifications
- Minimum 1280x720 resolution (optimized for tablets)
- Internet connection for AI generation features
- Modern device with 4GB+ RAM for smooth performance

## 🐛 Known Limitations

- **Database Schema**: Migrations and DDL statements must be handled via Supabase UI (not in code)
- **KV Store**: The `kv_store_7fe18c53` table is flexible for prototyping but not optimized for complex relational queries
- **Auth**: Email confirmation is auto-enabled; email server configuration required for production authentication flows
- **PDF Export**: Complex formatting may require post-processing for production-quality documents
- **Batch Operations**: Large batch operations (500+ documents) may require pagination

## 🚀 Performance Optimizations

- **Skeleton Loading**: Instant UI feedback while data loads
- **TanStack Query Caching**: Hooks automatically deduplicate requests and cache payloads across routes.
- **Lazy Loading**: Components loaded on-demand for faster initial load
- **Debounced Search**: Reduces API calls during filtering/search
- **Cached Data**: Local storage for theme preferences and session state

## 🤝 Contributing

This is an internal tool for Washington University Emergency Medicine. For feature requests or bug reports, please contact the development team or open an issue on GitHub.

### Development Guidelines
- Follow React best practices and TypeScript strict mode
- Maintain WCAG AA accessibility standards
- Test dark mode compatibility for all new components
- Document complex logic and API integrations
- Use the existing component library before creating new components

## 📄 License

Proprietary - Washington University School of Medicine

All rights reserved. This software is developed for internal use by Washington University Emergency Medicine and may not be redistributed or used outside the organization without explicit permission.

## 🙏 Acknowledgments

Built for the WashU Emergency Medicine Simulation & Safety team to enhance post-session documentation and latent safety threat identification.

Special thanks to:
- WashU EM Simulation & Safety Team
- Google Gemini AI Platform
- Supabase for backend infrastructure
- shadcn/ui for component library
- The React and TypeScript communities

---

**Version**: 1.0.0 (Comprehensive Intelligence Platform)  
**Build**: 26 Major Optimization Features  
**AI Model**: Gemini 3.0 Flash Experimental  
**Backend**: Supabase Edge Functions + KV Store  
**Deployment**: GitHub Pages at `/washusimintelligence/`

For support or questions, please contact the WashU EM development team.