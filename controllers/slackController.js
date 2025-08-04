const axios = require("axios");

exports.initiateSlackOAuth = (req, res) => {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=chat:write,commands,users:read,channels:read&user_scope=&redirect_uri=${process.env.SLACK_REDIRECT_URI}`;
  res.redirect(slackAuthUrl);
};

exports.handleSlackOAuthCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing Slack code.");

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

    if (!access_token)
      return res
        .status(400)
        .json({ error: "OAuth failed", details: response.data });

    // Save team.id, access_token, authed_user.id, etc. in DB as needed

    res.send("Slack app successfully installed!");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("Internal Server Error");
  }
};
