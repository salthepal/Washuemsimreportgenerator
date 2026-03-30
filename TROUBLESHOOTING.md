# Troubleshooting Guide - Server Connection Issue

## Issue
"Failed to connect with server, check console"

## Possible Causes & Solutions

### 1. **Build Error from New Imports**
The new utility files might have syntax errors.

**Check:**
- Open browser console (F12)
- Look for any red error messages
- Check for "Cannot find module" errors

**Fix:**
If you see module errors, the build system might not have reloaded. Try:
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache

---

### 2. **Missing mammoth Import**
The `processDocxFile()` function uses mammoth but might not be importing it correctly.

**Check `/src/app/utils/document.ts`:**
```typescript
import mammoth from 'mammoth'; // This line should be at the top
```

**Fix Applied:** The import is already there, so this should be fine.

---

### 3. **Server Not Running**
The Supabase edge function might not be running.

**Check:**
- Look in the browser Network tab (F12 → Network)
- Try to access: `https://[your-project-id].supabase.co/functions/v1/make-server-7fe18c53/health`
- If you get a 404 or timeout, the server isn't running

**Fix:**
The server should auto-deploy. If it's not running, the Supabase platform might need to restart it.

---

### 4. **CORS Error**
The browser might be blocking requests.

**Check Console for:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Fix:**
The server already has CORS enabled, so this shouldn't be the issue.

---

### 5. **TypeError in Utility Functions**
One of the new utility functions might have a bug.

**Most Likely Issue:**
The `sanitizeJSON` function might be causing issues if it receives unexpected data types.

**Quick Fix:**
Temporarily revert the sanitization calls to test if that's the issue.

---

## Immediate Fix - Rollback Changes

If the app is completely broken, here's how to quickly restore functionality:

### Step 1: Revert case-files.tsx
Remove the new imports and restore the old inline code for DOCX processing.

### Step 2: Revert session-notes.tsx  
Remove the sanitizeJSON imports.

### Step 3: Revert upload-reports.tsx
Remove the new utility imports.

---

## Better Fix - Debug the Actual Issue

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for the FIRST error message (usually the root cause)
4. Share that error message

### Step 2: Check Network Tab
1. Go to Network tab in DevTools
2. Try to perform an action (like uploading)
3. Look for failed requests (red)
4. Click on the failed request
5. Check the "Response" tab for error details

### Step 3: Check Server Logs
The server logs should show if requests are reaching the backend.

---

## Most Likely Solution

Based on the error "failed to connect with server", this is probably:

**Issue:** The frontend code has a syntax error preventing it from loading

**Solution:**  
1. Hard refresh the browser (Ctrl+Shift+R)
2. Check console for the actual error
3. If there's a "Cannot find module" error, it means one of the new utility files has an issue

---

## Emergency Rollback Commands

If you need to quickly restore the app, I can:
1. Remove all the new utility imports from the 3 components
2. Restore the original inline code
3. Keep the optimization changes in separate branch for later

Just say "rollback phase 2" and I'll restore everything to working state.

---

## Next Steps

Please:
1. Open browser console (F12)
2. Share the FIRST error message you see
3. I'll provide a targeted fix based on the actual error
