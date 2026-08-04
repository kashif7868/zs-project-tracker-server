import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addAfterEvidenceService,
  addBeforeEvidenceService,
  deleteEvidenceService,
  deleteEvidenceTypeService,
  getEvidenceByIdService,
  getEvidenceByTypeService,
  getRiskEvidencesService,
} from "./evidence.service.js";

/* =========================================================
   DIRECTORY PATHS

   Current file:

   backend/src/modules/evidences/evidence.controller.js

   Public directory:

   backend/public
   ========================================================= */

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  path.dirname(currentFilePath);

const backendDirectory =
  path.resolve(
    currentDirectory,
    "../../../"
  );

const publicDirectory =
  path.resolve(
    backendDirectory,
    "public"
  );

const riskUploadDirectory =
  path.resolve(
    publicDirectory,
    "uploads",
    "risks"
  );

/* =========================================================
   RESPONSE HELPER
   ========================================================= */

const sendSuccessResponse = (
  res,
  statusCode,
  message,
  data = {}
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createHttpError = (
  statusCode,
  message
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = statusCode;

  return error;
};

/* =========================================================
   REQUEST FILE HELPER
   ========================================================= */

const getRequestFiles = (req) => {
  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.file) {
    return [req.file];
  }

  if (
    req.files &&
    typeof req.files === "object"
  ) {
    return Object.values(
      req.files
    ).flat();
  }

  return [];
};

/* =========================================================
   IMAGE PATH NORMALIZER
   ========================================================= */

const normalizeImagePaths = (
  imagePaths
) => {
  if (!Array.isArray(imagePaths)) {
    return [];
  }

  return [
    ...new Set(
      imagePaths
        .filter(
          (imagePath) =>
            typeof imagePath ===
              "string" &&
            imagePath.trim()
        )
        .map((imagePath) =>
          imagePath
            .trim()
            .replaceAll("\\", "/")
        )
    ),
  ];
};

/* =========================================================
   CONVERT PHYSICAL PATH TO PUBLIC PATH

   Physical:

   backend/public/uploads/risks/before/image.jpg

   Database:

   /uploads/risks/before/image.jpg
   ========================================================= */

const convertToPublicImagePath = (
  filePath
) => {
  if (
    typeof filePath !== "string" ||
    !filePath.trim()
  ) {
    return "";
  }

  const normalizedFilePath =
    filePath.trim();

  const absoluteFilePath =
    path.isAbsolute(
      normalizedFilePath
    )
      ? path.resolve(
          normalizedFilePath
        )
      : path.resolve(
          backendDirectory,
          normalizedFilePath
        );

  const relativeFilePath =
    path.relative(
      publicDirectory,
      absoluteFilePath
    );

  const isOutsidePublicDirectory =
    !relativeFilePath ||
    relativeFilePath.startsWith(
      ".."
    ) ||
    path.isAbsolute(
      relativeFilePath
    );

  if (isOutsidePublicDirectory) {
    return "";
  }

  return `/${relativeFilePath.replaceAll(
    "\\",
    "/"
  )}`;
};

/* =========================================================
   GET UPLOADED IMAGE PATHS
   ========================================================= */

const getUploadedImagePaths = (
  req,
  evidenceType
) => {
  const files =
    getRequestFiles(req);

  const expectedFolder =
    `/uploads/risks/${evidenceType}/`;

  const imagePaths =
    files
      .map((file) =>
        convertToPublicImagePath(
          file?.path
        )
      )
      .filter(
        (imagePath) =>
          imagePath.startsWith(
            expectedFolder
          )
      );

  return normalizeImagePaths(
    imagePaths
  );
};

/* =========================================================
   DELETE PHYSICAL IMAGE

   Sirf:

   backend/public/uploads/risks/

   ke andar wali file delete ho sakti hai.
   ========================================================= */

