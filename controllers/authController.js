const SlackIntegration = require("../models/SlackIntegration");
const User = require("../models/User");
const authService = require("../services/authService");

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const result = await authService.googleLogin(req.body.token);
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user._id;

    // get user without password
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    // check if slack integration exists
    const slackIntegration = await SlackIntegration.findOne({ userId });

    res.json({
      user,
      hasSlackIntegration: !!slackIntegration,
      slackIntegration: slackIntegration
        ? {
            teamId: slackIntegration.slackTeamId,
            teamName: slackIntegration.slackTeamName,
            authedUserId: slackIntegration.slackAuthedUserId,
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
};
