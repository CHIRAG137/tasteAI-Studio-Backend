'use strict';

class AvatarConfiguration {
  constructor({
    isVoiceEnabled = false,

    isVideoBot = false,

    avatarUrl = null,

    avatarPublicId = null,
  }) {
    this.isVoiceEnabled = isVoiceEnabled;

    this.isVideoBot = isVideoBot;

    this.avatarUrl = avatarUrl;

    this.avatarPublicId = avatarPublicId;
  }
}

module.exports = AvatarConfiguration;
