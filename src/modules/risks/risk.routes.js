import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

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

router.use(authMiddleware);

/* =========================================================
   ROLE AUTHORIZATION
   ========================================================= */

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message:
          "User role information is not available.",
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to perform this action.",
      });
    }

    return next();
  };
};

const adminOnly = authorizeRoles(
  "admin",
  "super_admin"
);

/* =========================================================
   PROJECT-SPECIFIC ROUTES

   In routes ko /:riskId se pehle rakhna zaroori hai.
   ========================================================= */

/**
 * GET /api/v1/risks/project/:projectId
 *
 * Selected project ke risks fetch karega.
 *
 * Project ID frontend project dropdown se aayegi.
 *
 * Query:
 * search
 * status
 * page
 * limit
 * sortBy
 * sortOrder
 */
router.get(
  "/project/:projectId",
  validateProjectIdParam,
  validateRiskListQuery,
  getProjectRisks
);

/* =========================================================
   MAIN RISK COLLECTION
   ========================================================= */

/**
 * GET /api/v1/risks
 *
 * Tamam risk records retrieve karega.
 *
 * Query:
 * projectId
 * search
 * status
 * page
 * limit
 * sortBy
 * sortOrder
 *
 * Examples:
 *
 * /api/v1/risks
 *
 * /api/v1/risks?projectId=PROJECT_ID
 *
 * /api/v1/risks?status=in_progress
 *
 * /api/v1/risks?search=R-001
 */
router.get(
  "/",
  validateRiskListQuery,
  getRisks
);

/**
 * POST /api/v1/risks
 *
 * Naya Risk Register record create karega.
 *
 * Body:
 *
 * {
 *   "projectId": "PROJECT_MONGODB_ID",
 *   "serialNo": "01",
 *   "riskRegisterId": "R-001",
 *   "description": "DB mein exposed wiring observed hui."
 * }
 *
 * Controller/service:
 *
 * - project fetch karega
 * - projectCode fetch karega
 * - status automatically in_progress rakhega
 */
router.post(
  "/",
  adminOnly,
  validateCreateRisk,
  createRisk
);

/* =========================================================
   STATUS ACTION ROUTES

   In routes ko /:riskId se pehle define karna zaroori nahi,
   kyun ke in mein additional path segment hai. Phir bhi
   clarity ke liye single-risk CRUD se pehle rakhi hain.
   ========================================================= */

/**
 * PATCH /api/v1/risks/:riskId/complete
 *
 * Frontend ka Mark Complete button is endpoint ko call karega.
 *
 * Body required nahi hai.
 *
 * Complete hone ke liye:
 *
 * - minimum one Before Evidence image
 * - minimum one After Evidence image
 *
 * Evidence separate Evidence API se fetch hogi.
 */
router.patch(
  "/:riskId/complete",
  adminOnly,
  validateRiskIdParam,
  markRiskComplete
);

/**
 * PATCH /api/v1/risks/:riskId/in-progress
 *
 * Complete risk ko dobara In Progress karne ke liye.
 *
 * Body required nahi hai.
 */
router.patch(
  "/:riskId/in-progress",
  adminOnly,
  validateRiskIdParam,
  markRiskInProgress
);

/**
 * PATCH /api/v1/risks/:riskId/status
 *
 * Generic status endpoint.
 *
 * Body:
 *
 * {
 *   "status": "in_progress"
 * }
 *
 * Or:
 *
 * {
 *   "status": "complete"
 * }
 *
 * Supported values:
 *
 * in_progress
 * complete
 */
router.patch(
  "/:riskId/status",
  adminOnly,
  validateRiskIdParam,
  validateRiskStatusUpdate,
  updateRiskStatus
);

/* =========================================================
   SINGLE RISK CRUD ROUTES
   ========================================================= */

/**
 * GET /api/v1/risks/:riskId
 *
 * Risk ki complete details retrieve karega:
 *
 * - projectId
 * - projectCode
 * - serialNo
 * - riskRegisterId
 * - description
 * - status
 * - Before Evidence records
 * - After Evidence records
 * - canMarkComplete
 */
router.get(
  "/:riskId",
  validateRiskIdParam,
  getRiskById
);

/**
 * PATCH /api/v1/risks/:riskId
 *
 * Risk ki main information update karega.
 *
 * Body:
 *
 * {
 *   "projectId": "PROJECT_MONGODB_ID",
 *   "serialNo": "01",
 *   "riskRegisterId": "R-001",
 *   "description": "Updated risk description."
 * }
 *
 * projectCode selected project se automatically fetch hoga.
 *
 * Status aur Evidence is endpoint se update nahi honge.
 */
router.patch(
  "/:riskId",
  adminOnly,
  validateRiskIdParam,
  validateUpdateRisk,
  updateRisk
);

/**
 * DELETE /api/v1/risks/:riskId
 *
 * Deletes:
 *
 * - Risk record
 * - Before Evidence database records
 * - After Evidence database records
 * - Before Evidence image files
 * - After Evidence image files
 */
router.delete(
  "/:riskId",
  adminOnly,
  validateRiskIdParam,
  deleteRisk
);

export default router;