const express = require("express");
const router = express.Router();
const multer = require("multer");
const chatBotController = require("../controllers/chatBotController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const upload = multer();

router.get("/bots", authMiddleware, chatBotController.getAllChatBots);
router.get("/bots/:botId", chatBotController.getBotById);
router.delete("/bots/:botId", authMiddleware, chatBotController.deleteBot);
router.put(
  "/bots/:botId",
  authMiddleware,
  upload.single("file"),
  chatBotController.updateBot
);

module.exports = router;
