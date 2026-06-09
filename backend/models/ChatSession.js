const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  section: {
    type: String,
    required: true,
    enum: ['general', 'research', 'xray', 'mri', 'ct'],
  },
  title: {
    type: String,
    default: '',
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