const deletePhysicalImage =
  async (imagePath) => {
    if (
      typeof imagePath !==
        "string" ||
      !imagePath.trim()
    ) {
      return false;
    }

    const normalizedImagePath =
      imagePath.trim();

    if (
      normalizedImagePath.startsWith(
        "http://"
      ) ||
      normalizedImagePath.startsWith(
        "https://"
      )
    ) {
      return false;
    }

    const cleanImagePath =
      normalizedImagePath
        .replaceAll("\\", "/")
        .replace(/^\/+/, "");

    const absoluteImagePath =
      path.resolve(
        publicDirectory,
        cleanImagePath
      );

    const relativeRiskPath =
      path.relative(
        riskUploadDirectory,
        absoluteImagePath
      );

    const isOutsideRiskFolder =
      !relativeRiskPath ||
      relativeRiskPath.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relativeRiskPath
      );

    if (isOutsideRiskFolder) {
      return false;
    }

    try {
      await fs.unlink(
        absoluteImagePath
      );

      return true;
    } catch (error) {
      if (
        error?.code === "ENOENT"
      ) {
        return false;
      }

      console.error(
        "Evidence image deletion failed:",
        error
      );

      return false;
    }
  };

/* =========================================================
   DELETE MULTIPLE PHYSICAL IMAGES
   ========================================================= */

const deletePhysicalImages =
  async (imagePaths = []) => {
    const normalizedImagePaths =
      normalizeImagePaths(
        imagePaths
      );

    if (
      normalizedImagePaths.length ===
      0
    ) {
      return {
        requested: 0,
        deleted: 0,
      };
    }

    const results =
      await Promise.allSettled(
        normalizedImagePaths.map(
          (imagePath) =>
            deletePhysicalImage(
              imagePath
            )
        )
      );

    const deleted =
      results.filter(
        (result) =>
          result.status ===
            "fulfilled" &&
          result.value === true
      ).length;

    return {
      requested:
        normalizedImagePaths.length,

      deleted,
    };
  };

/* =========================================================
   CLEAN FAILED UPLOAD

   Database operation fail hone par newly uploaded image
   files bhi delete hongi.
   ========================================================= */

const cleanupFailedUpload =
  async (imagePaths) => {
    try {
      await deletePhysicalImages(
        imagePaths
      );
    } catch (error) {
      console.error(
        "Failed upload cleanup error:",
        error
      );
    }
  };

/* =========================================================
   GET ALL EVIDENCE FOR ONE RISK

   GET /api/v1/evidences/risk/:riskId
   ========================================================= */

