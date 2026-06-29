'use strict';

class IBotQuery {
  async findById() {
    throw new Error(`${this.constructor.name}.findById() not implemented`);
  }
}

module.exports = IBotQuery;
