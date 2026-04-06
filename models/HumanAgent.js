const mongoose = require('mongoose');

const daySchema = {
  start: {
    type: String,
    default: '09:00',
  },
  end: {
    type: String,
    default: '18:00',
  },
  enabled: {
    type: Boolean,
    default: true,
  },
};

const HumanAgentSchema = new mongoose.Schema(
  {
    // Agent email address
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    // Agent Display name
    displayName: String,

    // Agent avatarUrl
    avatarUrl: String,

    // Agent phone number
    phoneNumber: String,

    // Auth0 subject (linked on first Auth0 sign-in for this agent)
    auth0Id: { type: String, sparse: true, unique: true },

    // Agent password hash
    passwordHash: {
      type: String,
      default: null,
    },

    // Flag to check if password has been set by the agent
    isPasswordSet: {
      type: Boolean,
      default: false,
    },

    // Flag to check if the agent is active(if he had been associated with any of the bots ie already created that user)
    isActive: {
      type: Boolean,
      default: true,
    },

    // User who invited the agent to act on a bot
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Timestamp of when the agent last logined
    lastLoginAt: Date,

    // Agent Online/Offline Status on dashboard set by the agent
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Agent last seen timestamp
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    // total chat sessions assigned to the agent
    totalChatsAssigned: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Current active chat sessions of the user(Chat session that has been accepted by agent but is still not resolved)
    currentActiveChats: {
      type: Number,
      default: 0,
      min: 0,
    },

    // max chats sessions that the agent can handle at a time
    maxConcurrentChats: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },

    // Count of total chat sessions resolved by agent
    totalChatsHandled: {
      type: Number,
      default: 0,
    },

    // Availability Status of agent(true/false)
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Availability Statuses applicable
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'away', 'offline'],
      default: 'offline',
      index: true,
    },

    // Timezone for the agent
    timezone: {
      type: String,
      default: 'UTC',
    },

    // Skills/Specializations of agent (Optional for future routing)
    skills: [String],

    // Working Hours of agent (Optional for future use)
    workingHours: {
      monday: { type: daySchema, default: () => ({}) },
      tuesday: { type: daySchema, default: () => ({}) },
      wednesday: { type: daySchema, default: () => ({}) },
      thursday: { type: daySchema, default: () => ({}) },
      friday: { type: daySchema, default: () => ({}) },
      saturday: {
        type: daySchema,
        default: () => ({ enabled: false }),
      },
      sunday: {
        type: daySchema,
        default: () => ({ enabled: false }),
      },
    },

    // Performance Metrics - Average response time in seconds
    averageResponseTime: {
      type: Number,
      default: 0,
    },

    // Performance Metrics - Average time taken by agent for resolution in seconds
    averageResolutionTime: {
      type: Number,
      default: 0,
    },

    // Performance Metrics - Average agent rating given by user(optional for future use)
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Performance Metrics - Total ratings given to the agent(optional for future use)
    totalRatings: {
      type: Number,
      default: 0,
    },

    // Flag for email notification
    emailNotifications: {
      type: Boolean,
      default: true,
    },

    // Flag for sound notification
    soundNotifications: {
      type: Boolean,
      default: true,
    },

    // Flag for auto accepting the session chat(optional for future use)
    autoAcceptChats: {
      type: Boolean,
      default: false,
    },

    // agent auth token for agent dashboard
    agentAuthToken: { type: String, default: null },

    // agent auth token expiry timestamp
    agentAuthTokenExpiresAt: { type: Date, default: null },

    // timestamp of when agent last logged out
    lastLogoutAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
HumanAgentSchema.index({ email: 1 }, { unique: true });
HumanAgentSchema.index({ isOnline: 1, availabilityStatus: 1 });
HumanAgentSchema.index({ isActive: 1, isPasswordSet: 1 });

// Virtual flag for current capacity
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
HumanAgentSchema.methods.updatePresence = async function (
  isOnline,
  status = null
) {
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
HumanAgentSchema.methods.updateMetrics = async function (
  responseTime,
  resolutionTime,
  rating = null
) {
  // Update average response time
  const totalChats = this.totalChatsHandled || 0;
  this.averageResponseTime = Math.round(
    (this.averageResponseTime * totalChats + responseTime) / (totalChats + 1)
  );

  // Update average resolution time
  this.averageResolutionTime = Math.round(
    (this.averageResolutionTime * totalChats + resolutionTime) /
      (totalChats + 1)
  );

  // Update rating if provided
  if (rating) {
    const totalRatings = this.totalRatings || 0;
    this.averageRating = (
      (this.averageRating * totalRatings + rating) /
      (totalRatings + 1)
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
    .filter((ba) => ba.humanAgent !== null)
    .map((ba) => ba.humanAgent);
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
