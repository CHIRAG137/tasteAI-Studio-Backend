const express = require('express');
const router = express.Router();
const issueReportController = require('../controllers/issueReportController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, issueReportController.createIssueReport);

module.exports = router;
