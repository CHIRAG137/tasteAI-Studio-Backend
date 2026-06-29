'use strict';

const express = require('express');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

module.exports = function createAdminRoutes({ adminController, authMiddleware }) {
  const router = express.Router();

  // ── Departments ──────────────────────────────────────────────
  router.post(
    '/departments',
    authMiddleware.requireAuth,
    asyncHandler(adminController.createDepartment),
  );
  router.get(
    '/departments',
    authMiddleware.requireAuth,
    asyncHandler(adminController.listDepartments),
  );

  // ── Teams ────────────────────────────────────────────────────
  router.post('/teams', authMiddleware.requireAuth, asyncHandler(adminController.createTeam));
  router.get('/teams', authMiddleware.requireAuth, asyncHandler(adminController.listTeams));

  // ── Categories ───────────────────────────────────────────────
  router.post(
    '/categories',
    authMiddleware.requireAuth,
    asyncHandler(adminController.createCategory),
  );
  router.get(
    '/categories',
    authMiddleware.requireAuth,
    asyncHandler(adminController.listCategories),
  );

  // ── Tags ─────────────────────────────────────────────────────
  router.post('/tags', authMiddleware.requireAuth, asyncHandler(adminController.createTag));
  router.get('/tags', authMiddleware.requireAuth, asyncHandler(adminController.listTags));

  // ── Business Hours ───────────────────────────────────────────
  router.post(
    '/business-hours',
    authMiddleware.requireAuth,
    asyncHandler(adminController.createBusinessHours),
  );
  router.get(
    '/business-hours',
    authMiddleware.requireAuth,
    asyncHandler(adminController.listBusinessHours),
  );

  // ── Holidays ─────────────────────────────────────────────────
  router.post('/holidays', authMiddleware.requireAuth, asyncHandler(adminController.createHoliday));
  router.get('/holidays', authMiddleware.requireAuth, asyncHandler(adminController.listHolidays));

  return router;
};
