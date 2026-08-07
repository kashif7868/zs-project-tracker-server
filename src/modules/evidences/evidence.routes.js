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
  getRiskEvidences,
} from "./evidence.controller.js";

import {
  handleEvidenceUpload,
  uploadAfterEvidence,
  uploadBeforeEvidence,
} from "../../utils/multer.js";

const router = express.Router();

/* =========================================================
   AUTHENTICATION

   Evidence module ki tamam routes protected hain.
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   GET COMPLETE RISK EVIDENCE

   Required permission:

   evidence.view

   GET /api/v1/evidences/risk/:riskId

   Response:

   - Before Evidence
   - After Evidence
   - Before count
   - After count
   - completion eligibility
   ========================================================= */

router.get(
  "/risk/:riskId",

  permissionMiddleware(
    "evidence.view"
  ),

  getRiskEvidences
);

/* =========================================================
   GET BEFORE EVIDENCE

   Required permission:

   evidence.view

   GET /api/v1/evidences/risk/:riskId/before
   ========================================================= */

router.get(
  "/risk/:riskId/before",

  permissionMiddleware(
    "evidence.view"
  ),

  getBeforeEvidences
);

/* =========================================================
   GET AFTER EVIDENCE

   Required permission:

   evidence.view

   GET /api/v1/evidences/risk/:riskId/after
   ========================================================= */

router.get(
  "/risk/:riskId/after",

  permissionMiddleware(
    "evidence.view"
  ),

  getAfterEvidences
);

/* =========================================================
   UPLOAD BEFORE EVIDENCE

   Required permission:

   evidence.upload

   POST /api/v1/evidences/risk/:riskId/before

   Content-Type:

   multipart/form-data

   Multipart field:

   images

   Supported formats:

   JPG
   JPEG
   PNG
   WEBP

   Limits:

   - maximum 10 files in one upload request
   - maximum 10 Before images per Risk
   - maximum 10 MB per image

   Upload Risk ko automatically Complete nahi karega.
   ========================================================= */

router.post(
  "/risk/:riskId/before",

  permissionMiddleware(
    "evidence.upload"
  ),

  handleEvidenceUpload(
    uploadBeforeEvidence
  ),

  addBeforeEvidence
);

/* =========================================================
   UPLOAD AFTER EVIDENCE

   Required permission:

   evidence.upload

   POST /api/v1/evidences/risk/:riskId/after

   Content-Type:

   multipart/form-data

   Multipart field:

   images

   Supported formats:

   JPG
   JPEG
   PNG
   WEBP

   Limits:

   - maximum 10 files in one upload request
   - maximum 10 After images per Risk
   - maximum 10 MB per image

   Upload ke baad Mark Complete action manually use hoga.
   ========================================================= */

router.post(
  "/risk/:riskId/after",

  permissionMiddleware(
    "evidence.upload"
  ),

  handleEvidenceUpload(
    uploadAfterEvidence
  ),

  addAfterEvidence
);

/* =========================================================
   DELETE ALL BEFORE EVIDENCE

   Required permission:

   evidence.delete

   DELETE /api/v1/evidences/risk/:riskId/before

   Deletes:

   - Before Evidence database records
   - related local image files

   Complete Risk ki required Before Evidence remove hone par
   backend status ko In Progress mein revert karega.
   ========================================================= */

router.delete(
  "/risk/:riskId/before",

  permissionMiddleware(
    "evidence.delete"
  ),

  deleteBeforeEvidences
);

/* =========================================================
   DELETE ALL AFTER EVIDENCE

   Required permission:

   evidence.delete

   DELETE /api/v1/evidences/risk/:riskId/after

   Deletes:

   - After Evidence database records
   - related local image files

   Complete Risk ki required After Evidence remove hone par
   backend status ko In Progress mein revert karega.
   ========================================================= */

router.delete(
  "/risk/:riskId/after",

  permissionMiddleware(
    "evidence.delete"
  ),

  deleteAfterEvidences
);

/* =========================================================
   DELETE SINGLE EVIDENCE

   Required permission:

   evidence.delete

   DELETE /api/v1/evidences/risk/:riskId/:evidenceId

   Database record aur related local image file delete hogi.

   Required Evidence remove hone par completed Risk ka status
   In Progress mein revert ho sakta hai.
   ========================================================= */

router.delete(
  "/risk/:riskId/:evidenceId",

  permissionMiddleware(
    "evidence.delete"
  ),

  deleteEvidence
);

/* =========================================================
   GET SINGLE EVIDENCE

   Required permission:

   evidence.view

   GET /api/v1/evidences/:evidenceId
   ========================================================= */

router.get(
  "/:evidenceId",

  permissionMiddleware(
    "evidence.view"
  ),

  getEvidenceById
);

export default router;