import express from "express";

import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  archiveProject,
  permanentlyDeleteProject,
  regenerateClientAccessToken,
  revokeClientAccess,
  getPublicProjectByAccessToken,
} from "./project.controller.js";

import {
  validateCreateProject,
  validateUpdateProject,
} from "./project.validation.js";

import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";

const router = express.Router();

/**
 * Health-check route
 * GET /api/v1/projects/health
 */
router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Project routes are working successfully",
  });
});

/**
 * Public client tracker route
 * This route must remain before /:projectId
 *
 * GET /api/v1/projects/public/access/:accessToken
 */
router.get(
  "/public/access/:accessToken",
  getPublicProjectByAccessToken
);

/**
 * All routes below require authentication
 */
router.use(authMiddleware);

/**
 * Create a project
 * Admin and Super Admin only
 *
 * POST /api/v1/projects
 */
router.post(
  "/",
  roleMiddleware("admin", "super_admin"),
  validateCreateProject,
  createProject
);

/**
 * Get all projects
 * Admin and Super Admin only
 *
 * GET /api/v1/projects
 */
router.get(
  "/",
  roleMiddleware("admin", "super_admin"),
  getProjects
);

/**
 * Generate a new secure client-access token
 *
 * POST /api/v1/projects/:projectId/client-access
 */
router.post(
  "/:projectId/client-access",
  roleMiddleware("admin", "super_admin"),
  regenerateClientAccessToken
);

/**
 * Revoke client access
 *
 * PATCH /api/v1/projects/:projectId/client-access/revoke
 */
router.patch(
  "/:projectId/client-access/revoke",
  roleMiddleware("admin", "super_admin"),
  revokeClientAccess
);

/**
 * Archive a project
 *
 * PATCH /api/v1/projects/:projectId/archive
 */
router.patch(
  "/:projectId/archive",
  roleMiddleware("admin", "super_admin"),
  archiveProject
);

/**
 * Permanently delete a project
 * Super Admin only
 *
 * DELETE /api/v1/projects/:projectId/permanent
 */
router.delete(
  "/:projectId/permanent",
  roleMiddleware("super_admin"),
  permanentlyDeleteProject
);

/**
 * Get one project by ID
 *
 * GET /api/v1/projects/:projectId
 */
router.get(
  "/:projectId",
  roleMiddleware("admin", "super_admin"),
  getProjectById
);

/**
 * Update a project
 *
 * PATCH /api/v1/projects/:projectId
 */
router.patch(
  "/:projectId",
  roleMiddleware("admin", "super_admin"),
  validateUpdateProject,
  updateProject
);

export default router;