# Deployment Guide - WashU EM Sim Safety Intelligence Platform

## Table of Contents
1. [GitHub Pages Deployment](#github-pages-deployment)
2. [Supabase Backend Setup](#supabase-backend-setup)
3. [Environment Configuration](#environment-configuration)
4. [Production Checklist](#production-checklist)
5. [Troubleshooting](#troubleshooting)

---

## GitHub Pages Deployment

### Prerequisites
- GitHub account
- Repository with `main` branch
- GitHub Actions enabled (default for all repos)

### Automated Deployment (Recommended)

The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages on every push to `main`.

#### Steps:

1. **Push your code to GitHub**
```bash
git add .
git commit -m "Initial production deployment"
git push origin main
```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Navigate to **Settings** > **Pages**
   - Under "Build and deployment":
     - Source: Select **GitHub Actions**
   - The workflow will automatically trigger

3. **Wait for deployment**
   - Go to **Actions** tab to monitor deployment progress
   - Once complete (green checkmark), your site is live!

4. **Access your site**
   - URL: `https://yourusername.github.io/washuemsimreportgenerator/`
   - The URL will be displayed in the GitHub Actions workflow output

### Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Install gh-pages globally
npm install -g gh-pages

# Build the project
npm run build

# Deploy to gh-pages branch
gh-pages -d dist
```

Then enable GitHub Pages in Settings > Pages > Source: `gh-pages` branch.

---

## Supabase Backend Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **New Project**
4. Fill in project details:
   - Project Name: `washu-em-sim-platform`
   - Database Password: (strong password)
   - Region: (closest to your users)
5. Wait for project initialization (~2 minutes)

### 2. Create Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the following SQL:

```sql
-- Create the KV store table for document storage
CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_kv_store_created ON kv_store_7fe18c53(created_at DESC);

-- Optional: Add RLS (Row Level Security) policies
ALTER TABLE kv_store_7fe18c53 ENABLE ROW LEVEL SECURITY;

-- Allow service role to do anything
CREATE POLICY "Service role can do anything"
  ON kv_store_7fe18c53
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

4. Click **Run** to execute

### 3. Deploy Edge Functions

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Deploy the functions:
```bash
supabase functions deploy make-server-7fe18c53
```

4. Set environment variables in Supabase:
```bash
supabase secrets set GEMINI_API_KEY=your_key_here
```

### 4. Get API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Project API keys** > `anon` `public` key
   - **Project API keys** > `service_role` key (keep this secret!)
3. Also copy **Database** > **Connection string** > **URI**

---

## Environment Configuration

### For Local Development

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your actual values in `.env`:
```env
GEMINI_API_KEY=your_actual_gemini_key
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=your_database_connection_string
```

3. **Never commit `.env` to git** (already in `.gitignore`)

### For Production (GitHub Pages)

The app uses Supabase's environment variable management:

1. In your Supabase dashboard, go to **Settings** > **Edge Functions**
2. Add the following secrets:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`

The frontend will prompt users to input these on first use, which are then stored in Supabase.

---

## Production Checklist

Before deploying to production, verify:

### Code Readiness
- [ ] All components compile without errors
- [ ] No console warnings in production build
- [ ] All TypeScript types are properly defined
- [ ] Unused imports and code removed

### Configuration
- [ ] `vite.config.ts` has correct `base` path
- [ ] `package.json` version updated to `1.0.0`
- [ ] Environment variables configured in Supabase
- [ ] API endpoints point to production Supabase instance

### Supabase Setup
- [ ] Database table `kv_store_7fe18c53` created
- [ ] Edge functions deployed successfully
- [ ] Environment secrets configured
- [ ] Storage buckets created (if using file uploads)
- [ ] RLS policies configured appropriately

### Security
- [ ] Service role key NOT exposed in frontend code
- [ ] CORS properly configured on edge functions
- [ ] Authentication flows tested
- [ ] API rate limiting considered

### Testing
- [ ] Generate report functionality works
- [ ] LST tracking CRUD operations functional
- [ ] Dark mode toggle working
- [ ] Export features (Copy/DOCX/PDF) tested
- [ ] Responsive design verified on mobile/tablet
- [ ] All 7 tabs functional

### Performance
- [ ] Bundle size optimized (<500KB ideal)
- [ ] Images compressed
- [ ] Lazy loading implemented where appropriate
- [ ] Cache strategies in place

---

## Troubleshooting

### Issue: "Database table not found" error

**Solution:**
1. Verify the table exists in Supabase SQL Editor
2. Run the table creation SQL from [Supabase Backend Setup](#2-create-database-table)
3. Check that the table name is exactly `kv_store_7fe18c53`

### Issue: GitHub Pages shows 404

**Solution:**
1. Verify `base: '/washuemsimreportgenerator/'` in `vite.config.ts`
2. Check that GitHub Pages is enabled in Settings > Pages
3. Ensure the workflow completed successfully (Actions tab)
4. Clear browser cache and try again

### Issue: "Failed to connect to server"

**Solution:**
1. Check Supabase project is running (not paused)
2. Verify edge functions are deployed: `supabase functions list`
3. Check browser console for specific error messages
4. Verify CORS headers in `supabase/functions/server/index.tsx`

### Issue: Gemini AI generation fails

**Solution:**
1. Verify `GEMINI_API_KEY` is set correctly in Supabase secrets
2. Check API quota hasn't been exceeded
3. Ensure using correct model: `gemini-3-flash-preview`
4. Review error logs in Supabase Edge Functions logs

### Issue: Assets not loading on GitHub Pages

**Solution:**
1. Confirm `base` path in `vite.config.ts` matches your repo name
2. Check that all imports use relative paths
3. Rebuild with `npm run build`
4. Verify `dist` folder contains all assets before deployment

### Issue: Dark mode not persisting

**Solution:**
1. Check browser localStorage is enabled
2. Verify `useDarkMode` hook is functioning
3. Clear localStorage and test again: `localStorage.clear()`

---

## Post-Deployment Verification

After successful deployment, verify the following:

1. **Navigate to your live site**
   - Visit: `https://yourusername.github.io/washuemsimreportgenerator/`

2. **Test core functionality**
   - Dashboard loads with metrics
   - Upload a test report
   - Create session notes
   - Generate a test report
   - Create an LST
   - Export a report (all 3 formats)
   - Toggle dark mode

3. **Check mobile responsiveness**
   - Open on mobile device or use browser dev tools
   - Verify horizontal tab scrolling
   - Test touch interactions

4. **Monitor performance**
   - Check browser console for errors
   - Verify API response times
   - Monitor Supabase usage dashboard

---

## Support

For issues or questions:
- Check the [README.md](./README.md) for general information
- Review Supabase logs for backend errors
- Check GitHub Actions logs for deployment issues

---

**Last Updated**: April 2, 2026  
**Version**: 1.0.0
