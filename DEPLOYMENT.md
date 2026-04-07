# Deployment Guide

This document provides step-by-step instructions for deploying **WashU Sim Intelligence** to the Cloudflare-native production stack.

## 🏛️ Architecture Overview
The platform has been migrated from legacy Supabase infrastructure to a high-concurrency Cloudflare architecture:
- **Frontend**: React SPA deployed via Cloudflare Pages.
- **Backend API**: Cloudflare Workers (Hono).
- **Database**: Cloudflare D1 (Relational SQL with FTS5).
- **Object Storage**: Cloudflare R2 (Session documents/media).
- **History/Audit**: Automated D1 Triggers (Safety Audit Logs).
- **Security**: Cloudflare KV, Secrets, and Turnstile.

---

## 🌐 1. Frontend Deployment (Cloudflare Pages)

### Configuration
The frontend is built using Vite and deployed directly to the Cloudflare network from the `main` branch.
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Native Routing**: Automatically handled by Cloudflare Pages.

### Automated Deployment
Connecting the GitHub repository to Cloudflare Pages handles all production builds and edge deployments automatically on push.

---

## ⚡ 2. Backend Deployment (Cloudflare Workers)

### Prerequisites
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`npx wrangler login`).
- A Cloudflare Account with D1, R2, and KV namespaces enabled.

### Database Setup (D1)
1.  **Create Database**:
    ```bash
    npx wrangler d1 create washusim-db
    ```
2.  **Initialize Schema**:
    ```bash
    cd worker
    npx wrangler d1 execute washusim-db --file=./schema.sql --remote
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
npm run deploy
```

---

## 🔑 3. Environment Variables & Secrets

### Required Backend Secrets (Workers)
Configure the following secrets in your Cloudflare Worker:
```bash
# Gemini API Key for report generation
npx wrangler secret put GEMINI_API_KEY

# Cloudflare Turnstile Secret Key for spam protection
npx wrangler secret put TURNSTILE_SECRET_KEY

# Optional: Admin token for protected administrative routes
npx wrangler secret put ADMIN_TOKEN
```

### Frontend Configuration
The frontend automatically connects to the backend in production using the same domain context. For local development, update the API URL in `src/app/utils/api.ts` if needed.

---

## 🔒 Security & Governance
- **Data Minimization**: Automatically strips base64 image data before SQL persistence to optimize D1 storage and improve UI response times.
- **Audit Logging**: All administrative actions are recorded in the central D1 `audit_logs` table.
- **Zero Trust**: For enterprise environments, we recommend deploying **Cloudflare Access** in front of the application dashboard.

---

**Built for Clinical Safety, Powered by Intelligence.**  
© 2026 Washington University School of Medicine.
