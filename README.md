# ⚡ OmniDesk Copilot: Real-Time AI Customer Support Coaching Assistant

[![Live Streamlit App](https://img.shields.io/badge/Live%20Demo-Streamlit%20Cloud-FF4B4B?style=for-the-badge&logo=streamlit)](https://omnidesk-copilot.streamlit.app/)
[![React 18](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![Groq LPU](https://img.shields.io/badge/LLM-Groq%20LPU%20(Llama--3.3)-F55036?style=for-the-badge)](https://groq.com/)
[![FAISS](https://img.shields.io/badge/Vector%20DB-FAISS%20CPU-0052CC?style=for-the-badge)](https://github.com/facebookresearch/faiss)

An enterprise-grade, real-time AI copilot designed to empower customer support agents during live customer interactions. The system analyzes inbound customer messages and agent draft responses in sub-second latency (**<0.4s**), providing instant sentiment analysis, tone & empathy scoring, actionable coaching recommendations, compliance guardrails, and automated knowledge base retrieval.

🌐 **Live Deployed App:** [https://omnidesk-copilot.streamlit.app/](https://omnidesk-copilot.streamlit.app/)

---

## 📌 Table of Contents
1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [Key Features & Capabilities](#-key-features--capabilities)
3. [System Architecture](#-system-architecture)
4. [Technology Stack](#-technology-stack)
5. [Repository Structure & File Breakdown](#-repository-structure--file-breakdown)
6. [Local Installation & Setup Guide](#-local-installation--setup-guide)
7. [Running the Application](#-running-the-application)
8. [Streamlit Cloud Deployment Guide](#-streamlit-cloud-deployment-guide)
9. [Security Notes](#-security-notes)
10. [Technical Interview & Viva Q&A](#-technical-interview--viva-qa)

---

## 🎯 Executive Summary & Problem Statement

### The Problem
Customer support agents in high-volume environments face critical challenges:
- High cognitive load while resolving billing, subscription, or technical disputes.
- Inconsistent communication tone and lack of active empathy during escalated customer interactions.
- Company policy and compliance violations (e.g., promising refunds outside policy windows or unverified shipping dates).
- Time lost manually searching through static knowledge base documents and lengthy FAQs.

### The Solution
**OmniDesk Copilot** acts as a live, in-flight pair assistant for customer support agents:
- **Instant Customer Signal Detection:** Identifies customer sentiment (*Positive*, *Negative*, *Neutral*), urgency level (*Low*, *Medium*, *High*), and escalation risk before the agent sends a reply.
- **Real-Time Draft Evaluation:** Rates agent responses on **Tone Alignment**, **Customer Empathy**, and **Clarity & Directness** (0–10 scale).
- **Contextual Coaching Advice:** Generates actionable, concise recommendations to improve customer satisfaction.
- **Semantic FAQ & Policy Retrieval:** Uses **FAISS Vector Search** with `sentence-transformers` to automatically surface relevant company policy snippets with 1-click apply.
- **Multi-Ticket Management:** Fully user-driven custom ticket creation, multi-session switching, history tracking, and deletion.

---

## 🚀 Key Features & Capabilities

| Feature | Description |
|---|---|
| **Sub-Second LLM Intelligence** | Powered by **Groq LPU (Llama-3.3-70B)** delivering structured JSON evaluations in **<0.4 seconds**. |
| **Modern React + Vite Frontend** | Modular 3-column dark UI built with **React 18**, **Lucide Icons**, and responsive CSS design tokens. |
| **Streamlit Cloud Embedding** | Single-file bundled React SPA (`vite-plugin-singlefile`) rendered seamlessly inside Streamlit Cloud via `st.components.v1.html`. |
| **Vector Knowledge Base** | Dense 384-dimensional vector embeddings (`all-MiniLM-L6-v2`) indexed in **FAISS CPU** for sub-10ms policy lookups. |
| **Compliance Guardrails** | Automatic policy violation detection against company SLA rules and escalation limits. |
| **User-Driven Dynamic Sessions** | Create custom tickets on the fly with customer name, tier plan, email, and initial inbound inquiry (no hardcoded templates). |
| **Supervisor Quality Metrics** | Real-time aggregate KPI tracking for average tone, empathy, and clarity across all conversation turns. |
| **Offline HuggingFace Fallback** | Offline pipeline using `distilbert-base-uncased` and `facebook/bart-large-mnli` when running without API keys. |

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[Inbound Customer Message] --> B[React 18 Frontend / Streamlit SPA]
    C[Agent Draft Response] --> B
    
    B -->|REST API / Dynamic Client| D[AICoach Engine - coach.py]
    
    subgraph AI Intelligence Layer
        D -->|Ultra-Fast LLM API| E[Groq Llama-3.3 / Claude]
        D -->|Semantic Vector Search| F[FAISS Vector DB - knowledge_base.py]
        F -->|Dense 384d Embeddings| G[HuggingFace all-MiniLM-L6-v2]
        D -.->|Zero-API Fallback| H[Local HuggingFace Pipeline]
    end
    
    subgraph Output Stream
        D --> I[Customer Signal: Sentiment / Urgency / Risk]
        D --> J[Agent Scores: Tone / Empathy / Clarity]
        D --> K[Actionable Coaching Recommendation]
        D --> L[Compliance & Policy Guardrail Alert]
        D --> M[Knowledge Base Match with 1-Click Apply]
    end
    
    I & J & K & L & M --> B
```

---

## 💻 Technology Stack

- **Primary LLM Engine:** [Groq API](https://groq.com) (`llama-3.3-70b-versatile` / `groq/compound-mini`)
- **Alternative LLM Engine:** [Anthropic Claude](https://anthropic.com) (`claude-3-5-sonnet`)
- **Vector Database:** [FAISS CPU](https://github.com/facebookresearch/faiss) (Facebook AI Similarity Search)
- **Embeddings:** HuggingFace `sentence-transformers/all-MiniLM-L6-v2`
- **Offline NLP Fallback:** HuggingFace Transformers (`DistilBERT` + `BART`)
- **Backend Framework:** Python 3.10+, Flask, Flask-CORS, Streamlit
- **Frontend Framework:** React 18, Vite 6, Lucide React, `vite-plugin-singlefile`
- **Styling:** Custom Dark-Theme CSS Design System (Plus Jakarta Sans, JetBrains Mono)

---

## 📂 Repository Structure & File Breakdown

```
Projech-AG/
│
├── .env                           # Environment variables (API Keys, Models) — DO NOT commit to git
├── .env.example                   # Template environment file (safe to share)
├── requirements.txt               # Python dependencies
├── main.py                        # Central CLI & Flask server launcher
├── streamlit_app.py               # Streamlit Cloud deployment entry point
├── app_streamlit.py               # Streamlit application script
├── README.md                      # Primary GitHub repository documentation
├── project.md                     # Comprehensive technical documentation & Viva Q&A
│
├── coaching_assistant/            # Core AI Coaching Package
│   ├── __init__.py                # Package initializer
│   ├── models.py                  # Dataclasses (Message, ConversationState, CoachingFeedback)
│   ├── coach.py                   # Unified AICoach (Groq + Claude LLM integration)
│   ├── hf_coach.py                # Offline HuggingFace local pipeline (DistilBERT + BART)
│   └── utils.py                   # Robust JSON parsing and text cleanup utilities
│
├── server/                        # Flask Backend & Vector DB
│   ├── __init__.py                # Server package initializer
│   ├── app.py                     # Flask REST server with dynamic session management
│   └── knowledge_base.py          # FAISS vector database indexing and search
│
├── knowledge/                     # Enterprise Knowledge Base Documents
│   ├── faqs.txt                   # Customer support FAQs (billing, returns, technical)
│   └── policies.txt               # Company compliance policies & escalation limits
│
└── frontend/                      # Modern React + Vite Application
    ├── index.html                 # Mount point with Google Fonts
    ├── package.json               # Node.js dependencies (React, Vite, Lucide)
    ├── vite.config.js             # Single-file bundle configuration
    ├── dist/                      # Production single-file bundle (served by Streamlit)
    │   └── index.html             # Self-contained bundle with inlined JS & CSS
    └── src/                       # React Source Code
        ├── App.jsx                # Main application state orchestrator
        ├── index.css              # Dark theme design system & layout styling
        ├── api/                   # REST API client with persistent storage
        │   └── client.js
        └── components/            # Modular UI Components
            ├── TopNav.jsx         # Header navigation, engine chip, actions
            ├── SidebarContext.jsx # Sessions list & customer context card
            ├── ConversationCanvas.jsx # Chat timeline, quick chips, message composer
            ├── CopilotSidebar.jsx # Real-time sentiment, quality scores & coaching
            └── CustomUserModal.jsx # Custom customer creation modal
```

---

## ⚙️ Local Installation & Setup Guide

### 1. Prerequisites
- Python **3.9, 3.10, or 3.11** installed.
- Node.js **18+** & npm installed.
- Free Groq API Key from [console.groq.com](https://console.groq.com).

### 2. Clone the Repository
```bash
git clone https://github.com/Anuragzha/omniDesk-copilot.git
cd omniDesk-copilot
```

### 3. Create and Activate Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies
```bash
# Python dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install
npm run build
cd ..
```

### 5. Configure Environment Variables
Create `.env` in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5000
SECRET_KEY=your-secret-key
```

---

## 🏃 Running the Application

### Option A: Streamlit Application (Local)
```bash
python -m streamlit run streamlit_app.py
```
Open browser at: **`http://localhost:8501`**

### Option B: Flask Full-Stack Server
```bash
python main.py
```
Open browser at: **`http://localhost:5000`**

### Option C: React Dev Server (Hot Reloading)
```bash
cd frontend
npm run dev
```
Open browser at: **`http://localhost:5173`**

---

## ☁️ Streamlit Cloud Deployment Guide

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "deploy: update omnidesk copilot"
   git push origin main
   ```
2. Go to [share.streamlit.io](https://share.streamlit.io) and create a **New app**.
3. Select your repository, branch `main`, and set **Main file path** to `streamlit_app.py`.
4. In **Advanced settings** -> **Secrets**, add:
   ```toml
   GROQ_API_KEY = "gsk_YourActualGroqKeyHere"
   GROQ_MODEL = "llama-3.3-70b-versatile"
   ```
5. Click **Deploy**!

---

## 🔒 Security Notes

| Risk | Mitigation |
|---|---|
| **API Key Exposure** | `.env` and `.streamlit/secrets.toml` are strictly gitignored. |
| **In-Memory Volatility** | Browser sessions use persistent `localStorage` and REST fallback. |
| **Model Cold Starts** | Fast zero-delay keyword fallback prevents HuggingFace download freezes. |

---

## 🎓 Technical Interview & Viva Q&A

### Q1: Why did you choose Groq instead of standard OpenAI or Claude APIs?
> **Answer:** Customer support coaching happens in real-time while the agent is typing. Standard cloud LLMs typically take 2.5 to 5 seconds per turn, which creates awkward delays. Groq runs on custom **LPU (Language Processing Unit)** hardware, providing inference speeds under **0.3 to 0.5 seconds**, making live, in-flight coaching feasible without disrupting agent workflow.

### Q2: How does the Knowledge Base search work under the hood?
> **Answer:** We implemented a dense vector retrieval pipeline:
> 1. FAQs and company policies are chunked and converted to 384-dimensional dense embeddings using HuggingFace's `all-MiniLM-L6-v2`.
> 2. Vectors are indexed into a **FAISS CPU Index** (`IndexFlatL2`).
> 3. Incoming customer queries are converted to embeddings and queried against the index in <10ms to find the most relevant policy snippets.

### Q3: How is the React application served inside Streamlit Cloud?
> **Answer:** Streamlit Cloud natively executes Python scripts. We configured `vite-plugin-singlefile` to bundle the entire React 18 frontend into a self-contained `frontend/dist/index.html`. In `streamlit_app.py`, Streamlit reads this file and renders it via `st.components.v1.html(..., height=720)`, giving the user a 100% native React Single Page Application (SPA) experience directly on the Streamlit deployment URL.

### Q4: How is session state managed?
> **Answer:** Sessions are user-driven and managed dynamically via a localized state manager in `client.js` backed by `localStorage`. Agents can create custom tickets, send multi-turn messages, inspect past turn coaching history, and delete resolved sessions with instant persistence across reloads.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
