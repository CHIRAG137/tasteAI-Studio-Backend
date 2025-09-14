const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const botController = require("../controllers/botController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/create", authMiddleware, upload.single("file"), botController.createBot);
router.post("/ask", botController.askBot);
router.get("/", authMiddleware, botController.getAllChatBots);
router.get("/:botId", botController.getBotById);
router.delete("/:botId", authMiddleware, botController.deleteBot);
router.put( "/:botId", authMiddleware, upload.single("file"), botController.updateBot);
router.get("/customisation/:botId", botController.getCustomization);
router.post("/customisation/:botId", botController.saveCustomization);

module.exports = router;
