import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createTaskService,
  deleteTaskService,
  getTaskByIdService,
  getTasksService,
  updateTaskService,
  updateTaskStatusService,
} from "./task.service.js";

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
   backend/src/modules/tasks/task.controller.js

   IMPORTANT:
   Existing evidence files may still physically live in:
   public/uploads/risks

   We preserve that directory during migration so old evidence
   images do not break.
   ========================================================= */

const currentFilePath =
  fileURLToPath(import.meta.url);

const currentDirectory =
  path.dirname(currentFilePath);

const publicDirectory =
  path.resolve(
    currentDirectory,
    "../../../public"
  );

const legacyTaskUploadsDirectory =
  path.resolve(
    publicDirectory,
    "uploads",
    "risks"
  );

const taskUploadsDirectory =
  path.resolve(
    publicDirectory,
    "uploads",
    "tasks"
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
   CHECK SAFE UPLOAD DIRECTORY

   During migration both directories are accepted:

   public/uploads/tasks
   public/uploads/risks

   New uploads will later move fully to /tasks.
   ========================================================= */

const isInsideAllowedUploadDirectory = (
  absoluteImagePath
) => {
  const allowedDirectories = [
    taskUploadsDirectory,
    legacyTaskUploadsDirectory,
  ];

  return allowedDirectories.some(
    (directory) => {
      const relativePath =
        path.relative(
          directory,
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
};

/* =========================================================
   DELETE ONE TASK EVIDENCE IMAGE

   External URLs are not deleted locally.
   ========================================================= */

const deleteTaskImage = async (
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
      .split("\\")
      .join("/")
      .replace(/^\/+/, "");

  const absoluteImagePath =
    path.resolve(
      publicDirectory,
      cleanImagePath
    );

  if (
    !isInsideAllowedUploadDirectory(
      absoluteImagePath
    )
  ) {
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
      "Task evidence image deletion failed:",
      error
    );

    return false;
  }
};

/* =========================================================
   DELETE MULTIPLE TASK IMAGES
   ========================================================= */

const deleteTaskImages = async (
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
          deleteTaskImage(
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

    deleted:
      deletedCount,
  };
};

/* =========================================================
   CREATE TASK

   POST /api/v1/tasks

   Current input:
   projectId
   description
   taskRegisterId optional

   Backend:
   serialNo automatic
   projectCode automatic
   status = in_progress
   timestamps automatic
   ========================================================= */

export const createTask = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await createTaskService(
        req.body
      );

    return sendSuccessResponse(
      res,
      201,
      "Task created successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET ALL TASKS

   GET /api/v1/tasks
   ========================================================= */

export const getTasks = async (
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
      await getTasksService({
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
      "Tasks retrieved successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET PROJECT TASKS

   GET /api/v1/tasks/project/:projectId
   ========================================================= */

export const getProjectTasks = async (
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
      await getTasksService({
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
      "Project tasks retrieved successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   GET SINGLE TASK

   GET /api/v1/tasks/:taskId
   ========================================================= */

export const getTaskById = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getTaskByIdService(
        req.params.taskId
      );

    return sendSuccessResponse(
      res,
      200,
      "Task retrieved successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE TASK

   PATCH /api/v1/tasks/:taskId

   Editable:
   description
   taskRegisterId optional

   Protected:
   projectId
   projectCode
   serialNo
   status
   ========================================================= */

export const updateTask = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateTaskService(
        req.params.taskId,
        req.body
      );

    return sendSuccessResponse(
      res,
      200,
      "Task updated successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   UPDATE TASK STATUS

   PATCH /api/v1/tasks/:taskId/status

   Supported:
   in_progress
   complete
   ========================================================= */

export const updateTaskStatus = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateTaskStatusService(
        req.params.taskId,
        req.body.status
      );

    const updatedStatus =
      result?.task?.status;

    const statusMessages = {
      in_progress:
        "Task moved to In Progress successfully.",

      complete:
        "Task marked Complete successfully.",
    };

    return sendSuccessResponse(
      res,
      200,
      statusMessages[
        updatedStatus
      ] ||
        "Task status updated successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   MARK TASK COMPLETE

   PATCH /api/v1/tasks/:taskId/complete

   Requires:
   >= 1 Before Evidence
   >= 1 After Evidence
   ========================================================= */

export const markTaskComplete = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateTaskStatusService(
        req.params.taskId,
        "complete"
      );

    return sendSuccessResponse(
      res,
      200,
      "Task marked Complete successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   MOVE TASK TO IN PROGRESS

   PATCH /api/v1/tasks/:taskId/in-progress
   ========================================================= */

export const markTaskInProgress = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateTaskStatusService(
        req.params.taskId,
        "in_progress"
      );

    return sendSuccessResponse(
      res,
      200,
      "Task moved to In Progress successfully.",
      result
    );
  } catch (error) {
    return next(error);
  }
};

/* =========================================================
   DELETE TASK

   DELETE /api/v1/tasks/:taskId

   Deletes:
   Task database record
   Before Evidence records
   After Evidence records
   Related local image files

   Existing /uploads/risks files remain supported during the
   migration.
   ========================================================= */

export const deleteTask = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await deleteTaskService(
        req.params.taskId
      );

    const imagePaths =
      normalizeImagePaths(
        result?.imagePaths
      );

    const imageDeletion =
      await deleteTaskImages(
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

    const deletedTaskId =
      result?.task?._id
        ?.toString?.() ||
      req.params.taskId;

    return sendSuccessResponse(
      res,
      200,
      "Task and its Before/After Evidence deleted successfully.",
      {
        taskId:
          deletedTaskId,

        task:
          result?.task,

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

/* =========================================================
   TEMPORARY LEGACY CONTROLLER ALIASES

   These keep old risk.routes.js imports working while routes,
   Evidence and Dashboard are migrated.

   Final cleanup mein remove kar denge.
   ========================================================= */

export const createRisk =
  createTask;

export const getRisks =
  getTasks;

export const getProjectRisks =
  getProjectTasks;

export const getRiskById = (
  req,
  res,
  next
) => {
  if (
    req.params.taskId ===
      undefined &&
    req.params.riskId !==
      undefined
  ) {
    req.params.taskId =
      req.params.riskId;
  }

  return getTaskById(
    req,
    res,
    next
  );
};

export const updateRisk = (
  req,
  res,
  next
) => {
  if (
    req.params.taskId ===
      undefined &&
    req.params.riskId !==
      undefined
  ) {
    req.params.taskId =
      req.params.riskId;
  }

  return updateTask(
    req,
    res,
    next
  );
};

export const updateRiskStatus = (
  req,
  res,
  next
) => {
  if (
    req.params.taskId ===
      undefined &&
    req.params.riskId !==
      undefined
  ) {
    req.params.taskId =
      req.params.riskId;
  }

  return updateTaskStatus(
    req,
    res,
    next
  );
};

export const markRiskComplete = (
  req,
  res,
  next
) => {
  if (
    req.params.taskId ===
      undefined &&
    req.params.riskId !==
      undefined
  ) {
    req.params.taskId =
      req.params.riskId;
  }

  return markTaskComplete(
    req,
    res,
    next
  );
};

export const markRiskInProgress = (
  req,
  res,
  next
) => {
  if (
    req.params.taskId ===
      undefined &&
    req.params.riskId !==
      undefined
  ) {
    req.params.taskId =
      req.params.riskId;
  }

  return markTaskInProgress(
    req,
    res,
    next
  );
};

export const deleteRisk = (
  req,
  res,
  next
) => {
  if (
    req.params.taskId ===
      undefined &&
    req.params.riskId !==
      undefined
  ) {
    req.params.taskId =
      req.params.riskId;
  }

  return deleteTask(
    req,
    res,
    next
  );
};
