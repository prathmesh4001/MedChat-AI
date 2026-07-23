require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────
// Build dynamic allowed origins list
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://med-chat-ai-neon.vercel.app',   // Vercel production
];
// Support comma-separated CLIENT_URL env var for extra origins
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').forEach(u => {
    const trimmed = u.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
  });
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app deployment (preview builds)
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🏥 MedChat AI Backend is Running Successfully!',
    version: '1.0.0',
    health: '/api/health',
  });
});

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/sessions',  require('./routes/sessions'));
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/documents', require('./routes/documents'));

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
  });
});

// ─── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Connect to MongoDB + Start Server ───────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected:', process.env.MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 MedChat Backend running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
