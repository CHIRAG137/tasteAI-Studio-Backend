const express = require('express');
const router = express.Router();
const livekitController = require('../controllers/livekitController');

router.post('/token', livekitController.getToken);

module.exports = router;
