const express = require('express');

const router = express.Router();
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });
const botController = require('../controllers/botController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { attachIpAddress } = require('../middlewares/ipExtractorMiddleware');

router.use(attachIpAddress);

/**
 * @route   POST /api/bots/create
 * @desc    Create a new chatbot with optional training files (PDF, TXT, DOC/DOCX, XLS/XLSX, CSV) or scraped content
 * @access  Private (Authenticated user)
 */
router.post('/create', authMiddleware, upload.array('files'), botController.createBot);
