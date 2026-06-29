'use strict';

const express = require('express');
const asyncHandler = require('../../../../shared/middleware/asyncHandler');

function createCustomizationRoutes({ customizationController, authMiddleware }) {
  const router = express.Router();
  const guard = authMiddleware ?? ((req, res, next) => next());

  router.get(
    '/:botId/customization',
    guard,
    asyncHandler(customizationController.getCustomization),
  );
  router.put(
    '/:botId/customization',
    guard,
    asyncHandler(customizationController.updateCustomization),
  );

  return router;
}

module.exports = { createCustomizationRoutes };
