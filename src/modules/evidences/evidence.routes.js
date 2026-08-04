import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

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

   Evidence ki tamam routes protected hain.
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
   GET COMPLETE RISK EVIDENCE

   GET /api/v1/evidences/risk/:riskId

   Returns:

   before
   after
   beforeCount
   afterCount
   canMarkComplete
   ========================================================= */

router.get(
  "/risk/:riskId",
  getRiskEvidences
);

/* =========================================================
   GET BEFORE EVIDENCE

   GET /api/v1/evidences/risk/:riskId/before
   ========================================================= */

router.get(
  "/risk/:riskId/before",
  getBeforeEvidences
);

/* =========================================================
   GET AFTER EVIDENCE

   GET /api/v1/evidences/risk/:riskId/after
   ========================================================= */

router.get(
  "/risk/:riskId/after",
  getAfterEvidences
);

/* =========================================================
   UPLOAD BEFORE EVIDENCE

   POST /api/v1/evidences/risk/:riskId/before

   Content-Type:

   multipart/form-data

   Field name:

   images

   Allowed:

   JPG
   JPEG
   PNG
   WEBP

   Maximum:

   10 images per request
   10 MB per image
   ========================================================= */

router.post(
  "/risk/:riskId/before",
  adminOnly,
  handleEvidenceUpload(
    uploadBeforeEvidence
  ),
  addBeforeEvidence
);

/* =========================================================
   UPLOAD AFTER EVIDENCE

   POST /api/v1/evidences/risk/:riskId/after

   Content-Type:

   multipart/form-data

   Field name:

   images

   After images upload hone ke baad risk automatically
   Complete nahi hoga.

   User Risk API ka Mark Complete action use karega.
   ========================================================= */

router.post(
  "/risk/:riskId/after",
  adminOnly,
  handleEvidenceUpload(
    uploadAfterEvidence
  ),
  addAfterEvidence
);

/* =========================================================
   DELETE ALL BEFORE EVIDENCE

   DELETE /api/v1/evidences/risk/:riskId/before

   Deletes:

   - all Before Evidence database records
   - all Before Evidence physical images

   Complete risk ki Before images remove hone par status
   automatically In Progress ho jayega.
   ========================================================= */

router.delete(
  "/risk/:riskId/before",
  adminOnly,
  deleteBeforeEvidences
);

/* =========================================================
   DELETE ALL AFTER EVIDENCE

   DELETE /api/v1/evidences/risk/:riskId/after

   Deletes:

   - all After Evidence database records
   - all After Evidence physical images

   Complete risk ki After images remove hone par status
   automatically In Progress ho jayega.
   ========================================================= */

router.delete(
  "/risk/:riskId/after",
  adminOnly,
  deleteAfterEvidences
);

/* =========================================================
   DELETE SINGLE EVIDENCE IMAGE

   DELETE
   /api/v1/evidences/risk/:riskId/:evidenceId

   Deletes:

   - selected Evidence database record
   - selected physical image
   ========================================================= */

router.delete(
  "/risk/:riskId/:evidenceId",
  adminOnly,
  deleteEvidence
);

/* =========================================================
   GET SINGLE EVIDENCE

   GET /api/v1/evidences/:evidenceId
   ========================================================= */

router.get(
  "/:evidenceId",
  getEvidenceById
);

export default router;