export const getRiskEvidences =
  async (req, res, next) => {
    try {
      const evidence =
        await getRiskEvidencesService(
          req.params.riskId
        );

      return sendSuccessResponse(
        res,
        200,
        "Risk Evidence retrieved successfully.",
        {
          evidence,
        }
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET BEFORE EVIDENCE

   GET /api/v1/evidences/risk/:riskId/before
   ========================================================= */

export const getBeforeEvidences =
  async (req, res, next) => {
    try {
      const result =
        await getEvidenceByTypeService(
          req.params.riskId,
          "before"
        );

      return sendSuccessResponse(
        res,
        200,
        "Before Evidence retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET AFTER EVIDENCE

   GET /api/v1/evidences/risk/:riskId/after
   ========================================================= */

export const getAfterEvidences =
  async (req, res, next) => {
    try {
      const result =
        await getEvidenceByTypeService(
          req.params.riskId,
          "after"
        );

      return sendSuccessResponse(
        res,
        200,
        "After Evidence retrieved successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET SINGLE EVIDENCE

   GET /api/v1/evidences/:evidenceId
   ========================================================= */

export const getEvidenceById =
  async (req, res, next) => {
    try {
      const evidence =
        await getEvidenceByIdService(
          req.params.evidenceId
        );

      return sendSuccessResponse(
        res,
        200,
        "Evidence image retrieved successfully.",
        {
          evidence,
        }
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   ADD BEFORE EVIDENCE

   POST /api/v1/evidences/risk/:riskId/before

   Multipart field:

   images
   ========================================================= */

export const addBeforeEvidence =
  async (req, res, next) => {
    const imagePaths =
      getUploadedImagePaths(
        req,
        "before"
      );

    try {
      if (
        imagePaths.length === 0
      ) {
        throw createHttpError(
          400,
          "At least one Before Evidence image is required."
        );
      }

      const result =
        await addBeforeEvidenceService(
          req.params.riskId,
          imagePaths
        );

      return sendSuccessResponse(
        res,
        201,
        "Before Evidence images uploaded successfully.",
        result
      );
    } catch (error) {
      await cleanupFailedUpload(
        imagePaths
      );

      return next(error);
    }
  };

/* =========================================================
   ADD AFTER EVIDENCE

   POST /api/v1/evidences/risk/:riskId/after

   Multipart field:

   images
   ========================================================= */

export const addAfterEvidence =
  async (req, res, next) => {
    const imagePaths =
      getUploadedImagePaths(
        req,
        "after"
      );

    try {
      if (
        imagePaths.length === 0
      ) {
        throw createHttpError(
          400,
          "At least one After Evidence image is required."
        );
      }

      const result =
        await addAfterEvidenceService(
          req.params.riskId,
          imagePaths
        );

      return sendSuccessResponse(
        res,
        201,
        "After Evidence images uploaded successfully.",
        result
      );
    } catch (error) {
      await cleanupFailedUpload(
        imagePaths
      );

      return next(error);
    }
  };

/* =========================================================
   DELETE SINGLE EVIDENCE

   DELETE /api/v1/evidences/risk/:riskId/:evidenceId
   ========================================================= */

export const deleteEvidence =
  async (req, res, next) => {
    try {
      const result =
        await deleteEvidenceService(
          req.params.riskId,
          req.params.evidenceId
        );

      const imageFileDeleted =
        await deletePhysicalImage(
          result.imagePath
        );

      return sendSuccessResponse(
        res,
        200,
        "Evidence image deleted successfully.",
        {
          evidence:
            result.evidence,

          risk:
            result.risk,

          evidenceSummary:
            result.evidenceSummary,

          imageFileDeleted,
        }
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE ALL BEFORE EVIDENCE

   DELETE /api/v1/evidences/risk/:riskId/before
   ========================================================= */

export const deleteBeforeEvidences =
  async (req, res, next) => {
    try {
      const result =
        await deleteEvidenceTypeService(
          req.params.riskId,
          "before"
        );

      const imageDeletion =
        await deletePhysicalImages(
          result.imagePaths
        );

      return sendSuccessResponse(
        res,
        200,
        "All Before Evidence images deleted successfully.",
        {
          evidenceType:
            result.evidenceType,

          deletedRecords:
            result.deletedRecords,

          imageFilesRequested:
            imageDeletion.requested,

          imageFilesDeleted:
            imageDeletion.deleted,

          risk:
            result.risk,

          evidenceSummary:
            result.evidenceSummary,
        }
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE ALL AFTER EVIDENCE

   DELETE /api/v1/evidences/risk/:riskId/after
   ========================================================= */

export const deleteAfterEvidences =
  async (req, res, next) => {
    try {
      const result =
        await deleteEvidenceTypeService(
          req.params.riskId,
          "after"
        );

      const imageDeletion =
        await deletePhysicalImages(
          result.imagePaths
        );

      return sendSuccessResponse(
        res,
        200,
        "All After Evidence images deleted successfully.",
        {
          evidenceType:
            result.evidenceType,

          deletedRecords:
            result.deletedRecords,

          imageFilesRequested:
            imageDeletion.requested,

          imageFilesDeleted:
            imageDeletion.deleted,

          risk:
            result.risk,

          evidenceSummary:
            result.evidenceSummary,
        }
      );
    } catch (error) {
      return next(error);
    }
  };