const express = require('express');
const UserDocument = require('../models/UserDocument');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// ─── POST /api/documents ──────────────────────────────────
// Upload / upsert a document (replaces if same fileName exists for this user)
router.post('/', async (req, res) => {
  try {
    const { fileName, fileType, fullText, charCount } = req.body;

    if (!fileName || !fileType || !fullText) {
      return res.status(400).json({ error: 'fileName, fileType, and fullText are required' });
    }

    // Upsert: update if exists, insert if not
    const doc = await UserDocument.findOneAndUpdate(
      { userId: req.user.id, fileName },
      {
        userId: req.user.id,
        fileName,
        fileType,
        fullText,
        charCount: charCount || fullText.length,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      id: doc._id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      charCount: doc.charCount,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/documents ───────────────────────────────────
// List all documents for the current user (no text, just metadata)
router.get('/', async (req, res) => {
  try {
    const docs = await UserDocument.find({ userId: req.user.id })
      .select('-fullText') // Don't return the full text in list
      .sort({ createdAt: -1 })
      .lean();

    res.json(docs.map(d => ({
      id: d._id,
      fileName: d.fileName,
      fileType: d.fileType,
      charCount: d.charCount,
      createdAt: d.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/documents/context ──────────────────────────
// Get the full text of all documents combined (for RAG context injection)
router.get('/context', async (req, res) => {
  try {
    const docs = await UserDocument.find({ userId: req.user.id })
      .select('fileName fileType fullText')
      .sort({ createdAt: -1 })
      .lean();

    if (!docs || docs.length === 0) {
      return res.json({ context: '' });
    }

    const context = docs
      .map((doc, i) => `━━━ Document ${i + 1}: "${doc.fileName}" (${doc.fileType}) ━━━\n${doc.fullText}`)
      .join('\n\n');

    res.json({ context });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/documents/:fileName ─────────────────────
// Delete a document by fileName (URL-encoded)
router.delete('/:fileName', async (req, res) => {
  try {
    const fileName = decodeURIComponent(req.params.fileName);
    const doc = await UserDocument.findOneAndDelete({ userId: req.user.id, fileName });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
