const express = require('express');

const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, workflowController.listWorkflows);
router.post('/', authMiddleware, workflowController.createWorkflow);
router.get('/:workflowId', authMiddleware, workflowController.getWorkflowById);
router.put('/:workflowId', authMiddleware, workflowController.updateWorkflow);

module.exports = router;
