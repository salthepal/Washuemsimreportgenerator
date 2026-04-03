# Deployment Guide

This document provides comprehensive instructions for deploying the WashU EM Sim Intelligence Platform to GitHub Pages.

## 🌐 GitHub Pages Deployment

### Prerequisites

- GitHub account with repository access
- Repository configured for GitHub Pages
- Supabase project set up with KV Store table
- Google Gemini API key

### Configuration

The project is pre-configured for GitHub Pages deployment with:

- **Base Path**: `/washusimintelligence/` (defined in `vite.config.ts`)
- **Build Output**: `dist` folder
- **Routing**: React Router with Hash History mode (`HashRouter`) to prevent 404 errors on page reload.

### Method 1: Automated Deployment with GitHub Actions (Recommended)

This method automatically deploys on every push to the `main` branch.

#### Step 1: Create GitHub Actions Workflow

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

#### Step 2: Configure GitHub Repository

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Commit and push the workflow file

#### Step 3: Trigger Deployment

Push to `main` branch or manually trigger via GitHub Actions tab:

```bash
git add .
git commit -m "chore: add GitHub Actions deployment workflow"
git push origin main
```

#### Step 4: Verify Deployment

- Check the **Actions** tab for build status
- Once complete, visit: `https://yourusername.github.io/washusimintelligence/`

### Method 2: Manual Deployment with gh-pages

Use this method for one-time deployments or when GitHub Actions is not available.

#### Step 1: Install gh-pages

```bash
npm install -g gh-pages
```

Or add to package.json:

```json
{
  "scripts": {
    "build": "vite build",
    "deploy": "npm run build && gh-pages -d dist"
  },
  "devDependencies": {
    "gh-pages": "^6.0.0"
  }
}
```

#### Step 2: Build and Deploy

```bash
npm run deploy
```

This will:
1. Build the production bundle
2. Create/update the `gh-pages` branch
3. Push the `dist` folder contents

#### Step 3: Configure GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Set **Source** to `gh-pages` branch
3. Set folder to `/ (root)`
4. Click **Save**

#### Step 4: Access Your App

Wait a few minutes, then visit:
```
https://yourusername.github.io/washusimintelligence/
```

### Method 3: Manual Branch Deployment

For complete control over the deployment process:

#### Step 1: Build Locally

```bash
npm run build
```

#### Step 2: Push to gh-pages Branch
(Note: Using HashRouter eliminates the need to duplicate index.html to 404.html, as the server naturally loads index.html and React Router intercepts the URL hash).

```bash
# Create gh-pages branch if it doesn't exist
git checkout --orphan gh-pages

# Remove all files except dist
git rm -rf .
git clean -fxd

# Copy dist contents to root
cp -r dist/* .

# Add and commit
git add .
git commit -m "Deploy to GitHub Pages"

# Push to gh-pages branch
git push origin gh-pages --force

# Switch back to main
git checkout main
```

## 🔧 Environment Configuration

### Supabase Setup

The app requires Supabase credentials entered at runtime:

1. **First Launch**: App prompts for Supabase URL, Anon Key, and Service Role Key
2. **Storage**: Credentials stored securely in Supabase environment variables
3. **API Calls**: Backend Edge Functions use these credentials

### Google Gemini API

