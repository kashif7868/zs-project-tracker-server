import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import roleRoutes from "../modules/roles/role.routes.js";
import projectRoutes from "../modules/projects/project.routes.js";
import taskRoutes from "../modules/task_register/task.routes.js";
import evidenceRoutes from "../modules/evidences/evidence.routes.js";
import documentRoutes from "../modules/documents/document.routes.js";
import actionPlanRoutes from "../modules/action_plans/actionPlan.routes.js";

const router =
  express.Router();

/* =========================================================
   AUTH ROUTES

   /api/v1/auth
   ========================================================= */

router.use(
  "/auth",
  authRoutes
);

/* =========================================================
   USER ROUTES

   /api/v1/users
   ========================================================= */

router.use(
  "/users",
  userRoutes
);

/* =========================================================
   ROLE ROUTES

   /api/v1/roles
   ========================================================= */

router.use(
  "/roles",
  roleRoutes
);

/* =========================================================
   PROJECT ROUTES

   /api/v1/projects
   ========================================================= */

router.use(
  "/projects",
  projectRoutes
);

/* =========================================================
   TASK REGISTER ROUTES

   Canonical API:

   /api/v1/tasks
   ========================================================= */

router.use(
  "/tasks",
  taskRoutes
);

/* =========================================================
   TEMPORARY LEGACY RISK ROUTE

   /api/v1/risks

   Existing older dashboard/frontend references may still use
   this alias. Remove it only after the entire application has
   fully migrated to /tasks.
   ========================================================= */

router.use(
  "/risks",
  taskRoutes
);

/* =========================================================
   EVIDENCE ROUTES

   Canonical API:

   /api/v1/evidences

   Evidence uploads now use canonical Task routes:

   /api/v1/evidences/task/:taskId/before
   /api/v1/evidences/task/:taskId/after
   ========================================================= */

router.use(
  "/evidences",
  evidenceRoutes
);

/* =========================================================
   ACTION PLAN ROUTES

   Canonical API:

   /api/v1/action-plans
   ========================================================= */

router.use(
  "/action-plans",
  actionPlanRoutes
);

/* =========================================================
   DOCUMENT AND REPORT ROUTES

   /api/v1/documents
   ========================================================= */

router.use(
  "/documents",
  documentRoutes
);

export default router;
