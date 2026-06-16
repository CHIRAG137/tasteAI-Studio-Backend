const mongoose = require('mongoose');

const visitorOtpSchema = new mongoose.Schema(
  {
    botId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatBot', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    deviceId: { type: String, required: true, trim: true, index: true },
    ipAddress: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

// TTL index
visitorOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
visitorOtpSchema.index({ botId: 1, email: 1, deviceId: 1, ipAddress: 1 }, { unique: true });

module.exports = mongoose.model('VisitorOtp', visitorOtpSchema);
