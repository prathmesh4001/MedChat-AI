
# 🏥 MedChat AI

### AI-Powered Clinical Assistant & Diagnostics Platform

**Full-stack medical AI web app with symptom analysis, radiological scan interpretation, document RAG, and patient history — built for production.**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-med--chat--ai--neon.vercel.app-00bcd4?style=for-the-badge)](https://med-chat-ai-neon.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-prathmesh4001%2FMedChat--AI-181717?style=for-the-badge&logo=github)](https://github.com/prathmesh4001/MedChat-AI)


[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4.1-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_4.19-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_Mongoose_8.4-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Qwen2.5_72B-FFD21E?style=flat-square&logo=huggingface)](https://huggingface.co/)
[![Recharts](https://img.shields.io/badge/Recharts-Analytics-FF6384?style=flat-square)](https://recharts.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT_+_Bcrypt-000000?style=flat-square&logo=jsonwebtokens)](https://jwt.io/)



## 🌟 Overview

**MedChat AI** is a production-grade, full-stack AI medical assistant that enables patients to:

- Describe symptoms and receive a structured differential diagnosis via an interactive MCQ clinical flow
- Upload medical PDFs, lab reports, and prescriptions for AI-powered RAG document Q&A
- Analyze X-Ray, MRI, and CT scan images with a built-in DICOM-style viewer and AI interpretation
- Search WHO and PubMed in real-time for evidence-based medical research
- View a complete patient history dashboard with consultation timeline, monthly analytics, and document vault
- Export professional PDF diagnostic reports with patient demographics and AI findings

> ⚠️ *MedChat AI is intended for informational and educational purposes only. Always consult a qualified healthcare professional for medical advice.*



## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend App** | [https://med-chat-ai-neon.vercel.app](https://med-chat-ai-neon.vercel.app) |
| **Backend API** | [https://medchat-ai-z6pz.onrender.com](https://medchat-ai-z6pz.onrender.com) |

---

## ✨ Key Features

### 🩺 AI Symptom Assessment (MCQ Clinical Engine)
Interactive 3-step structured symptom evaluation. Each session asks targeted questions about location, severity, and associated symptoms — then generates a differential diagnosis with probability scores (e.g., Tension Headache 60%, Migraine 25%).

### 📄 RAG Medical Document Analysis
Upload PDFs, lab reports, and prescriptions. Text is extracted using `pdfjs-dist` and — when a valid Gemini API key is configured — image OCR is performed with Gemini Flash Vision. All text is indexed in MongoDB per user. During chat, your documents are automatically injected as context for relevant AI responses.

### 🩻 Radiological Scan Analysis (X-Ray / MRI / CT)
A DICOM-style scan viewer with zoom, contrast, and brightness controls. Upload any scan image and receive an AI-generated radiological diagnostic report covering bone alignment, joint spaces, soft tissue density, and pathology assessment.

### 🔬 Live Medical Research Engine
Direct integration with free public medical data APIs:
- **WHO Global Health Observatory** — global disease statistics
- **WHO Disease Outbreak News** — active outbreak alerts
- **NCBI PubMed E-utilities** — peer-reviewed research articles

### 📊 Patient History Dashboard
A full Recharts-powered analytics dashboard showing:
- Total consultations, uploaded documents, days active, total messages
- Monthly consultation bar chart (last 6 months)
- Date-grouped session timeline (Today / Yesterday / This Week / Older)
- Session resume — click "Continue Chat" to reload any previous session

### 🔐 Production JWT Authentication
- Bcrypt password hashing
- 7-day JWT token persistence in `localStorage`
- All session, message, and document routes are protected

### 📋 Print-Ready PDF Export
One-click clinical report export with:
- Patient demographics (name, age, gender)
- Symptom history, differential diagnosis probability chart
- AI recommendations and warning signs
- Optional attached scan image

### 🌍 Multi-Language Support (i18n)
11 languages supported with dynamic switching, fallback to English, and right-to-left layout support.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                       BROWSER (React 19 SPA)                       │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │Dashboard │  │ ChatPage │  │ ScanAnalysis│  │ PatientHistory │  │
│  └──────────┘  └──────────┘  └─────────────┘  └────────────────┘  │
│         │            │               │                │            │
│         └────────────┴───────────────┴────────────────┘            │
│                               ▼                                    │
│            lib/ Service Layer (api.js · rag.js · search.js)        │
└───────────────────┬─────────────────────┬──────────────────────────┘
                    │ JWT Bearer Token     │ Direct Stream
                    ▼                     ▼
┌───────────────────────────┐   ┌──────────────────────────────────┐
│  Node.js / Express API    │   │     External AI & Data Services  │
│  (Port 5001)              │   │                                  │
│                           │   │  ● Google Gemini Flash (Primary) │
│  POST /api/auth/signup    │   │  ● HuggingFace Qwen2.5-72B       │
│  POST /api/auth/login     │   │    (Fallback)                    │
│  GET  /api/auth/me        │   │  ● Clinical MCQ Engine           │
│  CRUD /api/sessions       │   │    (Offline Fallback)            │
│  GET  /api/sessions/      │   │                                  │
│       summary             │   │  ● WHO Global Health Observatory │
│  CRUD /api/messages       │   │  ● WHO Disease Outbreak News     │
│  CRUD /api/documents      │   │  ● NCBI PubMed E-utilities       │
└────────────┬──────────────┘   └──────────────────────────────────┘
             │ Mongoose ODM
             ▼
┌───────────────────────────┐
│   MongoDB Atlas           │
│                           │
│  • users                  │
│  • chatsessions           │
│  • messages               │
│  • userdocuments          │
└───────────────────────────┘
```

### AI Fallback Chain
```
User Query
    │
    ▼
[1] Google Gemini Flash ──► Success → Stream response
    │ (invalid key / 404 / 429)
    ▼
[2] HuggingFace Qwen2.5-72B ──► Success → Stream response
    │ (API limit / unavailable)
    ▼
[3] Clinical MCQ Engine ──► Always succeeds → Structured diagnostic flow
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.1.0 | UI framework |
| Vite | 6.4.1 | Build tool & dev server |
| React Router DOM | 7.x | Client-side routing |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| Recharts | 2.x | Analytics bar charts |
| pdfjs-dist | 4.x | PDF text extraction |
| jsPDF | 2.x | PDF report generation |
| react-markdown | 9.x | Markdown rendering in chat |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 22.x | JavaScript runtime |
| Express | 4.19 | REST API framework |
| Mongoose | 8.4 | MongoDB ODM |
| jsonwebtoken | 9.x | JWT token generation & verification |
| bcryptjs | 2.x | Password hashing |
| cors | 2.x | Cross-origin resource sharing |
| dotenv | 16.x | Environment variable loading |
| nodemon | 3.x | Dev auto-restart |

### AI & External APIs
| Service | Usage |
|---------|-------|
| Google Gemini Flash | Primary chat completions & image OCR |
| HuggingFace Inference API | Fallback chat (Qwen2.5-72B, VL model for images) |
| WHO GHO API | Real-time global health statistics |
| WHO Disease Outbreak News | Active outbreak alerts |
| NCBI PubMed E-utilities | Peer-reviewed research article search |

---

## 📁 Repository Structure

```
MedChat-AI/
├── package.json                    # Monorepo root: install:all, dev, build scripts
├── README.md
│
├── backend/                        # Node.js + Express REST API
│   ├── server.js                   # Server entry, MongoDB connect, route mount, CORS
│   ├── vercel.json                 # Vercel serverless config for Express routing
│   ├── .env.example                # Backend environment template
│   ├── middleware/
│   │   └── auth.js                 # JWT Bearer token verification middleware
│   ├── models/
│   │   ├── User.js                 # User schema (email, passwordHash)
│   │   ├── ChatSession.js          # Session schema (userId, section, title)
│   │   ├── Message.js              # Message schema (sessionId, role, content, imageUrl)
│   │   └── UserDocument.js         # RAG document schema (userId, fileName, fullText)
│   └── routes/
│       ├── auth.js                 # POST /signup, /login, /reset-password; GET /me
│       ├── sessions.js             # CRUD /api/sessions + GET /summary aggregation
│       ├── messages.js             # POST & GET /api/messages
│       └── documents.js            # POST, GET, DELETE /api/documents
│
└── frontend/                       # React 19 + Vite Single Page App
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── src/
        ├── App.jsx                 # AppShell, React Router, active session state
        ├── config.js               # Section definitions, system prompts, AI config
        ├── index.css               # CSS custom properties, dark/light theme tokens
        ├── components/
        │   ├── Sidebar.jsx         # Navigation sidebar with section links
        │   ├── TopBar.jsx          # Header: language picker, theme toggle, user menu
        │   ├── InputArea.jsx       # Chat input bar: text, image attach, voice
        │   ├── Message.jsx         # Chat bubble: markdown, MCQ cards, timestamps
        │   ├── SymptomChecker.jsx  # Interactive MCQ option cards with progress bar
        │   ├── DocumentUpload.jsx  # Medical document upload modal
        │   └── Toast.jsx           # Notification toast component
        ├── contexts/
        │   ├── AuthContext.jsx     # Auth state, JWT storage, login/logout
        │   └── LanguageContext.jsx # i18n context, language switching
        ├── lib/
        │   ├── api.js              # Gemini → HuggingFace → MCQ fallback chain
        │   ├── api-client.js       # Backend HTTP client with local fallback
        │   ├── rag.js              # PDF text extraction + Gemini OCR for images
        │   ├── search.js           # WHO + PubMed orchestrator
        │   └── export.js           # HTML-to-PDF clinical report generator
        └── pages/
            ├── AuthPage.jsx        # Login & signup with form validation
            ├── Dashboard.jsx       # Home dashboard with feature cards
            ├── ChatPage.jsx        # General medical & research chat
            ├── ScanAnalysis.jsx    # X-Ray / MRI / CT scan viewer & analysis
            └── PatientHistory.jsx  # Consultation timeline, analytics, document vault
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB Atlas** account (free tier works) or local MongoDB instance
- **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey) *(optional — app works without it)*
- **HuggingFace Token** from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) *(optional — app works without it)*

### 1. Clone the Repository
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
See the [Environment Variables](#️-environment-variables) section below.

### 4. Start Development Servers
```bash
# Starts both Backend (Port 5001) & Frontend (Port 5173) concurrently
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/medchat?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173,https://your-frontend.vercel.app
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Express server port (Render sets this automatically) |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Yes | Token expiry duration (e.g. `7d`, `24h`) |
| `CLIENT_URL` | Yes | Comma-separated allowed CORS origins |

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5001
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_KEY=your_huggingface_token_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Base URL of the Express backend |
| `VITE_GEMINI_API_KEY` | Optional | Google Gemini API key (starts with `AIzaSy`) |
| `VITE_API_KEY` | Optional | HuggingFace Inference API token |

> 💡 The app works without any AI API keys using the built-in Clinical MCQ Engine fallback.

---

## 📡 REST API Endpoints

All endpoints except `/api/auth/signup` and `/api/auth/login` require a `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate and receive JWT |
| `GET` | `/api/auth/me` | Get authenticated user profile |
| `POST` | `/api/auth/reset-password` | Reset user password |

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Create a new chat session |
| `GET` | `/api/sessions` | List all sessions for authenticated user |
| `GET` | `/api/sessions/summary` | Aggregated history: stats + session list with previews |
| `DELETE` | `/api/sessions/:id` | Delete a session by ID |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/messages` | Save a message to a session |
| `GET` | `/api/messages/:sessionId` | Fetch all messages for a session (oldest first) |

### Documents (RAG)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents` | Upload & index document text for RAG |
| `GET` | `/api/documents` | List all uploaded documents for user |
| `GET` | `/api/documents/context` | Fetch concatenated document text for AI context |
| `DELETE` | `/api/documents/:fileName` | Delete a document by filename |

---

## 🚀 Deployment (Vercel + Render)

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Set **Build Command** to `npm run build`
4. Add these **Environment Variables** in Vercel project settings:

```
VITE_API_URL        = https://your-backend.onrender.com
VITE_GEMINI_API_KEY = your_gemini_key
VITE_API_KEY        = your_huggingface_token
```

### Backend → Render (or Vercel)

1. Connect your GitHub repo to [Render](https://render.com)
2. Set **Root Directory** to `backend`
3. Set **Build Command** to `npm install`
4. Set **Start Command** to `node server.js`
5. Add these **Environment Variables** in Render dashboard:

```
MONGO_URI    = your_mongodb_atlas_uri
JWT_SECRET   = your_jwt_secret
JWT_EXPIRES_IN = 7d
CLIENT_URL   = https://your-frontend.vercel.app
```







[🌐 Live Demo](https://med-chat-ai-neon.vercel.app)
