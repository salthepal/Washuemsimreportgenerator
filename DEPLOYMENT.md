# Deployment Guide (v3.1.0)

This document provides instructions for deploying the **WashU EM Sim Intelligence Platform** to the Cloudflare-native production stack.

## 🏛️ Architecture Overview
The platform has been migrated from legacy Supabase infrastructure to a high-concurrency Cloudflare architecture:
- **Frontend**: React SPA deployed via GitHub Pages.
- **Backend API**: Cloudflare Workers (Hono).
- **Database**: Cloudflare D1 (Relational SQL).
- **Object Storage**: Cloudflare R2 (Session documents/media).
- **Security**: Cloudflare KV (Rate limiting) and Secret Management.

---

## 🌐 1. Frontend Deployment (GitHub Pages)

### Configuration
The frontend is built using Vite and configured for relative path routing.
- **Base Path**: `/washusimintelligence/`
- **Routing**: `HashRouter` (to support direct URL access on static hosting).

### Automated Deployment (GitHub Actions)
The project includes a `.github/workflows/deploy.yml` that triggers on every push to `main`.
1.  **Build**: `npm run build`
2.  **Deploy**: Uploads the `dist/` directory to the `github-pages` environment.

---

## ⚡ 2. Backend Deployment (Cloudflare Workers)

### Prerequisites
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`npx wrangler login`).
- A Cloudflare Account with D1, R2, and KV enabled (Free tier is sufficient).

### Database Setup (D1)
1.  **Create Database**:
    ```bash
    npx wrangler d1 create washusim-db
    ```
2.  **Initialize Schema**:
    ```bash
    cd worker
    npx wrangler d1 execute washusim-db --file=./schema.sql
    ```

### Storage Setup (R2)
1.  **Create Bucket**:
    ```bash
    npx wrangler r2 bucket create washusim-docs
    ```

### Analytics/Cache Setup (KV)
1.  **Create Namespace**:
    ```bash
    npx wrangler kv:namespace create washusim-kv
    ```

### Deployment
Update the `wrangler.toml` file in the `worker/` directory with your resource IDs, then run:
```bash
cd worker
npx wrangler deploy
```

---

## 🔑 3. Environment Variables & Secrets

### Backend Secrets (Workers)
Configure the following secrets in your Cloudflare Worker:
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ADMIN_TOKEN  # If using protected routes
```

### Frontend Configuration
The frontend connects to the backend via the `API_URL` defined in `src/app/utils/api.ts` or detected automatically in production.

---

## 🔒 Security & Governance
- **Data Minimization**: Strips base64 image data before SQL persistence to optimize D1 storage.
- **Audit Logging**: All administrative actions are recorded in the central D1 `audit_logs` table.
- **Access Control**: Ensure the GitHub repository and Cloudflare resources are restricted to authorized departmental personnel.

---

**Built for Clinical Safety, Powered by Intelligence.**
© 2026 Washington University Simulation Intelligence Team
