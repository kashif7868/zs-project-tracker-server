import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  permissionMiddleware,
} from "../../middlewares/role.middleware.js";

import {
  createActionPlan,
  deleteActionPlan,
  getActionPlanById,
  getActionPlans,
  getActionPlanSummary,
  getProjectActionPlans,
  getTaskActionPlans,
  updateActionPlan,
  updateActionPlanStatus,
} from "./actionPlan.controller.js";

import {
  validateActionPlanIdParam,
  validateActionPlanListQuery,
  validateActionPlanStatus,
  validateCreateActionPlan,
  validateProjectIdParam,
  validateTaskIdParam,
  validateUpdateActionPlan,
} from "./actionPlan.validation.js";

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION

   Action Plan module ki tamam dashboard routes protected hain.
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   CREATE ACTION PLAN

   POST /api/v1/action-plans

   Required permission:
   action_plans.create
   ========================================================= */

router.post(
  "/",

  permissionMiddleware(
    "action_plans.create"
  ),

  validateCreateActionPlan,

  createActionPlan
);

/* =========================================================
   GET ACTION PLAN SUMMARY

   GET /api/v1/action-plans/summary

   Optional query:
   projectId

   Required permission:
   action_plans.view
   ========================================================= */

router.get(
  "/summary",

  permissionMiddleware(
    "action_plans.view"
  ),

  getActionPlanSummary
);

/* =========================================================
   GET ALL ACTION PLANS

   GET /api/v1/action-plans

   Required permission:
   action_plans.view
   ========================================================= */

router.get(
  "/",

  permissionMiddleware(
    "action_plans.view"
  ),

  validateActionPlanListQuery,

  getActionPlans
);

/* =========================================================
   GET PROJECT ACTION PLANS

   GET /api/v1/action-plans/project/:projectId

   Required permission:
   action_plans.view
   ========================================================= */

router.get(
  "/project/:projectId",

  permissionMiddleware(
    "action_plans.view"
  ),

  validateProjectIdParam,
  validateActionPlanListQuery,

  getProjectActionPlans
);

/* =========================================================
   GET TASK ACTION PLANS

   GET /api/v1/action-plans/task/:taskId

   Required permission:
   action_plans.view
   ========================================================= */

router.get(
  "/task/:taskId",

  permissionMiddleware(
    "action_plans.view"
  ),

  validateTaskIdParam,
  validateActionPlanListQuery,

  getTaskActionPlans
);

/* =========================================================
   UPDATE ACTION PLAN STATUS

   PATCH /api/v1/action-plans/:actionPlanId/status

   Required permission:
   action_plans.update
   ========================================================= */

router.patch(
  "/:actionPlanId/status",

  permissionMiddleware(
    "action_plans.update"
  ),

  validateActionPlanIdParam,
  validateActionPlanStatus,

  updateActionPlanStatus
);

/* =========================================================
   GET SINGLE ACTION PLAN

   GET /api/v1/action-plans/:actionPlanId

   Required permission:
   action_plans.view
   ========================================================= */

router.get(
  "/:actionPlanId",

  permissionMiddleware(
    "action_plans.view"
  ),

  validateActionPlanIdParam,

  getActionPlanById
);

/* =========================================================
   UPDATE ACTION PLAN DETAILS

   PATCH /api/v1/action-plans/:actionPlanId

   Required permission:
   action_plans.update
   ========================================================= */

router.patch(
  "/:actionPlanId",

  permissionMiddleware(
    "action_plans.update"
  ),

  validateActionPlanIdParam,
  validateUpdateActionPlan,

  updateActionPlan
);

/* =========================================================
   DELETE ACTION PLAN

   DELETE /api/v1/action-plans/:actionPlanId

   Required permission:
   action_plans.delete
   ========================================================= */

router.delete(
  "/:actionPlanId",

  permissionMiddleware(
    "action_plans.delete"
  ),

  validateActionPlanIdParam,

  deleteActionPlan
);

export default router;
