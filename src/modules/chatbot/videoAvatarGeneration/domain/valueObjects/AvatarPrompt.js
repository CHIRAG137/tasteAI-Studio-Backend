'use strict';

class AvatarPrompt {
  constructor(prompt) {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    if (typeof prompt !== 'string') {
      throw new Error('Prompt must be a string');
    }

    const normalizedPrompt = prompt.trim();

    if (!normalizedPrompt) {
      throw new Error('Prompt cannot be empty');
    }

    if (normalizedPrompt.length > 5000) {
      throw new Error('Prompt exceeds maximum length');
    }

    this.value = normalizedPrompt;
  }
}

module.exports = AvatarPrompt;
