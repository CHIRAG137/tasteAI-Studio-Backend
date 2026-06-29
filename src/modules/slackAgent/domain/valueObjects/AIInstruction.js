'use strict';

class AIInstruction {
  constructor({ type, content, priority, scope, isActive }) {
    this.type = type;
    this.content = content;
    this.priority = priority || 'normal';
    this.scope = scope || 'global';
    this.isActive = isActive !== undefined ? isActive : true;
    Object.freeze(this);
  }

  validate() {
    if (!this.type) {
      throw new Error('Instruction type is required');
    }
    if (!this.content || !this.content.trim()) {
      throw new Error('Instruction content is required');
    }
  }
}

module.exports = AIInstruction;
