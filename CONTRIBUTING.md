# Contributing to WashU EM Sim Intelligence Platform

Thank you for your interest in contributing to the **WashU Emergency Medicine Simulation & Safety Intelligence Platform**. This project is a Cloudflare-native platform for high-fidelity clinical simulation tracking.

## 🎯 Our Mission
To provide a Zero-Latency, high-concurrency intelligence layer for Washington University Department of Emergency Medicine, prioritizing psychological safety (Just Culture) and actionable latent safety threat (LST) synthesis.

## 🚀 Development Environment

### 1. Prerequisites
- **Node.js**: v20 or higher.
- **Cloudflare Account**: Access to D1, R2, and KV namespaces.
- **Wrangler CLI**: `npm install -g wrangler`.

### 2. Local Setup
```bash
# Clone the repository
git clone https://github.com/salthepal/WashUSimIntelligence.git
cd WashUSimIntelligence

# Install Root Dependencies (Frontend)
npm install

# Install Worker Dependencies (Backend)
cd worker
npm install
```

### 3. Running Locally
- **Frontend**: `npm run dev` (Vite)
- **Backend**: `cd worker && npx wrangler dev`

---

## 🛠️ Architecture & Technology Stack

### Backend (Cloudflare Native)
- **Runner**: Cloudflare Workers with `Hono`.
- **Database**: `D1 SQL` for relational structured data (Reports, LSTs, Audit Logs).
- **Storage**: `R2 Object Storage` for persisting generated documents and image assets.
- **Intelligence**: `Google Gemini 3 Flash` (Asynchronous streaming via edge integration).

### Frontend (React Dashboard)
- **Framework**: React 18 / Vite / TypeScript.
- **Styling**: Tailwind CSS v4 with WashU PMS 200/350 theme tokens.
- **State**: `@tanstack/react-query` with persistence layers for offline hospital use.

---

## 📝 Contribution Guidelines

### Branching Strategy
- `feat/`: New clinical features or AI prompts.
- `fix/`: Stability improvements or database edge cases.
- `docs/`: Documentation refinements.
- `refactor/`: Architectural transitions.

### Standards & Quality
- **Type Safety**: No `implicit-any`. All API responses from D1/Workers must be strictly typed.
- **Data Integrity**: Database interactions should respect relational constraints. Use migrations in `schema.sql`.
- **UI/UX**: Strictly adhere to the **WashU School of Medicine** design language. Ensure dark mode parity and hospital tablet responsiveness.
- **Security**: Never commit secrets. Use `npx wrangler secret put` for Gemini keys and tokens.

---

## 🧪 Testing Protocol
- **Build Validation**: `npm run build` must succeed before any PR submission.
- **Edge Testing**: Verify that AI streaming works without interruption.
- **Schema Validation**: Ensure D1 triggers correctly synchronize the FTS5 search index.
- **Accessibility**: Verify WCAG AA compliance for accessibility in high-stress clinical environments.

---

## 📄 Governance
By contributing, you agree that your code will be under the proprietary license of the **Washington University School of Medicine**.

**Built for Clinical Safety, Powered by Intelligence.**  
© 2026 Washington University Simulation Intelligence Team
