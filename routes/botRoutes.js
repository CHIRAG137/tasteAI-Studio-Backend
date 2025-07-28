const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const { createBot, askBot } = require("../controllers/botController");

router.post("/create", upload.single("file"), createBot);
router.post('/ask', askBot);

module.exports = router;
