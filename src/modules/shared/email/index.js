'use strict';

const NodemailerEmailService = require('./infrastructure/NodemailerEmailService');

function createEmailModule() {
  const emailService = new NodemailerEmailService();

  return {
    emailService,
  };
}

module.exports = {
  createEmailModule,
};
