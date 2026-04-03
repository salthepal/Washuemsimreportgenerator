# WashU Emergency Medicine: Simulation & Safety Intelligence Platform

> **Clinical Workflow & Latent Safety Threat (LST) Tracking Architecture**

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Private Repository](https://img.shields.io/badge/Security-Private_Access-A51417)

## Overview

The **WashU Emergency Medicine Simulation & Safety Intelligence Platform** is a targeted enterprise web application engineered for the WashU Emergency Medicine department. The platform natively streamlines post-simulation qualitative report generation and securely tracks **Latent Safety Threats (LSTs)** identified during clinical bedside use.

By integrating Google's Gemini 3.0 Flash Experimental AI via edge computing, the application drastically reduces clinical documentation overhead while identifying systemic improvement opportunities within the hospital ecosystem.

---

## 🚀 Capabilities

### Clinical Document Generation
- **AI-Powered Synthesis**: Generate structured, professional clinical reports from raw session notes utilizing generative AI models.
- **Style Guide Adaptation**: The system analyzes imported historical PDFs and DOCX files to conform newly generated reports to standard institutional formatting.
- **Workflow Automation**: Batch reporting operations, one-click rich-text editing, and robust multi-format exporting (PDF, DOCX).

### Latent Safety Threat (LST) Core
- **Threat Intelligence**: Track, categorize, and resolve critical system gaps. Includes metadata mapping for severity, hospital location, and personnel tagging.
- **Recurrence Tracking**: Flags recurring safety threats algorithmically to highlight pervasive architectural protocols requiring root-cause intervention.
- **Active Dashboarding**: High-level statistical views of facility performance directly aggregated from the active storage layer.

### Enterprise User Experience
- **Accessibility Primary**: Full WCAG AA compliance with high-contrast accessibility themes and stateful Dark Mode.
- **Asymmetric Loading**: Utilizes TanStack React Query for aggressive UI caching and background stale-time refreshing, optimizing mobile bandwidth constraints.
- **Bedside Responsiveness**: Fully scalable layouts mapped distinctly for medical tablets vs clinical workstation desktop configurations.

---

## 🧩 Architectural Stack

The application employs a decoupled SPA design running locally in the client, securely proxying external queries to the edge.

- **Frontend Structure**: React 18 / TypeScript
- **State & Data Caching**: TanStack React Query
- **Routing Engine**: React Router (HashRouter Mode)
- **Styling**: Tailwind CSS v4 alongside Radix UI Access Primitives
- **Artificial Intelligence**: Google Gemini API
- **Middleware & Database**: Supabase PostgreSQL + Edge Functions (Deno)
- **Primary Hosting**: GitHub Pages (Static Hosting)

---

## 🔒 Security Posture

A strict layer of defense protects the computational boundaries:

1. **Private Access Control**: This repository is securely hosted as a Private instance, ensuring access controls strictly govern the source logic.
2. **Edge Variable Encryption**: Critical operational secrets, including the Google Gemini authorization tokens and Database keys, are isolated behind Supabase Edge Function environment variables.
3. **Stateless Frontend**: The client operates efficiently without hardcoding root access. User authorization tokens negotiate dynamically against Row Level Security (RLS) tables.
4. **Time-Limited Blob Addressing**: Extensively uses cryptographically signed URLs for all blob storage retrieval to prevent document data leakage.

---

## ⚙️ Quick Start

### 1. Repository Installation
Ensure you have Node.js 18+ installed on your local environment.

```bash
git clone https://github.com/salthepal/WashUSimIntelligence.git
cd WashUSimIntelligence
npm install
```

### 2. Configure Database Backend
Set up a Supabase KV store instance by executing the following DDL block in your instance:

```sql
CREATE TABLE IF NOT EXISTS kv_store_7fe18c53 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kv_store_key ON kv_store_7fe18c53(key);
```

### 3. Local Deployment
Boot up your Vite compiler for real-time HRM replacement over localhost:

```bash
npm run dev
```

### 4. Production Deployment
This repository is configured natively for immediate delivery through the `npm run deploy` wrapper script via the `gh-pages` library.

```bash
# This builds the production /dist target and strictly pushes to the remote gh-pages branch. 
npm run deploy
```

---

## ⌨️ Advanced Operations

For experienced power-users, you can skip UI clicks through the following keybindings:

*   **`T`** - Initiate Platform Interactive Tour
*   **`Ctrl + G`** - Start Quick Generate Output
*   **`Ctrl + U`** - Upload Clinical Files
*   **`Ctrl + F`** - Search Active Focus Directory
*   **`Esc`** - Dismiss Top-Level Dialogs

---

## 📄 Licensing & Administration

**Proprietary Software - Washington University School of Medicine**

All rights reserved. This software architecture was developed for internal data utilization by Washington University Emergency Medicine protocols and may not be redistributed, reverse-compiled, or used externally without explicit authorization.

> For deployment operations, infrastructure modifications, or feature proposals, please contact the WashU EM intelligence development team.