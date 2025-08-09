const express = require("express");
const router = express.Router();
const slackController = require("../controllers/slackController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.get("/install", authMiddleware, slackController.initiateSlackOAuth);
router.get("/oauth/callback", slackController.handleSlackOAuthCallback);

module.exports = router;
