const express = require('express');
const Message = require('../models/Message');
const ChatSession = require('../models/ChatSession');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// ─── POST /api/messages ───────────────────────────────────
// Save a message to a session
router.post('/', async (req, res) => {
  try {
    const { sessionId, role, content, imageUrl = null, metadata = {} } = req.body;

    if (!sessionId || !role || content === undefined) {
      return res.status(400).json({ error: 'sessionId, role, and content are required' });
    }

    // Verify session belongs to this user
    const session = await ChatSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(403).json({ error: 'Session not found or access denied' });

    const message = await Message.create({ sessionId, role, content, imageUrl, metadata });

    // Touch session's updatedAt
    await ChatSession.findByIdAndUpdate(sessionId, { updatedAt: new Date() });

    res.status(201).json({
      id: message._id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      imageUrl: message.imageUrl,
      metadata: message.metadata,
      createdAt: message.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/messages/:sessionId ────────────────────────
// Get all messages for a session (oldest first)
router.get('/:sessionId', async (req, res) => {
  try {
    // Verify session belongs to this user
    const session = await ChatSession.findOne({ _id: req.params.sessionId, userId: req.user.id });
    if (!session) return res.status(403).json({ error: 'Session not found or access denied' });

    const messages = await Message.find({ sessionId: req.params.sessionId })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages.map(m => ({
      id: m._id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      imageUrl: m.imageUrl,
      metadata: m.metadata,
      createdAt: m.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
