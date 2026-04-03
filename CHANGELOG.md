# Changelog

All notable changes to the WashU EM Sim Intelligence Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-04-03

### 🍱 Enterprise Optimization Edition (Zero-Latency)
Three high-impact architectural upgrades for a fast, searchable, and responsive clinical simulation platform.

### ✨ Added
- **AI Streaming Support**: Shifted report generation to an asynchronous token stream for a real-time, responsive typing effect.
- **Deep Content Search (FTS5)**: Integrated an SQLite-native Full-Text Search virtual table in D1.
- **Persistence (Offline-First)**: Added `@tanstack/react-query-persist-client` for persistent browser-side caching.
- **Search Triggers**: Automated SQL triggers in D1 to keep the search index synchronized with the live `reports` table.

### 🛠️ Changed
- **API (api.ts)**: Enhanced the client layer with `AsyncGenerator` support for AI streams.
- **Repository UI**: Swapped local filtering for server-side Full-Text Search for deep repository queries.
- **Dashboard Speed**: Queries now default to a 24-hour persistence layer for sub-millisecond tab switching.

---

## [2.0.0] - 2026-04-03

### 🚀 The Cloudflare Migration (Forever Free Architecture)
A major architectural overhaul migrating from Supabase to a high-performance, cost-effective Cloudflare-native stack.

### ✨ Added
- **Cloudflare Worker Backend**: High-performance API powered by Hono.
- **D1 SQL Database**: Structured relational storage for Reports, LSTs, Session Notes, and Audit Logs.
- **R2 Object Storage**: 10GB free space for persisting actual report documents and media files.
- **KV Rate Limiter**: Protective layer for Gemini API consumption using Cloudflare Key-Value store.
- **Gemini Port**: Secure integration of AI report generation in the edge worker.
- **Enhanced Audit Logs**: Detailed tracking of all administrative events in SQL.
- **Dependabot & CodeQL**: Automated security scanning and dependency patching.

### 🛠️ Changed
- **API Architecture**: Unified all frontend calls into a centralized `api.ts` layer.
- **Storage Strategy**: Migrated from JSON-blob/KV approach to structured, queryable relational tables.
- **Security**: Moved all AI keys to Cloudflare secret management.

### 🗑️ Removed
- **Supabase Integration**: Completely removed all legacy Supabase SDKs, IDs, and keys.

---

## [1.0.0] - 2026-04-02

### 🎉 Initial Release - Comprehensive Intelligence Platform

The first production-ready release of the WashU Emergency Medicine Simulation & Safety Intelligence Platform with 26 major optimization features.

### ✨ Added

#### Core Features
- **AI-Powered Report Generation** - Gemini 3.0 Flash Experimental integration
- **LST Intelligence Tracking** - Comprehensive latent safety threat management
- **Style Guide Training** - Upload past reports for consistent AI output
- **7 Main Tabs** - Dashboard, Upload, Cases, Notes, Generate, LST Tracker, Repository, Settings

#### User Experience
- **Dark Mode** - Full WCAG AA compliant theme with persistence
- **Horizontal Scroll Tabs** - Optimized for bedside tablet use
- **Skeleton Loading States** - Instant UI feedback during data loading
- **Responsive Design** - Mobile, tablet, and desktop optimization
- **Interactive Tour** - Onboarding experience with react-joyride
- **Keyboard Shortcuts** - Quick access to common actions

#### Data Management
- **Advanced Filtering** - Search by tags, metadata, dates, and custom fields
- **Bulk Operations** - Multi-select for export and deletion
- **Backup & Restore** - Full data export/import capabilities
- **Audit Logging** - Complete action history tracking
- **Document Comparison** - Side-by-side view of multiple documents
- **Template Management** - Reusable templates for common report types

#### Export Capabilities
- **Copy to Clipboard** - One-click copy with formatting
- **DOCX Export** - Microsoft Word compatible downloads
- **PDF Export** - Production-ready PDF generation

#### LST Tracker Features
- **Severity Classification** - High/Medium/Low with color coding
- **Status Management** - Identified/In Progress/Resolved/Recurring
- **Location Tracking** - Department and specific location fields
- **Assignee Management** - Responsibility assignment and tracking
- **Recurrence Detection** - Identify systemic safety issues
- **Resolution Notes** - Detailed closure documentation

#### Dashboard Analytics
- **Real-Time Metrics** - Document counts, active LSTs, case files
- **Recent Activity** - Timeline of last 10 actions
- **LST Distribution** - Visual breakdown by status and severity
- **Document Trends** - Activity tracking over time
- **Quick Actions** - One-click access to common workflows

