const express = require('express');
const multer = require('multer');
const didController = require('../controllers/didController');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post(
  '/create-video',
  upload.single('audio'),
  didController.createTalkingVideo
);
router.get('/video-status/:talkId', didController.getTalkingVideoStatus);

module.exports = router;
