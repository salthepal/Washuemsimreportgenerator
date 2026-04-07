# WashU Sim Intelligence

**WashU Sim Intelligence** is a simulation-driven Safety & Learning Intelligence System developed for the **Washington University School of Medicine, Department of Emergency Medicine**.

The platform streamlines the transition from high-fidelity clinical simulations to actionable safety insights by automating report generation and tracking system-level vulnerabilities.

---

## 🏛️ Project Overview

WashU Sim Intelligence is specialized for clinical simulation programs, prioritizing psychological safety (**"Just Culture"**) and systemic improvement. It acts as a bridge between simulation data and institutional safety intelligence.

### Key Capabilities

*   **⚡ AI-Powered Synthesis**: Generate simulation reports using prompts tailored to clinical safety and "Just Culture" frameworks.
*   **🏥 LST Audit Tracking**: Centralized management of **Latent Safety Threats** with automated revision history.
*   **🔍 Universal Search**: High-performance searchable library of clinical scenarios and historical reports using FTS5 Full-Text Search.
*   **💧 Atomic Hydration**: Optimized API loading that populates all core safety datasets in a single network request.
*   **📶 Offline Resilience**: Persistence layers ensuring simulation specialists can maintain documentation in hospital environments with intermittent medical Wi-Fi.

---

## 🏗️ System Architecture

Built on a globally distributed Cloudflare-native stack for maximum reliability:

- **Frontend**: React SPA (Vite + TypeScript) optimized for clinical bedside tablet use.
- **Backend API**: Cloudflare Workers (Hono) running at the edge.
- **Intelligence**: Real-time asynchronous streaming via **Google Gemini Flash**.
- **Data Primitives**: 
  - **Relational SQL**: Cloudflare D1
  - **Object Storage**: Cloudflare R2
  - **Metadata Cache**: Cloudflare KV

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v20 or higher.
- **Cloudflare Account**: With access to D1, R2, and KV.
- **Google AI Studio Key**: For the Gemini API.

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/salthepal/WashUSimIntelligence.git
   cd WashUSimIntelligence
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup (Wrangler)**:
   ```bash
   cd worker
   npm install
   npx wrangler dev
   ```

---

## 🚀 Deployment

The system is designed for continuous delivery using GitHub Actions:

- **Frontend**: Automatically deployed via **Cloudflare Pages**.
- **Backend**: Update resource IDs in `wrangler.toml` and run `npm run deploy` in the `worker/` directory.

---

## 🔒 Security & Governance

- **Just Culture**: Reports are structured to prioritize systemic improvements over individual performance.
- **Compliance**: Leveraging HIPAA-compliant storage primitives for clinical data sovereignty.
- **Spam Protection**: Integrated with **Cloudflare Turnstile** for all public-facing generation endpoints.

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. See [LICENSE.md](./LICENSE.md) for full details.

---

<p align="center">
  © 2026 Washington University School of Medicine. Emergency Medicine Simulation.
</p>
