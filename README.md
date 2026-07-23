# MedChat AI 🏥 — Full-Stack Clinical Assistant & Diagnostics Platform

> An end-to-end, production-grade AI medical assistant web application built with **React 19**, **Node.js/Express**, **MongoDB**, **Google Gemini Flash**, and **HuggingFace Inference API**.

[![React 19](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.3.0-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_4.19-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.4-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-Flash_Lite-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Recharts](https://img.shields.io/badge/Recharts-Analytics-FF6384?style=for-the-badge)](https://recharts.org/)

---

## 🌟 Key Features

- 📊 **Patient History Dashboard** — Comprehensive health & consultation dashboard featuring session timeline grouping (Today, Yesterday, This Week, Older), MongoDB aggregated statistics, Recharts monthly trend charts, document vault, and instant session continuation.
- 🩺 **AI Symptom Assessment (MCQ Engine)** — Interactive structured symptom evaluation using custom JSON protocols to generate differential diagnosis reports.
- 📄 **RAG Medical Report Analysis** — Extract & analyze full text from PDFs, lab reports, and prescriptions (using `pdfjs-dist` & Gemini Flash Vision OCR) stored in MongoDB for context-aware Q&A.
- 🩻 **Radiological Scan Analysis** — Multi-modal interpretation of X-Ray, MRI, and CT scan images with DICOM-style interactive image controls (zoom & contrast).
- 🔬 **Live Medical Research Engine** — Direct zero-cost integration with WHO Global Health Observatory, WHO Outbreak News, and PubMed E-utilities APIs for cited evidence-based answers.
- 🔐 **Production JWT Authentication** — Secure user sign up and log in powered by bcrypt password hashing and token-protected Express API endpoints.
- 📋 **Print-Ready PDF Reports** — One-click clinical report export formatted with patient demographics, symptom lists, probability distribution charts, and attached scan images.
- 🌍 **Multi-Language Support (i18n)** — Dynamic language switching with fallback support across 11 languages.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React 19 SPA)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │Dashboard │  │ ChatPage │  │ ScanPage │  │ PatientHistory │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│        │             │             │                │           │
│        └─────────────┼─────────────┴────────────────┘           │
│                      ▼                                          │
│          lib/ Service Layer (api.js, rag.js, search.js)         │
└───────────────┬──────────────────┬──────────────────────────────┘
                │ JWT              │ Direct Stream
                ▼                  ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│ Node.js/Express      │  │       External AI & Data Services    │
│ Backend (Port 5001)  │  │                                      │
│                      │  │  • Google Gemini 3.1 Flash Lite      │
│  /api/auth           │  │  • HuggingFace Qwen2.5-72B (Fallback) │
│  /api/sessions       │  │  • WHO Global Health Observatory     │
│  /api/messages       │  │  • WHO Disease Outbreak News         │
│  /api/documents      │  │  • NCBI PubMed E-utilities           │
└──────────┬───────────┘  └──────────────────────────────────────┘
           │ Mongoose ODM
           ▼
┌──────────────────────┐
│ MongoDB Atlas        │
│                      │
│ • users              │
│ • chatsessions       │
│ • messages           │
│ • userdocuments      │
└──────────────────────┘
```

---

## 📁 Repository Structure

```
MedChat-AI/
├── package.json                 # Monorepo root configuration & scripts
├── README.md                    # Project documentation
│
├── backend/                     # Node.js + Express REST API Server
│   ├── server.js                # Server entry point & DB connection
│   ├── .env.example             # Backend environment template
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── models/                  # Mongoose MongoDB schemas
│   │   ├── User.js              # User authentication schema
│   │   ├── ChatSession.js       # Consultation session schema
│   │   ├── Message.js           # Chat message schema
│   │   └── UserDocument.js      # Uploaded document RAG schema
│   └── routes/                  # Express REST API routes
│       ├── auth.js              # Signup, login, auth validation
│       ├── sessions.js          # Session CRUD & aggregated summary API
│       ├── messages.js          # Message persistence
│       └── documents.js         # Document upload, context & delete
│
└── frontend/                    # React 19 + Vite Single Page App
    ├── index.html               # Main HTML entry
    ├── vite.config.js           # Vite build configuration
    ├── tailwind.config.js       # Tailwind CSS styling configuration
    ├── .env.example             # Frontend environment template
    └── src/
        ├── main.jsx             # React DOM root render
        ├── App.jsx              # AppShell & React Router configuration
        ├── config.js            # System prompts & AI configuration
        ├── index.css            # CSS custom properties & theme tokens
        ├── components/          # Reusable UI components
        │   ├── Sidebar.jsx      # Navigation sidebar
        │   ├── TopBar.jsx       # Header bar with user profile & i18n
        │   ├── InputArea.jsx    # Chat input bar
        │   ├── Message.jsx      # Chat bubble & markdown renderer
        │   ├── SymptomChecker.jsx # MCQ cards UI
        │   ├── DocumentUpload.jsx # Medical document upload modal
        │   └── ProtectedRoute.jsx # Route authentication guard
        ├── contexts/
        │   ├── AuthContext.jsx  # Auth state manager
        │   └── LanguageContext.jsx # i18n manager
        ├── lib/                 # Core service utilities
        │   ├── api.js           # Gemini & HuggingFace stream engine
        │   ├── api-client.js    # Express Backend HTTP API client
        │   ├── rag.js           # PDF & Vision OCR text extraction
        │   ├── search.js        # WHO & PubMed search orchestrator
        │   └── export.js        # HTML to PDF clinical report export
        └── pages/               # Application view routes
            ├── AuthPage.jsx     # Login & Signup screen
            ├── Dashboard.jsx    # Home dashboard screen
            ├── ChatPage.jsx     # General & Research chat page
            ├── ScanAnalysis.jsx # X-Ray / MRI / CT scan page
            └── PatientHistory.jsx # Consultation history & analytics page
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (Local instance or MongoDB Atlas cluster)
- **Google Gemini API Key** (Free from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone Repository
```bash
git clone https://github.com/prathmesh4001/MedChat-AI.git
cd MedChat-AI
```

### 2. Install All Dependencies
```bash
# Installs root, backend, and frontend dependencies in one command
npm run install:all
```

### 3. Configure Environment Variables

**Backend Environment (`backend/.env`):**
```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/medchat
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**Frontend Environment (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5001
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_KEY=your_huggingface_token_optional
```

### 4. Start Development Servers
```bash
# Starts both Backend (Port 5001) & Frontend (Port 5173) concurrently
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔌 REST API Endpoints

| Category | Method | Endpoint | Description | Auth |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/signup` | Register new user account | No |
| **Auth** | `POST` | `/api/auth/login` | Authenticate user & receive JWT | No |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated user profile | JWT |
| **Sessions** | `POST` | `/api/sessions` | Create a new chat session | JWT |
| **Sessions** | `GET` | `/api/sessions` | List user sessions | JWT |
| **Sessions** | `GET` | `/api/sessions/summary` | Fetch MongoDB aggregated history & stats | JWT |
| **Sessions** | `DELETE` | `/api/sessions/:id` | Delete a session | JWT |
| **Messages** | `POST` | `/api/messages` | Save a message to a session | JWT |
| **Messages** | `GET` | `/api/messages/:sessionId` | Fetch all messages for a session | JWT |
| **Documents** | `POST` | `/api/documents` | Upload & index document text | JWT |
| **Documents** | `GET` | `/api/documents` | List user uploaded documents | JWT |
| **Documents** | `GET` | `/api/documents/context` | Concatenate all document text for RAG | JWT |
| **Documents** | `DELETE` | `/api/documents/:fileName` | Delete document by name | JWT |

---

## 🚀 Future Improvements & Roadmap

- 🩺 **Role-Based Doctor & Patient Dashboards** — Implement distinct role-based views (`Patient` vs `Doctor`) allowing clinicians to review shared patient histories, add clinical notes, and manage consultation requests.
- 🩻 **Interactive Canvas DICOM Annotations** — Enable bounding-box overlays and interactive anatomical pin markers directly on X-Ray, MRI, and CT scan canvases.
- 🧬 **Fine-Tuned Specialized Medical Models** — Integrate specialized domain models (e.g. BioMistral or Med-PaLM 2) for specialized oncology, cardiology, and radiology sub-specialties.
- 🧪 **Automated Test Suite** — Add end-to-end integration and unit testing using Jest, React Testing Library, and Supertest for API boundary coverage.
- 📱 **Mobile Application & PWA** — Package the application as a Progressive Web App (PWA) with offline capabilities and cross-platform React Native support.
