# WashU Emergency Medicine: Simulation & Safety Intelligence Platform

**Version 1.0.0** - Comprehensive Intelligence Platform for Post-Session Report Generation & LST Management

![WashU Colors](https://img.shields.io/badge/WashU-PMS%20200%20%7C%20PMS%20350-A51417)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Build](https://img.shields.io/badge/build-26%20optimizations-success)

## Overview

A comprehensive web application designed for Washington University Emergency Medicine simulation programs to streamline post-session report generation and track Latent Safety Threats (LSTs). Built with AI-powered intelligence using Google's Gemini 3.0 Flash Experimental model, this platform enables efficient documentation workflows for bedside clinical use.

## 🚀 Key Features

### Core Capabilities
- **AI-Powered Report Generation** - Synthesize professional reports from session notes using Gemini 3.0 Flash Experimental
- **LST Intelligence** - Track, manage, and resolve system gaps with severity, location, and recurrence monitoring
- **Workflow Automation** - Batch operations, audit logging, and streamlined document management
- **Style Guide Training** - Upload past reports to establish consistent writing patterns

### User Experience
- **Dark Mode** - Full WCAG AA compliant accessibility
- **Horizontal Scroll Tabs** - Optimized for bedside tablet use
- **3 Export Formats** - Copy to clipboard, DOCX download, and PDF export
- **Responsive Design** - Mobile and desktop optimized

### Data Management
- **7 Main Tabs**: Dashboard, Upload, Cases, Notes, Generate, LST Tracker, Repository, Settings
- **Advanced Filtering** - Search by tags, metadata, date ranges, and custom fields
- **Backup & Restore** - Full data export/import capabilities
- **Audit Logging** - Complete action history tracking

## 🛠️ Technology Stack

- **Frontend**: React 18.3.1 + TypeScript
- **Styling**: Tailwind CSS v4 + Radix UI Components
- **AI Model**: Google Gemini 3.0 Flash Experimental
- **Backend**: Supabase Edge Functions (Deno/Hono)
- **Database**: Supabase PostgreSQL with KV Store
- **Build Tool**: Vite 6.3.5
- **Routing**: React Router 7 (Data Mode)

## 📦 Installation

### Prerequisites
- Node.js 18+ or Bun
- Supabase Account (for backend functionality)
- Google Gemini API Key

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/washuemsimreportgenerator.git
cd washuemsimreportgenerator
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the following SQL in the SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

4. **Configure environment variables**
   - The app will prompt you to enter:
     - `GEMINI_API_KEY` - Your Google Gemini API key
     - Supabase credentials (URL, Anon Key, Service Role Key)

5. **Run development server**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

## 🌐 GitHub Pages Deployment

This project is configured for GitHub Pages deployment at `/washuemsimreportgenerator/`.

### Deployment Steps

1. **Build the project**
```bash
npm run build
```

2. **Deploy to GitHub Pages**
   - Push your code to GitHub
   - Enable GitHub Pages in repository settings
   - Set source to `gh-pages` branch or `docs` folder
   - The app will be available at: `https://yourusername.github.io/washuemsimreportgenerator/`

### Manual Deployment
```bash
# Install gh-pages if not already installed
npm install -g gh-pages

# Deploy dist folder to gh-pages branch
gh-pages -d dist
```

## 📖 Usage Guide

### 1. Upload Past Reports (Style Guides)
Navigate to the **Upload** tab and upload previous post-session reports. These serve as AI training examples for consistent formatting and structure.

### 2. Add Session Notes
Use the **Notes** tab to document observations, debriefing notes, and facilitator comments with rich metadata.

### 3. Manage Case Files
Store simulation case information in the **Cases** tab including location, participants, and equipment details.

### 4. Generate Reports
In the **Generate** tab:
- Select style guide reports
- Choose session notes and case files
- Click "Generate Report" to create AI-synthesized documentation
- Review, edit, and export in your preferred format

### 5. Track LSTs
The **LST Tracker** provides:
- Color-coded severity badges (High/Medium/Low)
- Status tracking (Identified/In Progress/Resolved/Recurring)
- Location and assignee management
- Full edit capabilities with resolution notes

### 6. Dashboard Analytics
View real-time metrics including:
- Total documents and active LSTs
- Recent activity timeline
- LST distribution by status and severity
- Document trend analysis

## ⌨️ Keyboard Shortcuts

- `T` - Start interactive tour
- `Ctrl+G` - Quick generate
- `Ctrl+U` - Upload files
- `Ctrl+F` - Search/filter

## 🎨 Branding

This application uses official Washington University color palette:
- **PMS 200 (Red)**: `#A51417` - Primary brand color
- **PMS 350 (Green)**: `#007A33` - Accent color

## 🔒 Security & Privacy

- All API keys stored securely in Supabase environment variables
- Private Supabase storage buckets with signed URLs
- Service role key never exposed to frontend
- Comprehensive audit logging for compliance

## 📊 System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Minimum 1280x720 resolution
- Internet connection for AI generation features

## 🐛 Known Limitations

- Database migrations and DDL statements must be handled via Supabase UI
- The KV Store table (`kv_store_7fe18c53`) is flexible for prototyping but not optimized for complex queries
- Email confirmation is auto-enabled (email server configuration required for production auth)

## 🤝 Contributing

This is an internal tool for Washington University Emergency Medicine. For feature requests or bug reports, please contact the development team.

## 📄 License

Proprietary - Washington University School of Medicine

## 🙏 Acknowledgments

Built for the WashU Emergency Medicine Simulation & Safety team to enhance post-session documentation and latent safety threat identification.

---

**Version**: 1.0.0 (Comprehensive Intelligence Platform)  
**Build**: 26 Major Optimization Features  
**AI Model**: Gemini 3.0 Flash Experimental  
**Backend**: Supabase Edge Functions + KV Store