### 🛠️ Technical Improvements

#### Performance
- **Safe Parallel Loading** - Promise.allSettled for database operations
- **Debounced Search** - Reduced API calls during filtering
- **Lazy Loading** - On-demand component loading
- **Code Splitting** - Optimized bundle sizes
- **Local Storage Caching** - Theme and session state persistence

#### Backend Architecture
- **Supabase Edge Functions** - Deno/Hono web server
- **KV Store Database** - Flexible JSONB storage
- **Text Sanitization** - Input validation and security
- **Error Handling** - Comprehensive error logging
- **CORS Protection** - Secure cross-origin requests

#### Developer Experience
- **TypeScript** - Strict mode with comprehensive types
- **Vite 6.3.5** - Fast build and hot module replacement
- **React 18.3.1** - Latest React features and hooks
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives

### 🎨 Design System

#### Branding
- **WashU PMS 200** - Primary red (#A51417)
- **WashU PMS 350** - Accent green (#007A33)
- **WCAG AA Compliance** - Accessible color contrast ratios
- **Consistent Typography** - Professional medical documentation style

#### Components
- 40+ UI Components from Radix UI
- Custom components for domain-specific functionality
- Consistent spacing and layout patterns
- Smooth animations and transitions

### 🔐 Security

- API keys stored securely in Supabase environment variables
- Private storage buckets with signed URLs
- Service role key isolated to backend only
- Input sanitization on all user-submitted data
- Comprehensive audit logging for compliance

### 📦 Deployment

- **GitHub Pages** - Configured with `/washusimintelligence/` base path
- **Automated Workflows** - CI/CD ready with GitHub Actions
- **Manual Deployment** - gh-pages support for one-time deploys
- **Health Check** - Included health-check.html for monitoring

### 🐛 Fixed

- Database connection errors with parallel data loading
- Dark mode inconsistencies across components
- Route handling for GitHub Pages deployment
- Export formatting issues in DOCX and PDF
- LST tracker edit state management
- Session note metadata validation

### 📚 Documentation

- Comprehensive README.md with setup instructions
- CONTRIBUTING.md for development guidelines
- DEPLOYMENT.md for GitHub Pages deployment
- CHANGELOG.md for version tracking
- Inline JSDoc comments for complex functions

### 🔄 Changed from Previous Iterations

- Simplified from 11 tabs to 7 main tabs for clarity
- Consolidated repository and settings into dedicated tabs
- Removed redundant features and streamlined workflows
- Improved AI prompt engineering for better report quality
- Enhanced mobile responsiveness for clinical bedside use

### ⚠️ Known Limitations

- Database migrations must be handled via Supabase UI
- KV Store not optimized for complex relational queries
- Email server configuration required for production auth
- Large batch operations (500+) may require pagination
- PDF export may need post-processing for complex formatting

### 🎯 Future Roadmap

#### Planned for v1.1.0
- Enhanced template system with conditional logic
- Advanced LST analytics and reporting
- Integration with external EMR systems
- Multi-user collaboration features
- Real-time document editing

#### Under Consideration
- Offline mode for disconnected environments
- Voice-to-text for session notes
- AI-powered LST recommendation engine
- Mobile native apps (iOS/Android)
- Integration with simulation equipment

---

## Version History

### Versioning Strategy

- **Major (X.0.0)** - Breaking changes, major feature additions
- **Minor (1.X.0)** - New features, non-breaking changes
- **Patch (1.0.X)** - Bug fixes, minor improvements

### Release Schedule

- **Major releases**: Quarterly or as needed for significant features
- **Minor releases**: Monthly or as features are completed
- **Patch releases**: As needed for critical bug fixes

---

## How to Use This Changelog

This changelog is maintained to help:

- **Users** - Understand what's new and changed
- **Developers** - Track feature development and bug fixes
- **Stakeholders** - Monitor progress and plan upgrades

### Categories

- **Added** - New features and capabilities
- **Changed** - Changes to existing functionality
- **Deprecated** - Features marked for removal
- **Removed** - Features removed in this release
- **Fixed** - Bug fixes and corrections
- **Security** - Security improvements and patches

---

**Note**: This is the initial release (1.0.0) marking the transition from development to production. All features have been thoroughly tested for clinical use in the WashU Emergency Medicine simulation environment.

For detailed feature documentation, see [README.md](./README.md).  
For deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).  
For contributing guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
