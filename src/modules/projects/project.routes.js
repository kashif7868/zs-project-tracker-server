import express from "express";

import {
  archiveProject,
  completeProject,
  createProject,
  getProjectById,
  getProjects,
  getPublicProjectByAccessToken,
  getPublicProjectTasks,
  permanentlyDeleteProject,
  putProjectOnHold,
  regenerateClientAccessToken,
  reopenProject,
  resumeProject,
  revokeClientAccess,
  startProject,
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

   IMPORTANT:
   In public routes par Authorization header required nahi hai.

   In routes ko router.use(authMiddleware) aur /:projectId
   routes se PEHLE rakhna zaroori hai.
   ========================================================= */

/* ---------------------------------------------------------
   PUBLIC PROJECT DETAILS

   GET
   /api/v1/projects/public/access/:accessToken
   --------------------------------------------------------- */

router.get(
  "/public/access/:accessToken",
  getPublicProjectByAccessToken
);

/* ---------------------------------------------------------
   PUBLIC PROJECT TASK REGISTER

   GET
   /api/v1/projects/public/access/:accessToken/tasks

   Client frontend isi endpoint se project ke client-visible
   Tasks aur unki Evidence information load karega.

   Login / Authorization header required nahi hai.
   --------------------------------------------------------- */

router.get(
  "/public/access/:accessToken/tasks",
  getPublicProjectTasks
);

/* =========================================================
   AUTHENTICATION

   Is point ke BAAD tamam routes protected hain.
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
   CLIENT ACCESS

   POST  /:projectId/client-access
   PATCH /:projectId/client-access/revoke
   ========================================================= */

router.post(
  "/:projectId/client-access",
  permissionMiddleware(
    "projects.client_access"
  ),
  regenerateClientAccessToken
);

router.patch(
  "/:projectId/client-access/revoke",
  permissionMiddleware(
    "projects.client_access"
  ),
  revokeClientAccess
);

/* =========================================================
   PROJECT LIFECYCLE

   Generic Edit Project lifecycle status control nahi karega.

   Dedicated transition endpoints:

   draft      -> active
   active     -> on_hold
   on_hold    -> active
   active /
   on_hold    -> completed
   completed  -> active
   completed  -> archived
   ========================================================= */

/* START PROJECT
   draft -> active */

router.patch(
  "/:projectId/start",
  permissionMiddleware(
    "projects.update"
  ),
  startProject
);

/* PUT ON HOLD
   active -> on_hold */

router.patch(
  "/:projectId/hold",
  permissionMiddleware(
    "projects.update"
  ),
  putProjectOnHold
);

/* RESUME PROJECT
   on_hold -> active */

router.patch(
  "/:projectId/resume",
  permissionMiddleware(
    "projects.update"
  ),
  resumeProject
);

/* MARK COMPLETED
   active / on_hold -> completed */

router.patch(
  "/:projectId/complete",
  permissionMiddleware(
    "projects.update"
  ),
  completeProject
);

/* REOPEN PROJECT
   completed -> active */

router.patch(
  "/:projectId/reopen",
  permissionMiddleware(
    "projects.update"
  ),
  reopenProject
);

/* ARCHIVE PROJECT
   completed -> archived */

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
   UPDATE PROJECT DETAILS

   Required permission:
   projects.update

   PATCH /api/v1/projects/:projectId

   NOTE:
   Status/lifecycle fields service layer protect karti hai.
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