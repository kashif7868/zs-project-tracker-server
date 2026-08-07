import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  permissionMiddleware,
} from "../../middlewares/role.middleware.js";

import {
  createRisk,
  deleteRisk,
  getProjectRisks,
  getRiskById,
  getRisks,
  markRiskComplete,
  markRiskInProgress,
  updateRisk,
  updateRiskStatus,
} from "./risk.controller.js";

import {
  validateCreateRisk,
  validateProjectIdParam,
  validateRiskIdParam,
  validateRiskListQuery,
  validateRiskStatusUpdate,
  validateUpdateRisk,
} from "./risk.validation.js";

const router = express.Router();

/* =========================================================
   AUTHENTICATION

   Risk Register ki tamam routes protected hain.
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   PROJECT-SPECIFIC RISK LIST

   Required permission:

   risks.view

   GET /api/v1/risks/project/:projectId
   ========================================================= */

router.get(
  "/project/:projectId",

  permissionMiddleware(
    "risks.view"
  ),

  validateProjectIdParam,
  validateRiskListQuery,

  getProjectRisks
);

/* =========================================================
   GET ALL RISKS

   Required permission:

   risks.view

   GET /api/v1/risks
   ========================================================= */

router.get(
  "/",

  permissionMiddleware(
    "risks.view"
  ),

  validateRiskListQuery,

  getRisks
);

/* =========================================================
   CREATE RISK

   Required permission:

   risks.create

   POST /api/v1/risks

   Accepted fields:

   projectId
   description
   riskRegisterId optional

   Backend automatically:

   - selected Project fetch karega
   - Project Reference Number fetch karega
   - project-wise serialNo generate karega
   - status in_progress rakhega
   ========================================================= */

router.post(
  "/",

  permissionMiddleware(
    "risks.create"
  ),

  validateCreateRisk,

  createRisk
);

/* =========================================================
   MARK COMPLETE

   Required permission:

   risks.complete

   PATCH /api/v1/risks/:riskId/complete

   Minimum Evidence:

   - one Before image
   - one After image
   ========================================================= */

router.patch(
  "/:riskId/complete",

  permissionMiddleware(
    "risks.complete"
  ),

  validateRiskIdParam,

  markRiskComplete
);

/* =========================================================
   MOVE TO IN PROGRESS

   Required permission:

   risks.complete

   Yeh completion workflow ka reverse action hai, is liye
   same permission use hogi.

   PATCH /api/v1/risks/:riskId/in-progress
   ========================================================= */

router.patch(
  "/:riskId/in-progress",

  permissionMiddleware(
    "risks.complete"
  ),

  validateRiskIdParam,

  markRiskInProgress
);

/* =========================================================
   GENERIC STATUS UPDATE

   Required permission:

   risks.complete

   PATCH /api/v1/risks/:riskId/status

   Supported statuses:

   in_progress
   complete
   ========================================================= */

router.patch(
  "/:riskId/status",

  permissionMiddleware(
    "risks.complete"
  ),

  validateRiskIdParam,
  validateRiskStatusUpdate,

  updateRiskStatus
);

/* =========================================================
   GET SINGLE RISK

   Required permission:

   risks.view

   GET /api/v1/risks/:riskId

   Response:

   - Risk details
   - Before Evidence
   - After Evidence
   - completion eligibility
   ========================================================= */

router.get(
  "/:riskId",

  permissionMiddleware(
    "risks.view"
  ),

  validateRiskIdParam,

  getRiskById
);

/* =========================================================
   UPDATE RISK

   Required permission:

   risks.update

   PATCH /api/v1/risks/:riskId

   Editable fields:

   description
   riskRegisterId optional

   Protected fields:

   projectId
   projectCode
   serialNo
   status

   Status ke liye dedicated endpoints use hongi.
   ========================================================= */

router.patch(
  "/:riskId",

  permissionMiddleware(
    "risks.update"
  ),

  validateRiskIdParam,
  validateUpdateRisk,

  updateRisk
);

/* =========================================================
   DELETE RISK

   Required permission:

   risks.delete

   DELETE /api/v1/risks/:riskId

   Backend deletes:

   - Risk record
   - Before Evidence records
   - After Evidence records
   - related local image files
   ========================================================= */

router.delete(
  "/:riskId",

  permissionMiddleware(
    "risks.delete"
  ),

  validateRiskIdParam,

  deleteRisk
);

export default router;