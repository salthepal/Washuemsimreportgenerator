# WashU Sim Intelligence

**WashU Sim Intelligence** is a simulation improvement and Latent Safety Threat (LST) management system developed for the **Washington University School of Medicine, Department of Emergency Medicine**.

The platform helps simulation teams turn high-fidelity clinical scenarios into usable safety work: structured post-session reports, reliable LST identification, follow-up tracking, searchable institutional learning, and documentation that can be shared with educators, safety leaders, and operational stakeholders.

---

## 🏛️ Project Overview

WashU Sim Intelligence is specialized for clinical simulation programs that need more than a written debrief summary. It supports a **Just Culture** approach by helping teams document what happened, identify system vulnerabilities, assign follow-up, and preserve lessons learned across repeated simulations.

The system is designed around the practical workflow of a simulation program:

- Capture what occurred during a session.
- Generate a polished post-session report.
- Identify and classify LSTs.
- Track mitigation status and institutional follow-up.
- Search across prior sessions, scenarios, and safety findings.
- Export clean documents with supporting photos and media.

### Key Capabilities

*   **🏥 LST Identification & Management**: Centralized tracking for **Latent Safety Threats** with categories, severity, status, mitigation notes, and institutional audit history.
*   **📋 Simulation Report Generation**: Converts session notes into professional reports grounded in simulation education, safety improvement, and Just Culture principles.
*   **✅ Follow-Up Workflow Support**: Keeps safety findings visible after the session so unresolved threats can be reviewed, escalated, and closed.
*   **🔍 Institutional Learning Search**: Search across prior scenarios, reports, and safety findings to recognize repeated patterns and recurring operational risks.
*   **📸 Session Media Documentation**: Attach simulation photos and high-resolution media, then include them in exported reports as polished photo collages.
*   **🤖 Clinical Assistant Support**: Uses retrieval and generation models to reduce documentation burden, surface relevant prior evidence, and support faster synthesis.

---

## 🏗️ System Architecture

Built on a Cloudflare-native stack for reliability, fast access, and secure clinical education workflows:

- **Frontend**: React (Vite + TypeScript + Tailwind) with a streamlined, tablet-optimized dashboard.
- **Backend API**: Cloudflare Workers (Hono) running at the edge.
- **Decision Support**: 
  - **Library Q&A**: **Cloudflare AI Search** (AutoRAG) for cited answers across simulation materials.
  - **Report Drafting**: Asynchronous streaming via **Google Gemini Flash**.
  - **Semantic Indexing**: **Cloudflare Vectorize** with **Workers AI** for retrieval across scenarios, reports, and LST records.
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
