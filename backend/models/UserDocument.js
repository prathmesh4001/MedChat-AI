const mongoose = require('mongoose');

const userDocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fullText: {
    type: String,
    default: '',
  },
  charCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Compound unique index: one file per user (upsert by fileName)
userDocumentSchema.index({ userId: 1, fileName: 1 }, { unique: true });

module.exports = mongoose.model('UserDocument', userDocumentSchema);
