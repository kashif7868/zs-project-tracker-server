import express from "express";

import {
  archiveProject,
  createProject,
  getProjectById,
  getProjects,
  getPublicProjectByAccessToken,
  permanentlyDeleteProject,
  regenerateClientAccessToken,
  revokeClientAccess,
  updateProject,
} from "./project.controller.js";

import {
  validateCreateProject,
  validateUpdateProject,
} from "./project.validation.js";

import authMiddleware from "../../middlewares/auth.middleware.js";

import roleMiddleware, {
  permissionMiddleware,
} from "../../middlewares/role.middleware.js";

const router = express.Router();

/* =========================================================
   HEALTH CHECK

   Public route.

   GET /api/v1/projects/health
   ========================================================= */

router.get(
  "/health",
  (req, res) => {
    return res
      .status(200)
      .json({
        success: true,

        message:
          "Project routes are working successfully",
      });
  }
);

/* =========================================================
   PUBLIC CLIENT TRACKER

   Authentication required nahi hai.

   Is route ko /:projectId se pehle rakhna zaroori hai.

   GET /api/v1/projects/public/access/:accessToken
   ========================================================= */

router.get(
  "/public/access/:accessToken",

  getPublicProjectByAccessToken
);

/* =========================================================
   AUTHENTICATION

   Neeche wali tamam routes protected hain.
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   CREATE PROJECT

   Required permission:

   projects.create

   POST /api/v1/projects
   ========================================================= */

router.post(
  "/",

  permissionMiddleware(
    "projects.create"
  ),

  validateCreateProject,

  createProject
);

/* =========================================================
   GET ALL PROJECTS

   Required permission:

   projects.view

   Risk aur Evidence forms ke project dropdown ke liye bhi
   yahi endpoint use ho sakta hai.

   GET /api/v1/projects
   ========================================================= */

router.get(
  "/",

  permissionMiddleware(
    "projects.view"
  ),

  getProjects
);

/* =========================================================
   GENERATE CLIENT ACCESS TOKEN

   Required permission:

   projects.client_access

   POST /api/v1/projects/:projectId/client-access
   ========================================================= */

router.post(
  "/:projectId/client-access",

  permissionMiddleware(
    "projects.client_access"
  ),

  regenerateClientAccessToken
);

/* =========================================================
   REVOKE CLIENT ACCESS

   Required permission:

   projects.client_access

   PATCH
   /api/v1/projects/:projectId/client-access/revoke
   ========================================================= */

router.patch(
  "/:projectId/client-access/revoke",

  permissionMiddleware(
    "projects.client_access"
  ),

  revokeClientAccess
);

/* =========================================================
   ARCHIVE PROJECT

   Required permission:

   projects.archive

   PATCH /api/v1/projects/:projectId/archive
   ========================================================= */

router.patch(
  "/:projectId/archive",

  permissionMiddleware(
    "projects.archive"
  ),

  archiveProject
);

/* =========================================================
   PERMANENTLY DELETE PROJECT

   Super Admin only.

   Yeh irreversible operation hai, is liye dynamic custom
   role permission ke bajaye direct system-role protection
   preserve ki gayi hai.

   DELETE /api/v1/projects/:projectId/permanent
   ========================================================= */

router.delete(
  "/:projectId/permanent",

  roleMiddleware(
    "super_admin"
  ),

  permanentlyDeleteProject
);

/* =========================================================
   GET SINGLE PROJECT

   Required permission:

   projects.view

   GET /api/v1/projects/:projectId
   ========================================================= */

router.get(
  "/:projectId",

  permissionMiddleware(
    "projects.view"
  ),

  getProjectById
);

/* =========================================================
   UPDATE PROJECT

   Required permission:

   projects.update

   PATCH /api/v1/projects/:projectId
   ========================================================= */

router.patch(
  "/:projectId",

  permissionMiddleware(
    "projects.update"
  ),

  validateUpdateProject,

  updateProject
);

export default router;