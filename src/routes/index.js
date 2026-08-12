import express from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import roleRoutes from "../modules/roles/role.routes.js";
import projectRoutes from "../modules/projects/project.routes.js";
import taskRoutes from "../modules/task_register/task.routes.js";
import evidenceRoutes from "../modules/evidences/evidence.routes.js";
import documentRoutes from "../modules/documents/document.routes.js";

const router = express.Router();

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

   New backend/dashboard/frontend should use this route.
   ========================================================= */

router.use(
  "/tasks",
  taskRoutes
);

/* =========================================================
   TEMPORARY LEGACY RISK ROUTE

   /api/v1/risks

   Migration ke duran existing dashboard/frontend ko break
   hone se bachane ke liye temporarily same Task router mount
   kiya gaya hai.

   Dashboard + public frontend fully /tasks par migrate hone
   ke baad is block ko remove kar dena.
   ========================================================= */

router.use(
  "/risks",
  taskRoutes
);

/* =========================================================
   EVIDENCE ROUTES
   /api/v1/evidences

   NOTE:
   Evidence module abhi legacy riskId routes use kar raha hai.

   Next migration step mein:
   /risk/:riskId
   ->
   /task/:taskId

   convert karenge.
   ========================================================= */

router.use(
  "/evidences",
  evidenceRoutes
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