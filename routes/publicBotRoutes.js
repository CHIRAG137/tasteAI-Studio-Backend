const express = require('express');
const router = express.Router();
const { publicAskBot } = require('../controllers/publicBotController');

router.post('/bot/:botId/ask', publicAskBot);

module.exports = router;
