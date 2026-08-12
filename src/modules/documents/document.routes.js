import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  permissionMiddleware,
} from "../../middlewares/role.middleware.js";

import {
  deleteDocument,
  downloadDocument,
  generateDocument,
  getDocumentById,
  getDocuments,
  getProjectDocuments,
} from "./document.controller.js";

import {
  validateDocumentIdParam,
  validateDocumentListQuery,
  validateGenerateDocument,
  validateProjectIdParam,
} from "./document.validation.js";

const router =
  express.Router();

/* =========================================================
   AUTHENTICATION

   Documents module ki tamam routes protected hain.
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   GENERATE DOCUMENT

   Required permission:

   documents.generate

   POST /api/v1/documents/generate

   Existing Task Register se selected Project ka data export hoga.

   Supported formats:

   pdf
   docx
   xlsx

   Task records duplicate create nahi honge.
   Generated file aur report history save hogi.
   ========================================================= */

router.post(
  "/generate",

  permissionMiddleware(
    "documents.generate"
  ),

  validateGenerateDocument,

  generateDocument
);

/* =========================================================
   GET ALL DOCUMENT HISTORY

   Required permission:

   documents.view

   GET /api/v1/documents

   Supported query filters:

   projectId
   search
   layout
   format
   status
   generatedBy
   dateFrom
   dateTo
   page
   limit
   sortBy
   sortOrder
   ========================================================= */

router.get(
  "/",

  permissionMiddleware(
    "documents.view"
  ),

  validateDocumentListQuery,

  getDocuments
);

/* =========================================================
   GET PROJECT DOCUMENT HISTORY

   Required permission:

   documents.view

   GET /api/v1/documents/project/:projectId
   ========================================================= */

router.get(
  "/project/:projectId",

  permissionMiddleware(
    "documents.view"
  ),

  validateProjectIdParam,
  validateDocumentListQuery,

  getProjectDocuments
);

/* =========================================================
   DOWNLOAD GENERATED DOCUMENT

   Required permission:

   documents.view

   GET /api/v1/documents/:documentId/download

   Only completed documents can be downloaded.
   ========================================================= */

router.get(
  "/:documentId/download",

  permissionMiddleware(
    "documents.view"
  ),

  validateDocumentIdParam,

  downloadDocument
);

/* =========================================================
   GET SINGLE DOCUMENT HISTORY RECORD

   Required permission:

   documents.view

   GET /api/v1/documents/:documentId
   ========================================================= */

router.get(
  "/:documentId",

  permissionMiddleware(
    "documents.view"
  ),

  validateDocumentIdParam,

  getDocumentById
);

/* =========================================================
   DELETE DOCUMENT HISTORY AND GENERATED FILE

   Required permission:

   documents.delete

   DELETE /api/v1/documents/:documentId

   Deletes:

   - generated PDF, DOCX or XLSX file
   - Document History database record

   Does not delete:

   - Project
   - Task Register records
   - Before Evidence
   - After Evidence
   ========================================================= */

router.delete(
  "/:documentId",

  permissionMiddleware(
    "documents.delete"
  ),

  validateDocumentIdParam,

  deleteDocument
);

export default router;
