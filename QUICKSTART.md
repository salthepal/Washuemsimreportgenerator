# 🚀 Quick Start - GitHub Pages Deployment

**Version 1.0.0** - Ready to deploy in 5 minutes!

---

## Prerequisites Checklist
- [ ] GitHub account created
- [ ] Git installed locally
- [ ] Node.js 18+ installed
- [ ] Supabase project created (optional for static demo)

---

## Step 1: Push to GitHub (2 minutes)

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - WashU EM Sim v1.0.0"

# Create GitHub repository (via GitHub web interface)
# Then add remote and push:
git remote add origin https://github.com/yourusername/washuemsimreportgenerator.git
git branch -M main
git push -u origin main
```

---

## Step 2: Enable GitHub Pages (1 minute)

1. Go to your repository on GitHub
2. Click **Settings** (top navigation)
3. Click **Pages** (left sidebar)
4. Under "Build and deployment":
   - **Source**: Select **GitHub Actions**
5. Click **Save**

✅ That's it! GitHub Actions will automatically deploy.

---

## Step 3: Monitor Deployment (1 minute)

1. Go to **Actions** tab in your repository
2. You'll see "Deploy to GitHub Pages" workflow running
3. Wait for green checkmark (usually 2-3 minutes)
4. Your site is live! 🎉

**Your URL:**
```
https://yourusername.github.io/washuemsimreportgenerator/
```

---

## Step 4: Configure Backend (Optional - 5 minutes)

### If you want full functionality with AI and database:

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Wait for setup (~2 min)

2. **Create Database Table:**
   - Go to SQL Editor
   - Run this SQL:
   ```sql
   CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (
     key TEXT NOT NULL PRIMARY KEY,
     value JSONB NOT NULL
   );
   ```

3. **Get API Keys:**
   - Settings → API
   - Copy: Project URL, Anon Key, Service Role Key

4. **Configure in App:**
   - The app will prompt you for these on first use
   - OR set them as Supabase secrets

5. **Get Gemini API Key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create API key
   - Enter when prompted in the app

---

## Verification Checklist

After deployment, verify:

- [ ] Site loads at GitHub Pages URL
- [ ] Header shows "WashU Emergency Medicine"
- [ ] All 7 tabs are visible and clickable
- [ ] Dark mode toggle works (top right)
- [ ] Tour starts when pressing `T` key
- [ ] No 404 errors in browser console

---

## Common Issues & Quick Fixes

### Issue: Site shows 404
**Fix:** Check that base path in `vite.config.ts` matches your repo name:
```typescript
base: '/washuemsimreportgenerator/', // Must match repo name
```

### Issue: Assets not loading
**Fix:** Rebuild and redeploy:
```bash
npm run build
git add dist -f
git commit -m "Update build"
git push
```

### Issue: Workflow fails
**Fix:** Check GitHub Actions logs:
- Actions tab → Failed workflow → Click to see logs
- Usually a Node.js version issue - workflow uses Node 20

---

## What Works Without Backend

✅ **With static deployment only:**
- UI navigation (all 7 tabs)
- Dark mode
- Interactive tour
- Form inputs
- Responsive design
- Mobile optimization

❌ **Requires backend (Supabase):**
- Upload reports
- Generate AI reports
- Save session notes
- LST tracking
- Data persistence

---

## Next Steps

### For Production Use:
1. ✅ Complete Step 4 (Backend Configuration)
2. ✅ Train team on features (use `T` key for tour)
3. ✅ Upload past reports as style guides
4. ✅ Start creating session notes
5. ✅ Generate first AI report
6. ✅ Begin LST tracking

### For Demo/Preview:
1. ✅ Share GitHub Pages URL with team
2. ✅ Showcase UI and navigation
3. ✅ Demonstrate dark mode
4. ✅ Show responsive design on tablet
5. ✅ Decide on backend setup

---

## Support Documentation

- **Detailed Deployment:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Full Features:** See [README.md](./README.md)
- **Development:** See [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Version History:** See [CHANGELOG.md](./CHANGELOG.md)

---

## Emergency Rollback

If something goes wrong:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or restore from specific commit
git reset --hard <commit-sha>
git push origin main --force
```

---

## Success! 🎉

Your WashU EM Sim Safety Intelligence Platform is now deployed and accessible at:

**`https://yourusername.github.io/washuemsimreportgenerator/`**

Share this URL with your team and start improving simulation report workflows!

---

**Questions?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive troubleshooting.

**Version**: 1.0.0  
**Updated**: April 2, 2026
