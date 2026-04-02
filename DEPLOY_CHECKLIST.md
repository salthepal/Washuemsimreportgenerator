# 🚀 Pre-Deployment Checklist

Use this checklist before deploying to production.

## Code Quality ✅

- [ ] All TypeScript compilation errors resolved
- [ ] No console warnings in production build
- [ ] All tests passing (if applicable)
- [ ] Code reviewed by team lead
- [ ] No commented-out code blocks
- [ ] Unused imports removed
- [ ] Debug statements removed

## Configuration ⚙️

- [ ] `package.json` version updated
- [ ] `CHANGELOG.md` updated with changes
- [ ] `vite.config.ts` has correct `base` path: `/washuemsimreportgenerator/`
- [ ] Environment variables documented in `.env.example`
- [ ] `.gitignore` includes all sensitive files

## Supabase Backend 🗄️

- [ ] Database table `kv_store_7fe18c53` exists
- [ ] Edge functions deployed successfully
- [ ] All Supabase secrets configured:
  - [ ] `GEMINI_API_KEY`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_DB_URL`
- [ ] Storage buckets created (if needed)
- [ ] RLS policies configured correctly
- [ ] CORS enabled on edge functions

## Security 🔒

- [ ] No API keys in frontend code
- [ ] Service role key only used in backend
- [ ] User inputs properly validated
- [ ] HTML content sanitized
- [ ] Authentication flows tested
- [ ] Audit logging functional

## Functionality Testing 🧪

### Core Features
- [ ] Dashboard loads with correct metrics
- [ ] Upload reports successfully
- [ ] Create and edit session notes
- [ ] Generate AI reports with Gemini
- [ ] LST CRUD operations work
- [ ] Repository search and filter
- [ ] Backup and restore functional
- [ ] Audit log displays correctly

### Export Functions
- [ ] Copy to clipboard works
- [ ] DOCX export downloads correctly
- [ ] PDF export generates properly
- [ ] Batch export functions

### UI/UX
- [ ] All 7 tabs accessible and functional
- [ ] Dark mode toggle works
- [ ] Dark mode styling consistent
- [ ] Tour walkthrough functional (press T)
- [ ] Quick actions bar works
- [ ] Keyboard shortcuts active

## Responsive Design 📱

- [ ] Desktop view (1920x1080)
- [ ] Laptop view (1366x768)
- [ ] Tablet landscape (1024x768)
- [ ] Tablet portrait (768x1024)
- [ ] Mobile landscape (812x375)
- [ ] Mobile portrait (375x667)
- [ ] Horizontal tab scrolling works on mobile

## Accessibility ♿

- [ ] WCAG AA color contrast met
- [ ] All buttons keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on icon buttons
- [ ] Screen reader friendly
- [ ] Tab order logical

## Performance 🚀

- [ ] Initial page load < 3 seconds
- [ ] Dashboard lazy loads correctly
- [ ] API requests optimized (parallel where possible)
- [ ] Bundle size reasonable (<500KB gzipped)
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

## Browser Compatibility 🌐

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## GitHub Pages 📄

- [ ] GitHub Actions workflow configured (`.github/workflows/deploy.yml`)
- [ ] GitHub Pages enabled in repo settings
- [ ] Deployment source set to GitHub Actions
- [ ] Base path matches repo name
- [ ] Assets load correctly on GitHub Pages URL

## Documentation 📚

- [ ] README.md up to date
- [ ] DEPLOYMENT.md reviewed
- [ ] CHANGELOG.md has version entry
- [ ] CONTRIBUTING.md reflects current process
- [ ] Code comments added for complex logic
- [ ] API endpoints documented

## Post-Deployment Verification ✓

After deployment, verify:

- [ ] Site loads at GitHub Pages URL
- [ ] All assets load (no 404s)
- [ ] Dashboard metrics display
- [ ] Generate report works end-to-end
- [ ] LST tracking functional
- [ ] Dark mode toggle works
- [ ] Mobile view functional
- [ ] No console errors

## Rollback Plan 🔄

If issues occur:

- [ ] Previous version tagged in git
- [ ] Rollback procedure documented
- [ ] Team notified of deployment
- [ ] Monitoring in place for errors

---

## Final Sign-Off

**Deployed By**: _______________  
**Date**: _______________  
**Version**: 1.0.0  
**Commit SHA**: _______________  

**Notes**:
_Any special considerations or known issues:_

---

**All checkboxes must be checked before deploying to production.**

Need help? See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
