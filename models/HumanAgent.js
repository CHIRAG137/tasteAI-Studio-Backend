const mongoose = require('mongoose');

const HumanAgentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    isPasswordSet: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastLoginAt: Date,

    // Online/Offline Status
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    // Assignment Metrics
    currentActiveChats: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxConcurrentChats: {
      type: Number,
      default: 5, // Configurable per agent
      min: 1,
      max: 20,
    },

    totalChatsHandled: {
      type: Number,
      default: 0,
    },

    // Availability Status
    isAvailable: {
      type: Boolean,
      default: true,
    },

    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'away', 'offline'],
      default: 'offline',
      index: true,
    },

    // Agent Profile (Optional)
    displayName: String,
    avatarUrl: String,
    phoneNumber: String,
    timezone: {
      type: String,
      default: 'UTC',
    },

    // Skills/Specializations (Optional for future routing)
    skills: [String],

    // Working Hours (Optional for future use)
    workingHours: {
      monday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      thursday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      friday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      saturday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      sunday: { start: String, end: String, enabled: { type: Boolean, default: false } },
    },

    // Performance Metrics
    averageResponseTime: {
      type: Number,
      default: 0, // in seconds
    },

    averageResolutionTime: {
      type: Number,
      default: 0, // in seconds
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },

    // Preferences
    emailNotifications: {
      type: Boolean,
      default: true,
    },

    soundNotifications: {
      type: Boolean,
      default: true,
    },

    autoAcceptChats: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
HumanAgentSchema.index({ email: 1 }, { unique: true });
HumanAgentSchema.index({ isOnline: 1, availabilityStatus: 1 });
HumanAgentSchema.index({ isActive: 1, isPasswordSet: 1 });

// Virtual for current capacity
HumanAgentSchema.virtual('hasCapacity').get(function () {
  return this.currentActiveChats < this.maxConcurrentChats;
});

// Virtual for load percentage
HumanAgentSchema.virtual('loadPercentage').get(function () {
  return Math.round((this.currentActiveChats / this.maxConcurrentChats) * 100);
});

// Method to check if agent is truly available
HumanAgentSchema.methods.isAvailableForChat = function () {
  return (
    this.isActive &&
    this.isPasswordSet &&
    this.isOnline &&
    this.availabilityStatus === 'available' &&
    this.hasCapacity
  );
};

// Method to update presence
HumanAgentSchema.methods.updatePresence = async function (isOnline, status = null) {
  this.isOnline = isOnline;
  this.lastSeenAt = new Date();
  
  if (status) {
    this.availabilityStatus = status;
  } else {
    this.availabilityStatus = isOnline ? 'available' : 'offline';
  }

  await this.save();
};

// Method to update metrics after resolving a chat
HumanAgentSchema.methods.updateMetrics = async function (responseTime, resolutionTime, rating = null) {
  // Update average response time
  const totalChats = this.totalChatsHandled || 0;
  this.averageResponseTime = Math.round(
    (this.averageResponseTime * totalChats + responseTime) / (totalChats + 1)
  );

  // Update average resolution time
  this.averageResolutionTime = Math.round(
    (this.averageResolutionTime * totalChats + resolutionTime) / (totalChats + 1)
  );

  // Update rating if provided
  if (rating) {
    const totalRatings = this.totalRatings || 0;
    this.averageRating = (
      (this.averageRating * totalRatings + rating) / (totalRatings + 1)
    ).toFixed(2);
    this.totalRatings += 1;
  }

  await this.save();
};

// Static method to find available agents for a bot
HumanAgentSchema.statics.findAvailableForBot = async function (botId) {
  const BotAgent = mongoose.model('BotAgent');
  
  const botAgents = await BotAgent.find({
    bot: botId,
    isEnabled: true,
  }).populate({
    path: 'humanAgent',
    match: {
      isActive: true,
      isPasswordSet: true,
    },
  });

  return botAgents
    .filter(ba => ba.humanAgent !== null)
    .map(ba => ba.humanAgent);
};

// Static method to find online agents
HumanAgentSchema.statics.findOnlineAgents = function () {
  return this.find({
    isOnline: true,
    isActive: true,
    availabilityStatus: 'available',
  });
};

module.exports = mongoose.model('HumanAgent', HumanAgentSchema);
