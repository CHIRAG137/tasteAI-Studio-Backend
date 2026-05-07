const mongoose = require('mongoose');

const UserApiKeySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['openai', 'gemini'], required: true, index: true },
    // Contains: { encrypted, iv, authTag }
    encrypted_api_key: { type: mongoose.Schema.Types.Mixed, required: true },
    key_last4: { type: String, default: null },
  },
  { timestamps: true }
);

UserApiKeySchema.index({ user: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('UserApiKey', UserApiKeySchema);

