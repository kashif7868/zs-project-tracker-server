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
  getTaskEvidencesService,
} from "./evidence.service.js";

/* =========================================================
   DIRECTORY PATHS

   Current file:

   backend/src/modules/evidences/evidence.controller.js

   Public directory:

   backend/public
   ========================================================= */

const currentFilePath =
  fileURLToPath(
    import.meta.url
  );

const currentDirectory =
  path.dirname(
    currentFilePath
  );

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

const taskUploadDirectory =
  path.resolve(
    publicDirectory,
    "uploads",
    "tasks"
  );

const legacyRiskUploadDirectory =
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
  return res.status(
    statusCode
  ).json({
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
  const error =
    new Error(
      message
    );

  error.statusCode =
    statusCode;

  error.status =
    statusCode;

  return error;
};

/* =========================================================
   REQUEST FILE HELPER
   ========================================================= */

const getRequestFiles = (
  req
) => {
  if (
    Array.isArray(
      req.files
    )
  ) {
    return req.files;
  }

  if (req.file) {
    return [
      req.file,
    ];
  }

  if (
    req.files &&
    typeof req.files ===
      "object"
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
  if (
    !Array.isArray(
      imagePaths
    )
  ) {
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
        .map(
          (imagePath) =>
            imagePath
              .trim()
              .replaceAll(
                "\\",
                "/"
              )
        )
    ),
  ];
};

/* =========================================================
   CONVERT PHYSICAL PATH TO PUBLIC PATH

   New physical path:

   backend/public/uploads/tasks/before/image.jpg

   New database path:

   /uploads/tasks/before/image.jpg
   ========================================================= */

const convertToPublicImagePath = (
  filePath
) => {
  if (
    typeof filePath !==
      "string" ||
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

  if (
    isOutsidePublicDirectory
  ) {
    return "";
  }

  return `/${relativeFilePath.replaceAll(
    "\\",
    "/"
  )}`;
};

/* =========================================================
   GET ALL UPLOADED PUBLIC IMAGE PATHS

   Request ke tamam uploaded files ko public paths mein
   convert karta hai.

   Failed request cleanup mein use hoga.
   ========================================================= */

const getAllUploadedImagePaths = (
  req
) => {
  const files =
    getRequestFiles(
      req
    );

  const imagePaths =
    files
      .map(
        (file) =>
          convertToPublicImagePath(
            file?.path
          )
      )
      .filter(
        Boolean
      );

  return normalizeImagePaths(
    imagePaths
  );
};

/* =========================================================
   GET VALID UPLOADED IMAGE PATHS BY EVIDENCE TYPE
   ========================================================= */

const getUploadedImagePaths = (
  req,
  evidenceType
) => {
  /*
    IMPORTANT:

    New uploads are accepted ONLY from the canonical Task
    Evidence directories.

    Legacy /uploads/risks paths remain supported elsewhere
    only for reading/deleting old database records.
  */

  const allowedFolder =
    `/uploads/tasks/${evidenceType}/`;

  const imagePaths =
    getAllUploadedImagePaths(
      req
    ).filter(
      (imagePath) =>
        imagePath.startsWith(
          allowedFolder
        )
    );

  return normalizeImagePaths(
    imagePaths
  );
};

/* =========================================================
   ASSERT CANONICAL TASK EVIDENCE PATHS

   Prevents any new DB Evidence record from being created with
   an old /uploads/risks path.
   ========================================================= */

const assertCanonicalTaskEvidencePaths = (
  imagePaths,
  evidenceType
) => {
  const requiredPrefix =
    `/uploads/tasks/${evidenceType}/`;

  const invalidPath =
    imagePaths.find(
      (imagePath) =>
        !imagePath.startsWith(
          requiredPrefix
        )
    );

  if (invalidPath) {
    throw createHttpError(
      500,
      `Evidence upload path is invalid. Expected ${requiredPrefix}`
    );
  }
};

/* =========================================================
   DELETE PHYSICAL IMAGE

   Sirf backend/public/uploads/tasks ya legacy uploads/risks
   ke andar wali local files physically delete ho sakti hain.
   ========================================================= */

const deletePhysicalImage =
  async (
    imagePath
  ) => {
    if (
      typeof imagePath !==
        "string" ||
      !imagePath.trim()
    ) {
      return false;
    }

    const normalizedImagePath =
      imagePath.trim();

    /*
      External URLs local files nahi hain.
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
        .replaceAll(
          "\\",
          "/"
        )
        .replace(
          /^\/+/,
          ""
        );

    const absoluteImagePath =
      path.resolve(
        publicDirectory,
        cleanImagePath
      );

    const allowedUploadDirectories = [
      taskUploadDirectory,
      legacyRiskUploadDirectory,
    ];

    const isInsideAllowedFolder =
      allowedUploadDirectories.some(
        (uploadDirectory) => {
          const relativePath =
            path.relative(
              uploadDirectory,
              absoluteImagePath
            );

          return (
            Boolean(relativePath) &&
            !relativePath.startsWith(
              ".."
            ) &&
            !path.isAbsolute(
              relativePath
            )
          );
        }
      );

    if (
      !isInsideAllowedFolder
    ) {
      return false;
    }

    try {
      await fs.unlink(
        absoluteImagePath
      );

      return true;
    } catch (error) {
      if (
        error?.code ===
        "ENOENT"
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
  async (
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
          result.value ===
            true
      ).length;

    return {
      requested:
        normalizedImagePaths.length,

      deleted,
    };
  };

/* =========================================================
   CLEAN FAILED UPLOAD

   Database validation ya service operation fail hone par
   current request ki newly uploaded physical image files
   delete hongi.
   ========================================================= */

const cleanupFailedUpload =
  async (
    imagePaths
  ) => {
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
   GET ALL EVIDENCE FOR ONE TASK

   GET /api/v1/evidences/task/:taskId
   ========================================================= */

export const getTaskEvidences =
  async (
    req,
    res,
    next
  ) => {
    try {
      const evidence =
        await getTaskEvidencesService(
          req.params.taskId
        );

      return sendSuccessResponse(
        res,
        200,
        "Task Evidence retrieved successfully.",
        {
          evidence,
        }
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   GET BEFORE EVIDENCE

   GET /api/v1/evidences/task/:taskId/before
   ========================================================= */

export const getBeforeEvidences =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getEvidenceByTypeService(
          req.params.taskId,
          "before"
        );

      return sendSuccessResponse(
        res,
        200,
        "Before Evidence retrieved successfully.",
        result
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   GET AFTER EVIDENCE

   GET /api/v1/evidences/task/:taskId/after
   ========================================================= */

export const getAfterEvidences =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getEvidenceByTypeService(
          req.params.taskId,
          "after"
        );

      return sendSuccessResponse(
        res,
        200,
        "After Evidence retrieved successfully.",
        result
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   GET SINGLE EVIDENCE

   GET /api/v1/evidences/:evidenceId
   ========================================================= */

export const getEvidenceById =
  async (
    req,
    res,
    next
  ) => {
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
      return next(
        error
      );
    }
  };

/* =========================================================
   ADD BEFORE EVIDENCE

   POST /api/v1/evidences/task/:taskId/before

   Multipart field:

   images

   Maximum:

   10 Before images per Task
   ========================================================= */

export const addBeforeEvidence =
  async (
    req,
    res,
    next
  ) => {
    const allUploadedImagePaths =
      getAllUploadedImagePaths(
        req
      );

    const imagePaths =
      getUploadedImagePaths(
        req,
        "before"
      );

    try {
      if (
        imagePaths.length ===
        0
      ) {
        throw createHttpError(
          400,
          "At least one Before Evidence image is required."
        );
      }

      assertCanonicalTaskEvidencePaths(
        imagePaths,
        "before"
      );

      const result =
        await addBeforeEvidenceService(
          req.params.taskId,
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
        allUploadedImagePaths
      );

      return next(
        error
      );
    }
  };

/* =========================================================
   ADD AFTER EVIDENCE

   POST /api/v1/evidences/task/:taskId/after

   Multipart field:

   images

   Maximum:

   10 After images per Task
   ========================================================= */

export const addAfterEvidence =
  async (
    req,
    res,
    next
  ) => {
    const allUploadedImagePaths =
      getAllUploadedImagePaths(
        req
      );

    const imagePaths =
      getUploadedImagePaths(
        req,
        "after"
      );

    try {
      if (
        imagePaths.length ===
        0
      ) {
        throw createHttpError(
          400,
          "At least one After Evidence image is required."
        );
      }

      assertCanonicalTaskEvidencePaths(
        imagePaths,
        "after"
      );

      const result =
        await addAfterEvidenceService(
          req.params.taskId,
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
        allUploadedImagePaths
      );

      return next(
        error
      );
    }
  };

/* =========================================================
   DELETE SINGLE EVIDENCE

   DELETE /api/v1/evidences/task/:taskId/:evidenceId

   Required Evidence remove hone par completed Task service
   ke through automatically In Progress mein revert ho sakta hai.
   ========================================================= */

export const deleteEvidence =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await deleteEvidenceService(
          req.params.taskId,
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

          task:
            result.task,

          evidenceSummary:
            result.evidenceSummary,

          imageFileDeleted,
        }
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   DELETE ALL BEFORE EVIDENCE

   DELETE /api/v1/evidences/task/:taskId/before
   ========================================================= */

export const deleteBeforeEvidences =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await deleteEvidenceTypeService(
          req.params.taskId,
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

          task:
            result.task,

          evidenceSummary:
            result.evidenceSummary,
        }
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

/* =========================================================
   DELETE ALL AFTER EVIDENCE

   DELETE /api/v1/evidences/task/:taskId/after
   ========================================================= */

export const deleteAfterEvidences =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await deleteEvidenceTypeService(
          req.params.taskId,
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

          task:
            result.task,

          evidenceSummary:
            result.evidenceSummary,
        }
      );
    } catch (error) {
      return next(
        error
      );
    }
  };

