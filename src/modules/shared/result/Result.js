'use strict';

class Result {
  constructor(success, data, error) {
    this.success = success;

    this.data = data;

    this.error = error;
  }

  static success(data) {
    return new Result(true, data, null);
  }

  static failure(error) {
    return new Result(false, null, error);
  }
}

module.exports = Result;
