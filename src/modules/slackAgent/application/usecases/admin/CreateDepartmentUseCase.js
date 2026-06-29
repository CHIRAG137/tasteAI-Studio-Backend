'use strict';

class CreateDepartmentUseCase {
  constructor({ departmentRepository }) {
    this.departmentRepository = departmentRepository;
  }

  async execute(command) {
    return this.departmentRepository.save(command);
  }
}

module.exports = CreateDepartmentUseCase;
