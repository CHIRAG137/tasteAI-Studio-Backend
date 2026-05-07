const mongoose = require('mongoose');

const visitorVerificationSchema = new mongoose.Schema(
  {
    botId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatBot', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    deviceId: { type: String, required: true, trim: true, index: true },
    ipAddress: { type: String, required: true, trim: true },
    tokenHash: { type: String, required: true },
    verifiedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

visitorVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
visitorVerificationSchema.index({ botId: 1, deviceId: 1, ipAddress: 1 }, { unique: true });

module.exports = mongoose.model('VisitorVerification', visitorVerificationSchema);
