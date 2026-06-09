const express = require('express');
const ChatSession = require('../models/ChatSession');
const auth = require('../middleware/auth');

const router = express.Router();

// All session routes require authentication
router.use(auth);

// ─── POST /api/sessions ───────────────────────────────────
// Create a new chat session
router.post('/', async (req, res) => {
  try {
    const { section, title = '' } = req.body;
    if (!section) return res.status(400).json({ error: 'section is required' });

    const session = await ChatSession.create({
      userId: req.user.id,
      section,
      title: title || `${section} Session`,
    });

    res.status(201).json({
      id: session._id,
      section: session.section,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/sessions ────────────────────────────────────
// List sessions for the current user (optionally filter by section)
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    if (req.query.section) filter.section = req.query.section;

    const sessions = await ChatSession.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    res.json(sessions.map(s => ({
      id: s._id,
      section: s.section,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/sessions/:id ─────────────────────────────
// Delete a session (only the owner can delete)
router.delete('/:id', async (req, res) => {
  try {
    const session = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
