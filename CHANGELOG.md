# Changelog

All notable changes to the WashU EM Sim Intelligence Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-04-07)


### Features

* add functional overview summary to dashboard UI ([29eaf3c](https://github.com/salthepal/WashUSimIntelligence/commit/29eaf3c5b16c960ff54671f9f06a124f0b38cd2a))
* add LST merge, deletion, and manual creation features ([e7dc3bc](https://github.com/salthepal/WashUSimIntelligence/commit/e7dc3bc340284aba6d88f69b498813007d308b79))
* add security headers and edge caching middleware to worker ([c807664](https://github.com/salthepal/WashUSimIntelligence/commit/c807664710a8b8be4160893f3a13f7465e41fdea))
* add system error logging and UI log viewer ([da62469](https://github.com/salthepal/WashUSimIntelligence/commit/da624696a26ff13da51e759083d2568446309827))
* add user toggle for automatic LST extraction ([931007d](https://github.com/salthepal/WashUSimIntelligence/commit/931007daf66950884c3ba4246669d7f5eaca8151))
* configure custom domain salphadnis.org and api.salphadnis.org ([41dc6ab](https://github.com/salthepal/WashUSimIntelligence/commit/41dc6abd91d2f9431dcce99ada793e831e2d971e))
* implement automatic Latent Safety Threat (LST) extraction from generated reports ([65598c6](https://github.com/salthepal/WashUSimIntelligence/commit/65598c637a2cb2149c1a1fd3d7032f81aaef1c0f))
* implement multi-site Master LST tracking and per-location status management ([4362f02](https://github.com/salthepal/WashUSimIntelligence/commit/4362f027c974e484ecce924ef20d2e844c00176f))
* improve report generation robustness and update AI model aliases ([2f664cb](https://github.com/salthepal/WashUSimIntelligence/commit/2f664cb526297b96ea27fe22bbb69afcf4964069))
* migrate backend to Cloudflare (Worker, D1, R2) and optimize API layer ([a7a166d](https://github.com/salthepal/WashUSimIntelligence/commit/a7a166dd6c40705d999dd0fa501cbaa1f6d37f6a))
* re-enable /api proxy for Cloudflare Pages integration ([182a547](https://github.com/salthepal/WashUSimIntelligence/commit/182a5474cc61daf69b82d9b1acc09da1b7e5afc6))
* **security:** restore Turnstile protection and automated cron backups ([6259d1d](https://github.com/salthepal/WashUSimIntelligence/commit/6259d1dc36d26064634f942c5ab3957f5b54a45b))
* **security:** update Turnstile Site Key with official credentials ([5afee39](https://github.com/salthepal/WashUSimIntelligence/commit/5afee39b7750c8476edcb48a41ecc5811a10a5ca))
* upgrade LST tracker with AI-powered extraction, severity scoring, and recurrence tracking ([8827959](https://github.com/salthepal/WashUSimIntelligence/commit/8827959e3d2be6fce274330a1ad42ea978fb47be))
* use Cloudflare Pages Functions proxy to connect frontend with backend Worker API ([9f9c183](https://github.com/salthepal/WashUSimIntelligence/commit/9f9c18304e9074e88d9fddc1656777788736259c))


### Bug Fixes

* correct duplicate model selection label to Flash Lite ([1066aeb](https://github.com/salthepal/WashUSimIntelligence/commit/1066aebe8108efd8599095b04d49ca56e8e27a8d))
* correctly parse array response for case files library ([297604c](https://github.com/salthepal/WashUSimIntelligence/commit/297604cec67c859cc541a7c08ca95a8b6d293f03))
* decouple report generation model from LST extraction model ([765c3d0](https://github.com/salthepal/WashUSimIntelligence/commit/765c3d0ecabe3e616f3a5b22980d397a1e7dfc96))
* harden settings string parsing to prevent generation crashes ([b9174fe](https://github.com/salthepal/WashUSimIntelligence/commit/b9174fe7a02a9ec9a875ec4cbe7ce452273027f9))
* implement missing case-files API endpoints and migrate to relational table ([498dbd3](https://github.com/salthepal/WashUSimIntelligence/commit/498dbd35762212962fd31fbd4c699274d4612fb1))
* implement missing report and note deletion endpoints ([86c8b07](https://github.com/salthepal/WashUSimIntelligence/commit/86c8b0781baf6afeb81b4e21a84142fe6fc6af96))
* map backend session notes properties to match frontend expected camelCase names ([f337338](https://github.com/salthepal/WashUSimIntelligence/commit/f33733867930597949b0ec56f7af0843c1ed7d59))
* resolve AI LST extraction model NOT_FOUND error ([ef02e2d](https://github.com/salthepal/WashUSimIntelligence/commit/ef02e2d956d2f493ff8d7ec77341b3927e635d1f))
* resolve all D1_TYPE_ERROR undefined bindings across API routes ([a3bccb2](https://github.com/salthepal/WashUSimIntelligence/commit/a3bccb2032db0a6fd87075d7e54d83fc606959fe))
* resolve brace imbalance and final TypeScript type errors in session notes get endpoint and helpers ([bc3e66a](https://github.com/salthepal/WashUSimIntelligence/commit/bc3e66a9187c0bc7b8de01d75cab0cdf7f842513))
* resolve build error caused by invalid escaped quotes in dashboard and update dependencies ([fda0c94](https://github.com/salthepal/WashUSimIntelligence/commit/fda0c9418209ca726a50c1f1db4ebde14a715276))
* resolve D1_TYPE_ERROR bindings for prior reports and case files ([af02d0e](https://github.com/salthepal/WashUSimIntelligence/commit/af02d0eebd52f8927d870a433a6e0b9219375585))
* resolve invalid date JS parsing bug & make file upload form fields optional ([1959d62](https://github.com/salthepal/WashUSimIntelligence/commit/1959d626774076a23fb6e5361e538e9847789cc5))
* resolve merge conflicts in package.json ([e1efd5b](https://github.com/salthepal/WashUSimIntelligence/commit/e1efd5b5666aa6455ed1189a838aec706a75ea71))
* resolve note and LST population issue by fixing API data structure mismatches ([6991e8c](https://github.com/salthepal/WashUSimIntelligence/commit/6991e8cd760acb923e091983a15d07c6f4bf93d3))
* resolve typescript type conversion error in file upload ([b9ff0bf](https://github.com/salthepal/WashUSimIntelligence/commit/b9ff0bf64bed554020069107e7155d9e326b68a6))
* resolve white screen on cloudflare pages by using relative base path and add backend identifier route ([c953e25](https://github.com/salthepal/WashUSimIntelligence/commit/c953e2592df8ae2654321897dbc74a94db020a28))
* resolve worker type definition errors ([74e2f32](https://github.com/salthepal/WashUSimIntelligence/commit/74e2f32c2f68cf5f7ca7906b0fdbd63d776f94fe))
* restore model sovereignty and finalize LST extraction reliability ([d76b2d4](https://github.com/salthepal/WashUSimIntelligence/commit/d76b2d4966f91ab1a8b18e9a898a1bf11ccf85be))
* revert to absolute backend URL since frontend is deployed on workers.dev instead of pages.dev ([fb837b1](https://github.com/salthepal/WashUSimIntelligence/commit/fb837b147f0da0d99116bc2e3cdb2c465291e8bd))
* robust Gemini streaming JSON parser and DB insertion error handling ([4c19f36](https://github.com/salthepal/WashUSimIntelligence/commit/4c19f365f4cdf39cae86178aff53b95260daebb1))
* **security:** add Turnstile verification to Case Files and Report Generation ([c96a827](https://github.com/salthepal/WashUSimIntelligence/commit/c96a827870fd3f04acd29015e4c98407b1db00e7))
* **security:** resolve Turnstile headers and prevent pre-verification submission ([a4eedb6](https://github.com/salthepal/WashUSimIntelligence/commit/a4eedb6bb33c05c12668fa5ada57eeb07dced8cf))
* strip base64 images from case files to prevent SQLITE_TOOBIG limit ([c6e15cf](https://github.com/salthepal/WashUSimIntelligence/commit/c6e15cf72cd9770a793a3e2f6e44e935862b4ce3))
* synchronize package-lock.json for cloudflare pages build ([5307147](https://github.com/salthepal/WashUSimIntelligence/commit/5307147d725b0ea494f1a113d41f0a6fe6ef37c1))


### Reverts

* undo frontend migration to salphadnis.org ([b7f7498](https://github.com/salthepal/WashUSimIntelligence/commit/b7f74981bcf764f5d205adaea415c7691c392628))

## [3.2.0] - 2026-04-05

### 🛡️ Platform Hardening & Institutional Branding
A significant update focused on enterprise-grade performance, auditability, and standardization with official Washington University (WashU) brand guidelines.

### ✨ Added
- **Automated LST Audit History**: Implemented database-level triggers to track all status and severity changes for Latent Safety Threats.
- **Audit Trail UI**: New history visualization component allowing users to view the full lifecycle of any safety threat.
- **Contextual Search Snippets**: Rebuilt the search engine with FTS5 highlighting, providing real-time snippets in the document repository.
- **Atomic Hydration API**: Consolidated core data retrieval into a single `/hydrate` endpoint, reducing initial load latency by ~60%.
- **WashU Brand Palette**: Integrated official #A51417 (Red) and #007A33 (Green) across all UI components and charts.

### 🛠️ Changed
- **Navigation Architecture**: Refactored the application with `React.lazy` and `Suspense` for optimized initial bundle delivery.
- **IDE Resilience**: Configured project-level workspace settings to suppress Tailwind v4 validation false-positives.
- **Deployment Workflow**: Standardized the GitHub Actions CI/CD trigger and updated documentation for Cloudflare Pages migration.

### 🐛 Fixed
- **UI Consistency**: Eliminated hardcoded utility colors in favor of theme-aware design tokens.
- **Search Logic**: Corrected prefix matching in FTS5 queries to handle complex medical terminology more accurately.

## [3.1.0] - 2026-04-03

### 🏛️ Production Stability & Optimization
Final production-grade optimizations, strictly aligning the platform with the Washington University Department of Emergency Medicine’s professional standards and "Just Culture" framework.

### ✨ Added
- **Official Simulation Prompt**: Integrated the department's official high-fidelity simulation prompt, enforcing strict Markdown and standard safety definitions (In-Situ, LST, BPS).
- **Core UI Cleanup**: Removed the "System Safety Index", "Quick Actions Bar", and redundant "System Information" for a focused clinical interface.
- **Unified Security**: Full consolidation of all Dependabot security patches and development branches into the production core.
- **Version 3.1.0 Stack**: Synchronized frontend and backend packages to the latest stable versioning.

### 🛠️ Changed
- **Dashboard**: Shifted focus to direct LST tracking and activity metrics, eliminating the calculated "Safety Index" in favor of absolute clinical data.
- **Settings**: Streamlined the settings page to focus on data management and AI configuration.

### 🐛 Fixed
- **D1 Database**: Resolved `D1_TYPE_ERROR` undefined bindings across all API routes for prior reports and case files.
- **Data Integrity**: Implemented relational table migration for case-files for improved data consistency.
- **System Limits**: Automated stripping of base64 images from case files to prevent `SQLITE_TOOBIG` storage limits.
- **API Parsing**: Corrected array response parsing for the unified case files library.
- **CI/CD**: Optimized CodeQL security workflows for pushes and fork pull requests.

---

## [2.1.0] - 2026-04-03
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
