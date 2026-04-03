# WashU EM Sim Intelligence v2.1.0 (Enterprise Edition)

A high-performance, professional-grade platform for Medical Simulation Specialists at **Washington University - Department of Emergency Medicine**. 

This system automates the generation of Post-Session Simulation Reports and tracks **Latent Safety Threats (LSTs)** within a "Just Culture" framework.

---

## 🏗️ Architecture (v2.0 "The Cloudflare Shift")

The platform has been migrated from a legacy Supabase-blob backend to a robust, "forever free" distributed architecture on **Cloudflare**.

```mermaid
graph TD
    A[React Dashboard (GitHub Pages)] --> B[Cloudflare Worker]
    B --> C[(Cloudflare D1 SQL)]
    B --> D[Cloudflare R2 Object Storage]
    B --> E[Cloudflare KV Rate Limiter]
    B --> F[Google Gemini AI]
    
    subgraph "Backend (worker/)"
    B
    C
    D
    E
    end
    
    subgraph "Frontend (src/)"
    A
    end
```

### 🗝️ Core Technologies
*   **Frontend**: React 18 / TypeScript / Vite / TailwindCSS / Lucide-React
*   **Backend**: Cloudflare Workers (Hono JS)
*   **Database**: Cloudflare D1 (SQLite-compatible)
*   **Storage**: Cloudflare R2 (Object storage for large reports/files)
*   **AI Engine**: Google Gemini Flash 1.5 (Secure API Integration)
*   **Security**: Cloudflare KV (Rate Limiting), Dependabot (SCA), CodeQL (SAST)

---

### ✨ Key Features
- **Streaming AI Report Generation**: Real-time token streaming for instant "as-it-types" report generation (0s perceived latency).
- **Full-Text Search (FTS5)**: Deep-content searching across all simulation reports using a synchronized SQLite virtual table.
- **Offline-First Dashboard**: Instant loading using React Query persistence (LocalStorage/IndexedDB), even on unstable hospital Wi-Fi.
- **LST Tracking & Merging**: Identifies and tracks Latent Safety Threats over time with a structured "Just Culture" framework.
- **Professional File Management**: Direct R2 storage for persisting report documents and large media.
- **Secure by Design**: Rate-limiting on AI endpoints and automated security scanning (CodeQL/Dependabot).

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (LTS)
*   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/get-started/)
*   A Cloudflare account with D1 and R2 enabled.

### Local Development

1.  **Frontend**:
    ```bash
    npm run dev
    ```
2.  **Backend (Worker)**:
    ```bash
    cd worker
    npx wrangler dev
    ```

### Deployment

*   **Production Frontend**: Deploys automatically to GitHub Pages via `.github/workflows/deploy.yml`.
*   **Production Backend**:
    ```bash
    cd worker
    npx wrangler deploy
    ```

---

## 🔒 Security
This repository is monitored by **GitHub Dependabot** and scanned by **CodeQL** on every push. 

Private secrets (like the Gemini API Key) are managed via Cloudflare Secret Management and never committed to this repository.

---

## 📜 Versioning & Governance
This project follows **Semantic Versioning (SemVer)**.
- **v1.x**: Legacy Supabase / JSON-blob architecture.
- **v2.x**: Current Cloudflare SQL / Distributed Architecture.

Maintainer: **Sim Intelligence Team - Washington University**