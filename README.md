# MedChat AI 🏥

An AI-powered medical assistant web application with a full-stack architecture — React frontend, Node.js + Express backend, and MongoDB database.

![MedChat AI](https://img.shields.io/badge/MedChat-AI-teal?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?style=for-the-badge&logo=mongodb)

## Features

- 🤖 **AI Medical Chat** — Symptom assessment with interactive MCQ-based diagnosis
- 📄 **RAG Document Analysis** — Upload PDFs, images, prescriptions for AI-powered analysis
- 🩻 **Scan Analysis** — X-Ray, MRI, CT scan interpretation via AI
- 🌐 **Medical Research** — Live web search via WHO, PubMed, and Tavily APIs
- 🔐 **JWT Authentication** — Secure signup/login with bcrypt password hashing
- 🌍 **Multi-language Support** — Respond in multiple languages
- 📱 **Responsive UI** — Dark/light mode, works on all screen sizes

## Tech Stack

### Frontend
- React 19 + Vite
- Tailwind CSS
- React Router DOM

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication (jsonwebtoken + bcryptjs)

### AI & APIs
- HuggingFace Inference API (`Qwen2.5-72B-Instruct`)
- Google Gemini Flash (medical image OCR)
- Tavily / WHO / PubMed (medical research)

## Project Structure

```
MedChat-AI/
├── backend/                  # Express REST API
│   ├── middleware/auth.js     # JWT verification
│   ├── models/               # Mongoose models
│   │   ├── User.js
│   │   ├── ChatSession.js
│   │   ├── Message.js
│   │   └── UserDocument.js
│   ├── routes/               # API routes
│   │   ├── auth.js           # POST /signup, /login, GET /me
│   │   ├── sessions.js       # CRUD chat sessions
│   │   ├── messages.js       # Save & fetch messages
│   │   └── documents.js      # Upload & manage documents
│   └── server.js             # Entry point
│
└── src/                      # React frontend
    ├── lib/
    │   ├── api-client.js     # Backend HTTP client (JWT)
    │   ├── api.js            # HuggingFace AI calls
    │   ├── rag.js            # Document processing
    │   └── search.js         # Web search integration
    ├── contexts/
    │   └── AuthContext.jsx   # JWT auth state
    └── pages/
        ├── AuthPage.jsx
        ├── ChatPage.jsx
        ├── ScanAnalysis.jsx
        └── Dashboard.jsx
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- HuggingFace account (free token)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/MedChat-AI.git
cd MedChat-AI
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
node server.js
```

### 3. Setup Frontend
```bash
# In root directory
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

### Environment Variables

**Frontend `.env`**
```
VITE_API_URL=http://localhost:5001
VITE_API_KEY=your_huggingface_token
VITE_GEMINI_API_KEY=your_gemini_key
VITE_TAVILY_API_KEY=your_tavily_key
```

**Backend `backend/.env`**
```
PORT=5001
MONGO_URI=mongodb://localhost:27017/medchat
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/sessions` | Create chat session |
| GET | `/api/sessions` | List sessions |
| DELETE | `/api/sessions/:id` | Delete session |
| POST | `/api/messages` | Save message |
| GET | `/api/messages/:sessionId` | Get messages |
| POST | `/api/documents` | Upload document |
| GET | `/api/documents` | List documents |
| DELETE | `/api/documents/:fileName` | Delete document |

## License

MIT License — free to use for educational purposes.

---

> ⚠️ This is an AI-assisted tool for educational purposes only. Always consult a licensed healthcare professional for medical advice.
