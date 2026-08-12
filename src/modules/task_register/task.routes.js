import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  permissionMiddleware,
} from "../../middlewares/role.middleware.js";

import {
  createTask,
  deleteTask,
  getProjectTasks,
  getTaskById,
  getTasks,
  markTaskComplete,
  markTaskInProgress,
  updateTask,
  updateTaskStatus,
} from "./task.controller.js";

import {
  validateCreateTask,
  validateProjectIdParam,
  validateTaskIdParam,
  validateTaskListQuery,
  validateTaskStatusUpdate,
  validateUpdateTask,
} from "./task.validation.js";

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION

   Canonical backend module:
   Task Register

   Mount this router at:
   /api/v1/tasks
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   PROJECT-SPECIFIC TASK LIST

   Required permission:
   risks.view

   NOTE:
   Permission keys abhi existing auth compatibility ke liye
   "risks.*" preserve hain. Inko baad mein separate permission
   migration step mein "tasks.*" ki taraf le jayenge.

   GET /api/v1/tasks/project/:projectId
   ========================================================= */

router.get(
  "/project/:projectId",

  permissionMiddleware(
    "risks.view"
  ),

  validateProjectIdParam,
  validateTaskListQuery,

  getProjectTasks
);

/* =========================================================
   GET ALL TASKS

   Required permission:
   risks.view

   GET /api/v1/tasks
   ========================================================= */

router.get(
  "/",

  permissionMiddleware(
    "risks.view"
  ),

  validateTaskListQuery,

  getTasks
);

/* =========================================================
   CREATE TASK

   Required permission:
   risks.create

   POST /api/v1/tasks

   Current accepted fields:

   projectId
   description
   taskRegisterId optional

   Backend automatically:

   - Project Reference Number fetch karega
   - project-wise stored serialNo generate karega
   - status in_progress rakhega
   - createdAt / updatedAt timestamps save karega
   - UI list displaySrNo continuous derive karegi
   ========================================================= */

router.post(
  "/",

  permissionMiddleware(
    "risks.create"
  ),

  validateCreateTask,

  createTask
);

/* =========================================================
   MOVE TASK TO IN PROGRESS

   Required permission:
   risks.complete

   PATCH /api/v1/tasks/:taskId/in-progress

   Complete task ko reopen karne ke liye bhi yahi endpoint.
   ========================================================= */

router.patch(
  "/:taskId/in-progress",

  permissionMiddleware(
    "risks.complete"
  ),

  validateTaskIdParam,

  markTaskInProgress
);

/* =========================================================
   MARK TASK COMPLETE

   Required permission:
   risks.complete

   PATCH /api/v1/tasks/:taskId/complete

   Minimum Evidence:

   - one Before image
   - one After image
   ========================================================= */

router.patch(
  "/:taskId/complete",

  permissionMiddleware(
    "risks.complete"
  ),

  validateTaskIdParam,

  markTaskComplete
);

/* =========================================================
   GENERIC TASK STATUS UPDATE

   Required permission:
   risks.complete

   PATCH /api/v1/tasks/:taskId/status

   Supported statuses:

   in_progress
   complete
   ========================================================= */

router.patch(
  "/:taskId/status",

  permissionMiddleware(
    "risks.complete"
  ),

  validateTaskIdParam,
  validateTaskStatusUpdate,

  updateTaskStatus
);

/* =========================================================
   GET SINGLE TASK

   Required permission:
   risks.view

   GET /api/v1/tasks/:taskId

   Response:

   - Task details
   - Before Evidence
   - After Evidence
   - completion eligibility
   ========================================================= */

router.get(
  "/:taskId",

  permissionMiddleware(
    "risks.view"
  ),

  validateTaskIdParam,

  getTaskById
);

/* =========================================================
   UPDATE TASK

   Required permission:
   risks.update

   PATCH /api/v1/tasks/:taskId

   Editable fields:

   description
   taskRegisterId optional

   Protected fields:

   projectId
   projectCode
   serialNo
   status

   Status ke liye dedicated endpoints use hongi.
   ========================================================= */

router.patch(
  "/:taskId",

  permissionMiddleware(
    "risks.update"
  ),

  validateTaskIdParam,
  validateUpdateTask,

  updateTask
);

/* =========================================================
   DELETE TASK

   Required permission:
   risks.delete

   DELETE /api/v1/tasks/:taskId

   Backend deletes:

   - Task record
   - Before Evidence records
   - After Evidence records
   - related local image files

   Stored serialNo stable rahega.
   UI displaySrNo continuous sequence show karega.
   ========================================================= */

router.delete(
  "/:taskId",

  permissionMiddleware(
    "risks.delete"
  ),

  validateTaskIdParam,

  deleteTask
);

export default router;
