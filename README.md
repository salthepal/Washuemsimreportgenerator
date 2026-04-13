# WashU Sim Intelligence

**WashU Sim Intelligence** (v3.6.0) is a simulation-driven Safety & Learning Intelligence System developed for the **Washington University School of Medicine, Department of Emergency Medicine**.

The platform streamlines the transition from high-fidelity clinical simulations to actionable safety insights by automating report generation, providing instant RAG-powered clinical search, and tracking system-level vulnerabilities.

---

## 🏛️ Project Overview

WashU Sim Intelligence is specialized for clinical simulation programs, prioritizing psychological safety (**"Just Culture"**) and systemic improvement. It acts as a bridge between simulation data and institutional safety intelligence.

### Key Capabilities

*   **🤖 Ask AI (Clinical RAG)**: A natural-language assistant powered by **Cloudflare AI Search**. Ask complex questions across the entire simulation library (e.g., "What LSTs involve pediatric airway management?") and receive cited answers.
*   **🔍 Hybrid Intelligence Search**: Unified search combining **FTS5 Full-Text Search** for precise keywords and **Cloudflare Vectorize** for deep semantic similarity.
*   **⚡ AI-Powered Synthesis**: Generate professional simulation reports using models tailored to clinical safety and "Just Culture" frameworks.
*   **🏥 LST Audit Tracking**: Centralized site-specific management of **Latent Safety Threats** (LSTs) with automated AI scoring and revision history.
*   **📦 Continuous Indexing**: Auto-mirrors all reports to **Cloudflare R2** as markdown, ensuring the AI Search index is always synchronized with the clinical library.
*   **📸 Media & Photo Attachments**: Seamlessly attach simulation photos via local upload with automatic high-efficiency **WebP compression**.
*   **🖼️ Automated Collage Embedding**: Exported DOCX and PDF reports programmatically generate and embed session photo collages directly into the final documents for offline portability.
*   **🎨 Institutional Branding**: High-contrast dark mode and UI components optimized for the official **WashU Red (#A51417)** and Zinc-charcoal color palette.
*   **💧 Atomic Hydration**: High-speed edge API that populates all core safety datasets in a single network request.

---

## 🏗️ System Architecture

Built on a globally distributed Cloudflare-native stack for maximum reliability:

- **Frontend**: React (Vite + TypeScript + Tailwind) with a streamlined, tablet-optimized dashboard.
- **Backend API**: Cloudflare Workers (Hono) running at the edge.
- **Intelligence**: 
  - **Conversational AI**: **Cloudflare AI Search** (AutoRAG) for library Q&A.
  - **Generative AI**: Asynchronous streaming via **Google Gemini Flash**.
  - **Vector Intelligence**: **Cloudflare Vectorize** with **Workers AI** for semantic indexing.
- **Data Primitives**: 
  - **Relational SQL**: Cloudflare D1
  - **Object Storage**: Cloudflare R2 (Clinical docs & Markdown mirrors)
  - **Metadata Cache**: Cloudflare KV (Rate limiting & Auth)

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: v20 or higher.
- **Cloudflare Account**: With access to D1, R2, Vectorize, and AI Search.
- **Secrets**: 
  - `GEMINI_API_KEY`: For report generation.
  - `AI_SEARCH_TOKEN`: For the RAG assistant.

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

The system uses GitHub Actions for continuous delivery:

- **Frontend**: Automatically deployed via **Cloudflare Pages**.
- **Backend**: Update resource IDs in `wrangler.toml` and run `npm run deploy` in the `worker/` directory.

---

## 🔒 Security & Governance

- **Just Culture**: Reports prioritize growth and systemic fixes over individual blame.
- **Data Sovereignty**: Leverages regional storage primitives to maintain clinical data control.
- **Spam Protection**: All generation endpoints protected by **Cloudflare Turnstile**.

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**. See [LICENSE.md](./LICENSE.md) for full details.

---

<p align="center">
  © 2026 Washington University School of Medicine. Emergency Medicine Simulation.
</p>
