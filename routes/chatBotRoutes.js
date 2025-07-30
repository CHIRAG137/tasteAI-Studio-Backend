const express = require("express");
const router = express.Router();
const chatBotController = require("../controllers/chatBotController");

router.get("/bots", chatBotController.getAllChatBots);
router.get("/bots/:botId", chatBotController.getBotById);
router.delete("/bots/:botId", chatBotController.deleteBot);
router.put("/bots/:botId", chatBotController.updateBot);

module.exports = router;
