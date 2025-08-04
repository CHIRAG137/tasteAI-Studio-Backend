const express = require("express");
const router = express.Router();
const slackController = require("../controllers/slackController");

router.get("/install", slackController.initiateSlackOAuth);
router.get("/oauth/callback", slackController.handleSlackOAuthCallback);

module.exports = router;
