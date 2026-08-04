import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createRiskService,
  deleteRiskService,
  getRiskByIdService,
  getRisksService,
  updateRiskService,
  updateRiskStatusService,
} from "./risk.service.js";

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
   DIRECTORY PATHS

   Current file:

   backend/src/modules/risks/risk.controller.js

   Public folder:

   backend/public
   ========================================================= */

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  path.dirname(currentFilePath);

const publicDirectory = path.resolve(
  currentDirectory,
  "../../../public"
);

const riskUploadsDirectory = path.resolve(
  publicDirectory,
  "uploads",
  "risks"
);

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
          imagePath.trim()
        )
    ),
  ];
};

/* =========================================================
   DELETE ONE RISK IMAGE

   Security:

   Sirf public/uploads/risks folder ke andar wali files
   delete ho sakti hain.
   ========================================================= */

const deleteRiskImage = async (
  imagePath
) => {
  if (
    typeof imagePath !== "string" ||
    !imagePath.trim()
  ) {
    return false;
  }

  const normalizedImagePath =
    imagePath.trim();

  /*
    External URLs ko physical disk se delete nahi karna.
  */

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

  const relativeImagePath =
    path.relative(
      riskUploadsDirectory,
      absoluteImagePath
    );

  const isOutsideRiskFolder =
    !relativeImagePath ||
    relativeImagePath.startsWith(
      ".."
    ) ||
    path.isAbsolute(
      relativeImagePath
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
    if (error?.code === "ENOENT") {
      return false;
    }

    console.error(
      "Risk Evidence image deletion failed:",
      error
    );

    return false;
  }
};

/* =========================================================
   DELETE MULTIPLE RISK IMAGES
   ========================================================= */

const deleteRiskImages = async (
  imagePaths = []
) => {
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

  const deletionResults =
    await Promise.allSettled(
      normalizedImagePaths.map(
        (imagePath) =>
          deleteRiskImage(
            imagePath
          )
      )
    );

  const deletedCount =
    deletionResults.filter(
      (result) =>
        result.status ===
          "fulfilled" &&
        result.value === true
    ).length;

  return {
    requested:
      normalizedImagePaths.length,

    deleted: deletedCount,
  };
};

/* =========================================================
   CREATE RISK

   POST /api/v1/risks
   ========================================================= */

export const createRisk = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await createRiskService({
        projectId:
          req.body.projectId,

        serialNo:
          req.body.serialNo,

        riskRegisterId:
          req.body.riskRegisterId,

        description:
          req.body.description,
      });

    return sendSuccessResponse(
      res,
      201,
      "Risk created successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET ALL RISKS

   GET /api/v1/risks
   ========================================================= */

export const getRisks = async (
  req,
  res,
  next
) => {
  try {
    const {
      projectId,
      search,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query ?? {};

    const result =
      await getRisksService({
        projectId,
        search,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      });

    return sendSuccessResponse(
      res,
      200,
      "Risks retrieved successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET PROJECT RISKS

   GET /api/v1/risks/project/:projectId
   ========================================================= */

export const getProjectRisks = async (
  req,
  res,
  next
) => {
  try {
    const {
      search,
      status,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query ?? {};

    const result =
      await getRisksService({
        projectId:
          req.params.projectId,

        search,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      });

    return sendSuccessResponse(
      res,
      200,
      "Project risks retrieved successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET SINGLE RISK

   GET /api/v1/risks/:riskId
   ========================================================= */

export const getRiskById = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getRiskByIdService(
        req.params.riskId
      );

    return sendSuccessResponse(
      res,
      200,
      "Risk retrieved successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE RISK

   PATCH /api/v1/risks/:riskId
   ========================================================= */

export const updateRisk = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateRiskService(
        req.params.riskId,
        {
          projectId:
            req.body.projectId,

          serialNo:
            req.body.serialNo,

          riskRegisterId:
            req.body.riskRegisterId,

          description:
            req.body.description,
        }
      );

    return sendSuccessResponse(
      res,
      200,
      "Risk updated successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE RISK STATUS

   PATCH /api/v1/risks/:riskId/status
   ========================================================= */

export const updateRiskStatus = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateRiskStatusService(
        req.params.riskId,
        req.body.status
      );

    const updatedStatus =
      result?.risk?.status;

    const message =
      updatedStatus === "complete"
        ? "Risk marked Complete successfully."
        : "Risk moved to In Progress successfully.";

    return sendSuccessResponse(
      res,
      200,
      message,
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   MARK RISK COMPLETE

   PATCH /api/v1/risks/:riskId/complete
   ========================================================= */

export const markRiskComplete =
  async (req, res, next) => {
    try {
      const result =
        await updateRiskStatusService(
          req.params.riskId,
          "complete"
        );

      return sendSuccessResponse(
        res,
        200,
        "Risk marked Complete successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   MARK RISK IN PROGRESS

   PATCH /api/v1/risks/:riskId/in-progress
   ========================================================= */

export const markRiskInProgress =
  async (req, res, next) => {
    try {
      const result =
        await updateRiskStatusService(
          req.params.riskId,
          "in_progress"
        );

      return sendSuccessResponse(
        res,
        200,
        "Risk moved to In Progress successfully.",
        result
      );
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE RISK

   DELETE /api/v1/risks/:riskId

   Deletes:

   - Risk record
   - Before Evidence records
   - After Evidence records
   - Related image files
   ========================================================= */

export const deleteRisk = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await deleteRiskService(
        req.params.riskId
      );

    const imagePaths =
      normalizeImagePaths(
        result?.imagePaths
      );

    const imageDeletion =
      await deleteRiskImages(
        imagePaths
      );

    const deletedEvidenceCount =
      Number.isFinite(
        Number(
          result?.deletedEvidenceCount
        )
      )
        ? Number(
            result.deletedEvidenceCount
          )
        : imagePaths.length;

    const deletedRiskId =
      result?.risk?._id?.toString?.() ||
      req.params.riskId;

    return sendSuccessResponse(
      res,
      200,
      "Risk and its Before/After Evidence deleted successfully.",
      {
        riskId: deletedRiskId,

        risk: result?.risk,

        deletedEvidenceCount,

        deletedImagePaths:
          imagePaths,

        imageFilesRequested:
          imageDeletion.requested,

        imageFilesDeleted:
          imageDeletion.deleted,
      }
    );
  } catch (error) {
    return next(error);
  }
};