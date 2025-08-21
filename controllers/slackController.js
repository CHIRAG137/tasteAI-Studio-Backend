const axios = require("axios");
const SlackIntegration = require("../models/SlackIntegration");
const ChatBot = require("../models/ChatBot");
const botController = require("./botController");

exports.initiateSlackOAuth = (req, res) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  const state = encodeURIComponent(JSON.stringify({ userId: req.user._id }));
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=chat:write,commands,users:read,channels:read,channels:join,groups:write&user_scope=&redirect_uri=${process.env.SLACK_REDIRECT_URI}&state=${state}`;

  res.redirect(slackAuthUrl);
};

exports.handleSlackOAuthCallback = async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  if (!code || !state) {
    return res.status(400).send("Missing code or state.");
  }

  let decodedState;
  try {
    decodedState = JSON.parse(decodeURIComponent(state));
  } catch (err) {
    return res.status(400).send("Invalid state format.");
  }

  try {
    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          redirect_uri: process.env.SLACK_REDIRECT_URI,
        },
      }
    );

    const { access_token, team, authed_user } = response.data;

    if (!access_token) {
      return res
        .status(400)
        .json({ error: "OAuth failed", details: response.data });
    }

    await SlackIntegration.findOneAndUpdate(
      { userId: decodedState.userId },
      {
        slackAccessToken: access_token,
        slackTeamId: team.id,
        slackTeamName: team.name,
        slackAuthedUserId: authed_user.id,
      },
      { upsert: true, new: true }
    );

    res.send("Slack app successfully installed for your account!");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.handleCommand = async (req, res) => {
  const { type, challenge, event } = req.body;

  // Slack verification challenge
  if (type === "url_verification") {
    return res.send({ challenge });
  }

  // Handle message events
  if (event && event.type === "message" && !event.bot_id) {
    try {
      const bot = await ChatBot.findOne({ slack_channel_id: event.channel });
      if (!bot) {
        return res.status(200).send(); // no bot for this channel
      }

      // Get Slack token for this user/team
      const slackIntegration = await SlackIntegration.findOne({
        slackTeamId: req.body.team_id,
      });

      if (!slackIntegration) {
        return res.status(200).send();
      }

      // Ask bot
      const fakeReq = {
        body: { question: event.text, botId: bot._id.toString() },
      };
      const fakeRes = {
        json: async (data) => {
          // Send reply to Slack
          await axios.post(
            "https://slack.com/api/chat.postMessage",
            {
              channel: event.channel,
              text: data.answer || data.message,
            },
            {
              headers: {
                Authorization: `Bearer ${slackIntegration.slackAccessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
        },
      };
      await botController.askBot(fakeReq, fakeRes);
    } catch (err) {
      console.error("Slack event error:", err);
    }
  }
  // Respond quickly to Slack
  res.status(200).send();
};
