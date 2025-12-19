const express = require("express");
const router = express.Router();
const geminiImageController = require("../controllers/imageGenerationController");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/generate-image",
  upload.single("image"),
  geminiImageController.generateImage
);

module.exports = router;
