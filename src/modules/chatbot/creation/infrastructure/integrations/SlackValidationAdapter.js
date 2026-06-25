'use strict';

const ISlackValidationService = require('../../domain/services/ISlackValidationService');

class SlackValidationAdapter extends ISlackValidationService {
  constructor({ validateSlackWorkspaceUseCase }) {
    super();

    this.validateSlackWorkspaceUseCase = validateSlackWorkspaceUseCase;
  }

  async validate(payload) {
    return this.validateSlackWorkspaceUseCase.execute(payload);
  }
}

module.exports = SlackValidationAdapter;
