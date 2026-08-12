import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  permissionMiddleware,
} from "../../middlewares/role.middleware.js";

import {
  addAfterEvidence,
  addBeforeEvidence,
  deleteAfterEvidences,
  deleteBeforeEvidences,
  deleteEvidence,
  getAfterEvidences,
  getBeforeEvidences,
  getEvidenceById,
  getTaskEvidences,
} from "./evidence.controller.js";

import {
  validateEvidenceIdParam,
  validateEvidenceUpload,
  validateTaskEvidenceParams,
  validateTaskIdParam,
} from "./evidence.validation.js";

import {
  handleEvidenceUpload,
  requireTaskIdForEvidenceUpload,
  uploadAfterEvidence,
  uploadBeforeEvidence,
} from "../../utils/multer.js";

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION

   Evidence module ki tamam dashboard routes protected hain.
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   GET COMPLETE TASK EVIDENCE

   GET /api/v1/evidences/task/:taskId
   ========================================================= */

router.get(
  "/task/:taskId",

  permissionMiddleware(
    "evidence.view"
  ),

  validateTaskIdParam,

  getTaskEvidences
);

/* =========================================================
   GET BEFORE EVIDENCE

   GET /api/v1/evidences/task/:taskId/before
   ========================================================= */

router.get(
  "/task/:taskId/before",

  permissionMiddleware(
    "evidence.view"
  ),

  validateTaskIdParam,

  getBeforeEvidences
);

/* =========================================================
   GET AFTER EVIDENCE

   GET /api/v1/evidences/task/:taskId/after
   ========================================================= */

router.get(
  "/task/:taskId/after",

  permissionMiddleware(
    "evidence.view"
  ),

  validateTaskIdParam,

  getAfterEvidences
);

/* =========================================================
   UPLOAD BEFORE EVIDENCE

   POST /api/v1/evidences/task/:taskId/before

   New uploads are written ONLY to:

   public/uploads/tasks/before
   ========================================================= */

router.post(
  "/task/:taskId/before",

  permissionMiddleware(
    "evidence.upload"
  ),

  validateTaskIdParam,

  requireTaskIdForEvidenceUpload,

  handleEvidenceUpload(
    uploadBeforeEvidence
  ),

  validateEvidenceUpload,

  addBeforeEvidence
);

/* =========================================================
   UPLOAD AFTER EVIDENCE

   POST /api/v1/evidences/task/:taskId/after

   New uploads are written ONLY to:

   public/uploads/tasks/after
   ========================================================= */

router.post(
  "/task/:taskId/after",

  permissionMiddleware(
    "evidence.upload"
  ),

  validateTaskIdParam,

  requireTaskIdForEvidenceUpload,

  handleEvidenceUpload(
    uploadAfterEvidence
  ),

  validateEvidenceUpload,

  addAfterEvidence
);

/* =========================================================
   DELETE ALL BEFORE EVIDENCE

   DELETE /api/v1/evidences/task/:taskId/before
   ========================================================= */

router.delete(
  "/task/:taskId/before",

  permissionMiddleware(
    "evidence.delete"
  ),

  validateTaskIdParam,

  deleteBeforeEvidences
);

/* =========================================================
   DELETE ALL AFTER EVIDENCE

   DELETE /api/v1/evidences/task/:taskId/after
   ========================================================= */

router.delete(
  "/task/:taskId/after",

  permissionMiddleware(
    "evidence.delete"
  ),

  validateTaskIdParam,

  deleteAfterEvidences
);

/* =========================================================
   DELETE SINGLE EVIDENCE

   DELETE /api/v1/evidences/task/:taskId/:evidenceId
   ========================================================= */

router.delete(
  "/task/:taskId/:evidenceId",

  permissionMiddleware(
    "evidence.delete"
  ),

  validateTaskEvidenceParams,

  deleteEvidence
);

/* =========================================================
   GET SINGLE EVIDENCE

   GET /api/v1/evidences/:evidenceId
   ========================================================= */

router.get(
  "/:evidenceId",

  permissionMiddleware(
    "evidence.view"
  ),

  validateEvidenceIdParam,

  getEvidenceById
);

/* =========================================================
   LEGACY RISK ROUTES

   IMPORTANT:
   Legacy upload POST routes have been REMOVED.

   Is se koi bhi new Evidence file /uploads/risks folder mein
   write nahi ho sakti.

   Temporary GET/DELETE aliases old dashboard links aur old
   database records ke liye retained hain. Inko frontend
   migration complete hone ke baad remove kar dena.
   ========================================================= */

router.get(
  "/risk/:taskId",

  permissionMiddleware(
    "evidence.view"
  ),

  validateTaskIdParam,

  getTaskEvidences
);

router.get(
  "/risk/:taskId/before",

  permissionMiddleware(
    "evidence.view"
  ),

  validateTaskIdParam,

  getBeforeEvidences
);

router.get(
  "/risk/:taskId/after",

  permissionMiddleware(
    "evidence.view"
  ),

  validateTaskIdParam,

  getAfterEvidences
);

router.delete(
  "/risk/:taskId/before",

  permissionMiddleware(
    "evidence.delete"
  ),

  validateTaskIdParam,

  deleteBeforeEvidences
);

router.delete(
  "/risk/:taskId/after",

  permissionMiddleware(
    "evidence.delete"
  ),

  validateTaskIdParam,

  deleteAfterEvidences
);

router.delete(
  "/risk/:taskId/:evidenceId",

  permissionMiddleware(
    "evidence.delete"
  ),

  validateTaskEvidenceParams,

  deleteEvidence
);

export default router;