1. **Obtain API Key**: Get from [Google AI Studio](https://ai.google.dev/)
2. **Enter in App**: Navigate to Settings tab and input key
3. **Security**: Stored in Supabase backend, never exposed in frontend

### Environment Variables (Optional)

For advanced deployments, you can pre-configure secrets:

```bash
# In Supabase Dashboard → Settings → Edge Functions
GEMINI_API_KEY=your_gemini_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚀 Post-Deployment Checklist

After deployment, verify:

- [ ] App loads at `https://yourusername.github.io/washusimintelligence/`
- [ ] All routes work correctly (Dashboard, Upload, Generate, etc.)
- [ ] Dark mode toggle functions
- [ ] API connections to Supabase succeed
- [ ] Gemini AI generation works
- [ ] File uploads and exports function
- [ ] Mobile/tablet responsive design displays correctly
- [ ] Console shows no critical errors

## 🔍 Troubleshooting

### Issue: 404 Page Not Found

**Cause**: Base path mismatch or routing configuration

**Solution**: 
1. Verify `vite.config.ts` has correct `base: '/washusimintelligence/'`
2. Ensure repository name matches base path
3. Check `main.tsx` to verify `<HashRouter>` is wrapping the component tree (Browser router causes 404 on refresh on GH Pages).

### Issue: Assets Not Loading

**Cause**: Incorrect asset paths

**Solution**:
1. Check that `base` in `vite.config.ts` matches repository name
2. Rebuild with `npm run build`
3. Verify assets in dist folder have correct paths

### Issue: API Calls Failing

**Cause**: CORS or Supabase configuration

**Solution**:
1. Verify Supabase Edge Functions are deployed
2. Check CORS headers in `/supabase/functions/server/index.tsx`
3. Confirm API keys are correctly entered in app

### Issue: Blank Page on Load

**Cause**: JavaScript errors or routing issues

**Solution**:
1. Open browser console for error messages
2. Verify React Router configuration
3. Check for console errors related to missing dependencies

### Issue: Slow Load Times

**Cause**: Large bundle size or network latency

**Solution**:
1. Optimize images and assets
2. Use lazy loading for components
3. Enable Vite build optimizations

## 📊 Monitoring Deployment

### GitHub Actions

Monitor build status:
1. Go to **Actions** tab in repository
2. View workflow runs and logs
3. Check for build errors or warnings

### Analytics (Optional)

Consider adding:
- **Google Analytics**: Track usage patterns
- **Sentry**: Monitor runtime errors
- **Lighthouse**: Performance auditing

## 🔄 Updating Deployment

### For Automated Deployment

Simply push to `main` branch:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

GitHub Actions will automatically rebuild and deploy.

### For Manual Deployment

Run the deploy command:

```bash
npm run deploy
```

Or repeat the manual steps from Method 3.

## 🔐 Security Considerations

### Secrets Management

- **Never commit**: API keys, passwords, or credentials to git
- **Use Supabase**: Store sensitive data in backend environment variables
- **Frontend**: Only use public Anon Key, never Service Role Key

### HTTPS

GitHub Pages automatically provides HTTPS. Ensure:
- Mixed content warnings don't appear
- All external resources use HTTPS
- API calls to Supabase use HTTPS endpoints

### CORS

Backend must allow requests from GitHub Pages domain:

```typescript
// In /supabase/functions/server/index.tsx
app.use('*', cors({
  origin: ['https://yourusername.github.io'],
  credentials: true,
}));
```

## 📝 Custom Domain (Optional)

To use a custom domain:

1. **Add CNAME**: Create `public/CNAME` file with your domain
```
washusim.example.com
```

2. **DNS Configuration**: Add CNAME record pointing to `yourusername.github.io`

3. **Update vite.config.ts**: Change or remove base path
```typescript
base: '/', // For custom domain at root
```

4. **GitHub Settings**: Add custom domain in repository settings

## 🎯 Production Optimization

### Build Optimization

Enable production optimizations in `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/washusimintelligence/',
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

### Performance Tips

1. **Code Splitting**: Lazy load route components
2. **Image Optimization**: Compress images before upload
3. **Caching**: Leverage browser caching for static assets
4. **CDN**: Consider using a CDN for faster global delivery

## 📞 Support

For deployment issues:
- **GitHub Actions**: Check workflow logs in Actions tab
- **Supabase**: Verify Edge Functions in Supabase Dashboard
- **Build Errors**: Review Vite build output for errors

---

**Last Updated**: April 2, 2026  
**Version**: 1.0.0  
**Deployment Target**: GitHub Pages at `/washusimintelligence/`
