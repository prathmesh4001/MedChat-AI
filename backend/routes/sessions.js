const express = require('express');
const mongoose = require('mongoose');
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

// ─── GET /api/sessions/summary ────────────────────────────
// Patient History Dashboard — returns aggregated stats + enriched
// session list. A single aggregation pipeline does the heavy lifting:
//   1. $lookup joins the messages collection per session
//   2. $addFields computes messageCount and extracts the first
//      user-role message as a 120-char preview snippet
//   3. $project strips the raw message array to keep payload small
// Scalar stats (totalMessages, daysActive, totalDocuments,
// monthlyConsultations) are derived from the resulting session list.
// NOTE: This route MUST be defined before DELETE /:id to avoid
//       Express matching "summary" as a session :id parameter.
router.get('/summary', async (req, res) => {
  try {
    const UserDocument = require('../models/UserDocument');
    let userId = req.user.id;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userId = new mongoose.Types.ObjectId(userId);
    }

    // ── 1. Enrich sessions with message data ──────────────
    const sessions = await ChatSession.aggregate([
      { $match: { userId } },

      // Join messages sorted oldest-first so position [0] = first message
      {
        $lookup: {
          from: 'messages',
          let: { sid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$sessionId', '$$sid'] } } },
            { $sort:  { createdAt: 1 } },
          ],
          as: 'msgs',
        },
      },

      // messageCount + isolate first user-role message
      {
        $addFields: {
          messageCount: { $size: '$msgs' },
          firstUserMsg: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$msgs',
                  as:    'msg',
                  cond:  { $eq: ['$$msg.role', 'user'] },
                },
              },
              0,
            ],
          },
        },
      },

      // Build preview string (max 120 chars)
      {
        $addFields: {
          preview: {
            $substrCP: [{ $ifNull: ['$firstUserMsg.content', ''] }, 0, 120],
          },
        },
      },

      // Drop raw arrays — they can be large
      { $project: { msgs: 0, firstUserMsg: 0 } },

      { $sort: { createdAt: -1 } },
    ]);

    // ── 2. Scalar stats derived from session list ─────────
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

    // Unique calendar days that had at least one session
    const uniqueDays = new Set(
      sessions.map(s => new Date(s.createdAt).toDateString())
    );
    const daysActive = uniqueDays.size;

    // ── 3. Total uploaded documents ───────────────────────
    const totalDocuments = await UserDocument.countDocuments({ userId: req.user.id });

    // ── 4. Monthly consultations — last 6 months ──────────
    // Pre-populate all 6 month buckets so months with 0 sessions appear
    const now = new Date();
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap[key] = 0;
    }
    sessions.forEach(s => {
      const key = new Date(s.createdAt).toLocaleDateString('en-US', {
        month: 'short', year: 'numeric',
      });
      if (Object.prototype.hasOwnProperty.call(monthlyMap, key)) {
        monthlyMap[key]++;
      }
    });
    const monthlyConsultations = Object.entries(monthlyMap).map(([month, count]) => ({
      month,
      count,
    }));

    // ── 5. Respond ────────────────────────────────────────
    res.json({
      totalSessions: sessions.length,
      totalMessages,
      totalDocuments,
      daysActive,
      monthlyConsultations,
      sessions: sessions.map(s => ({
        id:           s._id,
        title:        s.title,
        section:      s.section,
        createdAt:    s.createdAt,
        updatedAt:    s.updatedAt,
        messageCount: s.messageCount,
        preview:      s.preview || '',
      })),
    });
  } catch (err) {
    console.error('[GET /sessions/summary]', err.message);
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
