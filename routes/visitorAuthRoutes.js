const express = require('express');

const router = express.Router();
const visitorAuthController = require('../controllers/visitorAuthController');
const { attachIpAddress } = require('../middlewares/ipExtractorMiddleware');

router.use(attachIpAddress);

router.post('/request-otp', visitorAuthController.requestOtp);
router.post('/verify-otp', visitorAuthController.verifyOtp);

module.exports = router;
