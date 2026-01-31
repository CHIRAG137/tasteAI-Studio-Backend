const mongoose = require('mongoose');

const slackIntegrationSchema = new mongoose.Schema({
  // user who initialises the slack app
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // slack access token while slack initialisation
  slackAccessToken: { type: String, required: true },
  
  // slack team id(slack channel id)
  slackTeamId: String,
  
  // slack team name(slack workspace name)
  slackTeamName: String,
  
  // auth user id from the slack
  slackAuthedUserId: String,
});

module.exports = mongoose.model('SlackIntegration', slackIntegrationSchema);
