const express = require("express");
const router = express.Router();
const multer = require("multer");
const chatBotController = require("../controllers/chatBotController");
const { verifyToken } = require("../middlewares/authMiddleware");
const upload = multer();

router.get("/bots", verifyToken, chatBotController.getAllChatBots);
router.get("/bots/:botId", verifyToken, chatBotController.getBotById);
router.delete("/bots/:botId", verifyToken, chatBotController.deleteBot);
router.put(
  "/bots/:botId",
  verifyToken,
  upload.single("file"),
  chatBotController.updateBot
);

module.exports = router;
