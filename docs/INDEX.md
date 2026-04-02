# Documentation Index

Welcome to the WashU Emergency Medicine Simulation & Safety Intelligence Platform documentation. This index will help you find the information you need.

## 📚 Core Documentation

### Getting Started
- **[README.md](../README.md)** - Main project documentation, installation, and usage guide
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Comprehensive deployment guide for GitHub Pages
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Guidelines for contributing to the project
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes

### Legal
- **[LICENSE.md](../LICENSE.md)** - Proprietary license terms and conditions
- **[ATTRIBUTIONS.md](../ATTRIBUTIONS.md)** - Third-party licenses and acknowledgments

## 🚀 Quick Links

### For Users
- [Installation Guide](../README.md#-installation)
- [Usage Guide](../README.md#-usage-guide)
- [Keyboard Shortcuts](../README.md#️-keyboard-shortcuts)
- [Known Limitations](../README.md#-known-limitations)

### For Developers
- [Development Setup](../CONTRIBUTING.md#-getting-started)
- [Code Style Guidelines](../CONTRIBUTING.md#-development-guidelines)
- [Testing Checklist](../CONTRIBUTING.md#-testing)
- [Pull Request Process](../CONTRIBUTING.md#-pull-request-process)

### For DevOps
- [GitHub Actions Deployment](../DEPLOYMENT.md#method-1-automated-deployment-with-github-actions-recommended)
- [Manual Deployment](../DEPLOYMENT.md#method-2-manual-deployment-with-gh-pages)
- [Troubleshooting](../DEPLOYMENT.md#-troubleshooting)
- [Environment Configuration](../DEPLOYMENT.md#-environment-configuration)

## 🎯 Feature Documentation

### Core Features

#### 1. AI-Powered Report Generation
Generate professional post-session reports using Google Gemini 3.0 Flash Experimental.

**Key capabilities:**
- Style guide training from past reports
- Multi-document synthesis
- Editable generated content
- Three export formats (Copy, DOCX, PDF)

**Location:** Generate tab  
**Documentation:** [Usage Guide - Generate Reports](../README.md#4-generate-reports)

#### 2. Latent Safety Threat (LST) Tracking
Comprehensive system for identifying, managing, and resolving safety threats.

**Key capabilities:**
- Severity classification (High/Medium/Low)
- Status tracking (Identified/In Progress/Resolved/Recurring)
- Location and assignee management
- Recurrence detection
- Resolution notes

**Location:** LST Tracker tab  
**Documentation:** [Usage Guide - Track LSTs](../README.md#5-track-lsts)

#### 3. Dashboard Analytics
Real-time metrics and insights into documentation and safety trends.

**Key metrics:**
- Total documents and cases
- Active LST count
- Recent activity timeline
- LST distribution by status and severity
- Document trend analysis

**Location:** Dashboard tab (default)  
**Documentation:** [Usage Guide - Dashboard Analytics](../README.md#6-dashboard-analytics)

#### 4. Document Repository
Centralized storage and management for all generated reports.

**Key capabilities:**
- Advanced search and filtering
- Tag-based organization
- Bulk operations
- Document comparison view
- Version history

**Location:** Repository tab  
**Documentation:** [Usage Guide - Repository Management](../README.md#7-repository-management)

#### 5. Style Guide Upload
Train the AI by uploading past reports as examples.

**Supported formats:**
- PDF documents
- DOCX (Microsoft Word) documents
- Text extraction and analysis

**Location:** Upload tab  
**Documentation:** [Usage Guide - Upload Past Reports](../README.md#1-upload-past-reports-style-guides)

#### 6. Session Notes Management
Document simulation sessions with rich metadata.

**Key fields:**
- Date and time
- Facilitator information
- Participant details
- Observation notes
- Debriefing comments

**Location:** Session Notes tab  
**Documentation:** [Usage Guide - Add Session Notes](../README.md#2-add-session-notes)

#### 7. Case File Management
Store simulation case information for reference.

**Key fields:**
- Case name and description
- Location and equipment
- Participant roles
- Scenario details

**Location:** Cases tab  
**Documentation:** [Usage Guide - Manage Case Files](../README.md#3-manage-case-files)

## 🛠️ Technical Documentation

### Architecture

#### Frontend Stack
- **Framework:** React 18.3.1 with TypeScript
- **Styling:** Tailwind CSS v4 + Radix UI
- **Routing:** React Router 7 (Data Mode)
- **Build Tool:** Vite 6.3.5
- **State Management:** React hooks + local storage

#### Backend Stack
- **Platform:** Supabase
- **Runtime:** Deno (Edge Functions)
- **Web Server:** Hono
- **Database:** PostgreSQL with KV Store
- **AI Integration:** Google Gemini API

#### Key Technologies
- **Document Processing:** docx, jsPDF, mammoth
- **Charts:** Recharts
- **Forms:** React Hook Form
- **Animations:** Motion (formerly Framer Motion)
- **UI Components:** Radix UI primitives

### Project Structure

```
washusimintelligence/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml           # GitHub Actions deployment
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md        # Bug report template
│   │   └── feature_request.md   # Feature request template
│   └── PULL_REQUEST_TEMPLATE.md # PR template
├── src/
│   ├── app/
│   │   ├── components/          # React components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   ├── dashboard.tsx
│   │   │   ├── generate-report.tsx
│   │   │   ├── lst-tracker.tsx
│   │   │   └── ...
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Utility functions
│   │   └── App.tsx             # Main application
│   ├── styles/                 # CSS files
│   │   ├── index.css
│   │   ├── theme.css           # Theme variables
│   │   └── fonts.css           # Font imports
│   └── imports/                # Assets (if any)
├── supabase/
│   └── functions/
│       └── server/
│           ├── index.tsx       # Hono web server
│           ├── kv_store.tsx    # KV store utilities
│           └── text-sanitizer.tsx
├── utils/
│   └── supabase/
│       └── info.tsx            # Supabase config
├── docs/                       # Documentation
├── CHANGELOG.md
├── CONTRIBUTING.md
├── DEPLOYMENT.md
├── LICENSE.md
├── README.md
├── package.json
└── vite.config.ts
```

### Configuration Files

- **vite.config.ts** - Vite build configuration with GitHub Pages base path
- **package.json** - Dependencies and npm scripts
- **.gitignore** - Git ignore rules
- **postcss.config.mjs** - PostCSS configuration for Tailwind

## 🔧 Development Guides

### Setting Up Development Environment

1. **Prerequisites**
   - Node.js 18+
   - Git
   - Code editor (VS Code recommended)
   - Supabase account
   - Google Gemini API key

2. **Installation Steps**
   ```bash
   git clone https://github.com/yourusername/washusimintelligence.git
   cd washusimintelligence
   npm install
   npm run dev
   ```

3. **Supabase Configuration**
   - Create project
   - Run SQL migrations
   - Configure environment variables
   - Deploy Edge Functions

### Common Development Tasks

#### Adding a New Component
```typescript
// src/app/components/my-component.tsx
import React from 'react';

export function MyComponent() {
  return <div>Component content</div>;
}
```

#### Adding a New Route
Update `/src/app/routes.tsx` with React Router configuration.

#### Styling Components
Use Tailwind utility classes and theme variables from `/src/styles/theme.css`.

#### Accessing the Database
Use KV store utilities from `/supabase/functions/server/kv_store.tsx`.

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (must be 18+)
- Verify all dependencies are installed

#### API Connection Issues
- Verify Supabase credentials in app settings
- Check CORS configuration in Edge Functions
- Ensure Edge Functions are deployed

#### Dark Mode Issues
- Check theme provider wraps entire app
- Verify dark mode classes in Tailwind config
- Test theme toggle functionality

#### Deployment Issues
- Verify base path matches repository name
- Check GitHub Pages is enabled
- Review GitHub Actions logs for errors

### Getting Help

- **GitHub Issues:** [Report bugs or request features](https://github.com/yourusername/washusimintelligence/issues)
- **Development Team:** Contact WashU EM for technical support
- **Documentation:** Review relevant documentation sections

## 📊 Performance Optimization

### Best Practices

1. **Code Splitting**
   - Lazy load route components
   - Use dynamic imports for large dependencies

2. **Asset Optimization**
   - Compress images before upload
   - Use WebP format where supported
   - Minimize SVG files

3. **Database Queries**
   - Use efficient KV store queries
   - Implement pagination for large datasets
   - Cache frequently accessed data

4. **Bundle Size**
   - Analyze bundle with `npm run build`
   - Remove unused dependencies
   - Tree-shake libraries where possible

## 🔒 Security Best Practices

### Frontend Security
- Never expose API keys or secrets
- Sanitize all user input
- Use HTTPS for all API calls
- Implement proper CORS policies

### Backend Security
- Service role key stays in backend
- Validate all incoming requests
- Use parameterized queries
- Log security-relevant events

### Data Privacy
- De-identify patient data
- Follow HIPAA compliance
- Secure credential storage
- Regular security audits

## 📝 Maintenance

### Regular Tasks

#### Weekly
- Review and triage new issues
- Monitor performance metrics
- Check for security updates

#### Monthly
- Update dependencies
- Review audit logs
- Backup database

#### Quarterly
- Major version updates
- Performance optimization review
- Documentation updates
- User feedback collection

## 🎓 Training Resources

### For End Users
- Interactive tour (press 'T' in app)
- Keyboard shortcuts reference
- Video tutorials (if available)
- User manual sections in README

### For Developers
- Contributing guidelines
- Code review checklist
- Architecture decision records
- API documentation

## 📞 Contact & Support

### Support Channels
- **Technical Issues:** GitHub Issues
- **Feature Requests:** GitHub Discussions
- **Security Concerns:** Direct contact with dev team
- **General Questions:** WashU EM development team

### Team Contacts
- **Development Team:** WashU EM
- **Project Lead:** [Contact info]
- **Tech Support:** [Contact info]

---

**Last Updated:** April 2, 2026  
**Documentation Version:** 1.0.0  
**Project Version:** 1.0.0

For the most up-to-date information, always refer to the [README.md](../README.md) and [CHANGELOG.md](../CHANGELOG.md).
