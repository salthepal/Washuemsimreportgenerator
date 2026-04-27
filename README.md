# WashU Sim Intelligence

**WashU Sim Intelligence** is a simulation-driven Safety & Learning Intelligence System developed for the **Washington University School of Medicine, Department of Emergency Medicine**.

The platform streamlines the transition from high-fidelity clinical simulations to actionable safety insights by automating report generation, providing instant RAG-powered clinical search, and tracking system-level vulnerabilities.

---

## 🏛️ Project Overview

WashU Sim Intelligence is specialized for clinical simulation programs, prioritizing psychological safety (**"Just Culture"**) and systemic improvement. It acts as a bridge between simulation data and institutional safety intelligence.

### Key Capabilities

*   **🤖 Ask AI (Clinical Assistant)**: A natural-language clinical assistant. Ask complex questions across the entire simulation library and receive cited answers with direct evidence.
*   **⚡ AI-Powered Synthesis**: Generate professional simulation reports using models tailored to clinical safety and "Just Culture" frameworks.
*   **🏥 LST Safety Tracking**: Centralized management of **Latent Safety Threats** (LSTs) with automated AI extraction and institutional audit history.
*   **📸 Media & Photo Attachments**: Seamlessly attach simulation photos and high-resolution media with automated high-efficiency WebP compression.
*   **🖼️ Automated Document Embedding**: Exported DOCX and PDF suites programmatically generate and embed session photo collages directly into the final clinical documents.
*   **🔍 High-Performance Search**: Unified, intelligent search for clinical scenario data, keywords, and semantic concepts.

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
  - `TURNSTILE_SECRET_KEY`: For spam protection on generation endpoints.

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
