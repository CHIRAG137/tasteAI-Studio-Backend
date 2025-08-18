const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { createBot, askBot } = require("../controllers/botController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/create", authMiddleware, upload.single("file"), createBot);
router.post("/ask", askBot);

module.exports = router;
