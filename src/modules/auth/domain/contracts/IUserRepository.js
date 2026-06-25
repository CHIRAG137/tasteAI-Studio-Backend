'use strict';

class IUserRepository {
  async findById() {
    throw new Error(`${this.constructor.name}.findById() not implemented`);
  }

  async findByEmail() {
    throw new Error(`${this.constructor.name}.findByEmail() not implemented`);
  }

  async findByEmailWithPassword() {
    throw new Error(`${this.constructor.name}.findByEmailWithPassword() not implemented`);
  }

  async findByOAuthOrEmail() {
    throw new Error(`${this.constructor.name}.findByOAuthOrEmail() not implemented`);
  }

  async findByPhone() {
    throw new Error(`${this.constructor.name}.findByPhone() not implemented`);
  }

  async create() {
    throw new Error(`${this.constructor.name}.create() not implemented`);
  }

  async update() {
    throw new Error(`${this.constructor.name}.update() not implemented`);
  }

  async delete() {
    throw new Error(`${this.constructor.name}.delete() not implemented`);
  }
}

module.exports = IUserRepository;
