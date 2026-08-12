import mongoose from "mongoose";

import Evidence from "../../models/evidences/evidence.model.js";
import Task from "../../models/task_register/task.model.js";

import {
  syncTaskStatusWithEvidence,
} from "../task_register/task.service.js";

/* =========================================================
   CONSTANTS
   ========================================================= */

const EVIDENCE_TYPES = [
  "before",
  "after",
];

const MAX_EVIDENCE_IMAGES = 10;

const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  statusCode,
  message
) => {
  const error = new Error(message);

  error.statusCode =
    statusCode;

  error.status =
    statusCode;

  return error;
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const normalizeText = (
  value
) => {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
};

const validateMongoId = (
  value,
  fieldName
) => {
  const normalizedValue =
    normalizeText(
      value
    );

  if (
    !mongoose.isValidObjectId(
      normalizedValue
    )
  ) {
    throw createServiceError(
      400,
      `${fieldName} is invalid.`
    );
  }

  return normalizedValue;
};

const normalizeEvidenceType = (
  value
) => {
  const evidenceType =
    normalizeText(
      value
    ).toLowerCase();

  if (
    !EVIDENCE_TYPES.includes(
      evidenceType
    )
  ) {
    throw createServiceError(
      400,
      "Evidence type must be before or after."
    );
  }

  return evidenceType;
};

const toPlainObject = (
  value
) => {
  if (
    value &&
    typeof value.toObject ===
      "function"
  ) {
    return value.toObject();
  }

  return value;
};

const getOptionalTaskRegisterId = (
  value
) => {
  const taskRegisterId =
    normalizeText(
      value
    ).toUpperCase();

  return (
    taskRegisterId ||
    undefined
  );
};

/* =========================================================
   IMAGE PATH VALIDATION
   ========================================================= */

const normalizeImagePath = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    throw createServiceError(
      400,
      "Evidence image path is invalid."
    );
  }

  let imagePath =
    value
      .trim()
      .replaceAll(
        "\\",
        "/"
      );

  if (!imagePath) {
    throw createServiceError(
      400,
      "Evidence image path is required."
    );
  }

  if (
    !imagePath.startsWith(
      "/"
    )
  ) {
    imagePath =
      `/${imagePath}`;
  }

  if (
    imagePath.includes(
      ".."
    )
  ) {
    throw createServiceError(
      400,
      "Evidence image path is invalid."
    );
  }

  const lowerCasePath =
    imagePath.toLowerCase();

  const hasAllowedExtension =
    ALLOWED_IMAGE_EXTENSIONS.some(
      (extension) =>
        lowerCasePath.endsWith(
          extension
        )
    );

  if (
    !hasAllowedExtension
  ) {
    throw createServiceError(
      400,
      "Only JPG, JPEG, PNG and WEBP Evidence images are allowed."
    );
  }

  return imagePath;
};

const normalizeImagePaths = (
  imagePaths
) => {
  if (
    !Array.isArray(
      imagePaths
    )
  ) {
    throw createServiceError(
      400,
      "Evidence images must be provided as an array."
    );
  }

  const normalizedPaths = [
    ...new Set(
      imagePaths.map(
        normalizeImagePath
      )
    ),
  ];

  if (
    normalizedPaths.length ===
    0
  ) {
    throw createServiceError(
      400,
      "At least one Evidence image is required."
    );
  }

  if (
    normalizedPaths.length >
    MAX_EVIDENCE_IMAGES
  ) {
    throw createServiceError(
      400,
      `Maximum ${MAX_EVIDENCE_IMAGES} Evidence images can be uploaded at one time.`
    );
  }

  return normalizedPaths;
};

/* =========================================================
   TASK HELPER
   ========================================================= */

const getTaskRecord = async (
  taskId
) => {
  const normalizedTaskId =
    validateMongoId(
      taskId,
      "Task ID"
    );

  const task =
    await Task.findById(
      normalizedTaskId
    ).lean();

  if (!task) {
    throw createServiceError(
      404,
      "Task not found."
    );
  }

  return task;
};

const buildTaskResponse = (
  task
) => {
  const taskRegisterId =
    getOptionalTaskRegisterId(
      task.taskRegisterId ||
      task.riskRegisterId
    );

  return {
    _id:
      task._id,

    projectId:
      task.projectId,

    projectCode:
      task.projectCode,

    serialNo:
      task.serialNo,

    ...(taskRegisterId
      ? {
          taskRegisterId,
        }
      : {}),

    description:
      task.description,

    status:
      task.status,

    createdAt:
      task.createdAt,

    updatedAt:
      task.updatedAt,
  };
};

/* =========================================================
   EVIDENCE SUMMARY HELPER
   ========================================================= */

const buildEvidenceResponse = (
  evidenceRecords
) => {
  const before = [];
  const after = [];

  evidenceRecords.forEach(
    (record) => {
      if (
        record.evidenceType ===
        "before"
      ) {
        before.push(
          record
        );
      }

      if (
        record.evidenceType ===
        "after"
      ) {
        after.push(
          record
        );
      }
    }
  );

  return {
    before,
    after,

    beforeCount:
      before.length,

    afterCount:
      after.length,

    canMarkComplete:
      before.length > 0 &&
      after.length > 0,
  };
};

/* =========================================================
   GET ALL EVIDENCE FOR ONE TASK
   ========================================================= */

export const getTaskEvidencesService =
  async (
    taskId
  ) => {
    const task =
      await getTaskRecord(
        taskId
      );

    const evidenceRecords =
      await Evidence.find({
        riskId:
          task._id,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    return buildEvidenceResponse(
      evidenceRecords
    );
  };

/* =========================================================
   GET EVIDENCE BY TYPE
   ========================================================= */

export const getEvidenceByTypeService =
  async (
    taskId,
    requestedEvidenceType
  ) => {
    const task =
      await getTaskRecord(
        taskId
      );

    const evidenceType =
      normalizeEvidenceType(
        requestedEvidenceType
      );

    const evidences =
      await Evidence.find({
        riskId:
          task._id,

        evidenceType,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    return {
      evidenceType,

      evidences,

      count:
        evidences.length,
    };
  };

/* =========================================================
   ADD EVIDENCE IMAGES

   Maximum limit per Task:

   10 Before images
   10 After images

   Evidence upload Task ko automatically Complete nahi karega.

   User manually Mark Complete use karega after at least:

   - one Before image
   - one After image
   ========================================================= */

export const addEvidenceImagesService =
  async ({
    taskId,

    evidenceType:
      requestedEvidenceType,

    imagePaths,
  }) => {
    const task =
      await getTaskRecord(
        taskId
      );

    const evidenceType =
      normalizeEvidenceType(
        requestedEvidenceType
      );

    const normalizedImagePaths =
      normalizeImagePaths(
        imagePaths
      );

    const allowedFolder =
      `/uploads/tasks/${evidenceType}/`;

    const invalidFolderPaths =
      normalizedImagePaths.filter(
        (imagePath) =>
          !imagePath.startsWith(
            allowedFolder
          )
      );

    if (
      invalidFolderPaths.length >
      0
    ) {
      throw createServiceError(
        400,
        `${evidenceType} Evidence images must be stored inside /uploads/tasks/${evidenceType}/`
      );
    }

    const [
      existingEvidence,
      currentEvidenceCount,
    ] =
      await Promise.all([
        Evidence.find({
          riskId:
            task._id,

          evidenceType,

          imagePath: {
            $in:
              normalizedImagePaths,
          },
        })
          .select(
            "imagePath"
          )
          .lean(),

        Evidence.countDocuments({
          riskId:
            task._id,

          evidenceType,
        }),
      ]);

    const existingImagePaths =
      new Set(
        existingEvidence.map(
          (record) =>
            record.imagePath
        )
      );

    const newImagePaths =
      normalizedImagePaths.filter(
        (imagePath) =>
          !existingImagePaths.has(
            imagePath
          )
      );

    if (
      newImagePaths.length ===
      0
    ) {
      throw createServiceError(
        409,
        "These Evidence images are already attached to this Task."
      );
    }

    if (
      currentEvidenceCount +
        newImagePaths.length >
      MAX_EVIDENCE_IMAGES
    ) {
      const remainingSlots =
        Math.max(
          MAX_EVIDENCE_IMAGES -
            currentEvidenceCount,
          0
        );

      throw createServiceError(
        400,
        `Maximum ${MAX_EVIDENCE_IMAGES} ${evidenceType} Evidence images are allowed per Task. ${remainingSlots} upload slot${remainingSlots === 1 ? "" : "s"} remaining.`
      );
    }

    const taskRegisterId =
      getOptionalTaskRegisterId(
        task.taskRegisterId
      );

    const evidenceDocuments =
      newImagePaths.map(
        (imagePath) => ({
          projectId:
            task.projectId,

          projectCode:
            task.projectCode,

          riskId:
            task._id,

          ...(taskRegisterId
            ? {
                riskRegisterId:
                  taskRegisterId,
              }
            : {}),

          evidenceType,

          imagePath,
        })
      );

    let createdEvidence = [];

    try {
      const createdDocuments =
        await Evidence.insertMany(
          evidenceDocuments,
          {
            ordered: true,
          }
        );

      createdEvidence =
        createdDocuments.map(
          toPlainObject
        );
    } catch (error) {
      /*
        insertMany partial success de sakta hai.

        Current upload ke new image records rollback honge.
        Controller related physical files cleanup karega.
      */

      await Evidence.deleteMany({
        riskId:
          task._id,

        evidenceType,

        imagePath: {
          $in:
            newImagePaths,
        },
      });

      if (
        error?.code ===
        11000
      ) {
        throw createServiceError(
          409,
          "One or more Evidence images already exist."
        );
      }

      throw error;
    }

    const evidence =
      await getTaskEvidencesService(
        task._id.toString()
      );

    return {
      task:
        buildTaskResponse(
          task
        ),

      uploadedEvidence:
        createdEvidence,

      evidence,
    };
  };

/* =========================================================
   ADD BEFORE EVIDENCE
   ========================================================= */

export const addBeforeEvidenceService =
  async (
    taskId,
    imagePaths
  ) => {
    return addEvidenceImagesService({
      taskId,

      evidenceType:
        "before",

      imagePaths,
    });
  };

/* =========================================================
   ADD AFTER EVIDENCE
   ========================================================= */

export const addAfterEvidenceService =
  async (
    taskId,
    imagePaths
  ) => {
    return addEvidenceImagesService({
      taskId,

      evidenceType:
        "after",

      imagePaths,
    });
  };

/* =========================================================
   GET SINGLE EVIDENCE
   ========================================================= */

export const getEvidenceByIdService =
  async (
    evidenceId
  ) => {
    const normalizedEvidenceId =
      validateMongoId(
        evidenceId,
        "Evidence ID"
      );

    const evidence =
      await Evidence.findById(
        normalizedEvidenceId
      ).lean();

    if (!evidence) {
      throw createServiceError(
        404,
        "Evidence image was not found."
      );
    }

    return evidence;
  };

/* =========================================================
   DELETE SINGLE EVIDENCE

   Database record is deleted here.

   Physical image file is deleted by controller.

   Required Evidence removal from a completed Task moves the
   Task back to In Progress.
   ========================================================= */

export const deleteEvidenceService =
  async (
    taskId,
    evidenceId
  ) => {
    const task =
      await getTaskRecord(
        taskId
      );

    const normalizedEvidenceId =
      validateMongoId(
        evidenceId,
        "Evidence ID"
      );

    const evidence =
      await Evidence.findOne({
        _id:
          normalizedEvidenceId,

        riskId:
          task._id,
      });

    if (!evidence) {
      throw createServiceError(
        404,
        "Evidence image was not found for this Task."
      );
    }

    const taskRegisterId =
      getOptionalTaskRegisterId(
        evidence.taskRegisterId ||
        evidence.riskRegisterId
      );

    const deletedEvidence = {
      _id:
        evidence._id,

      projectId:
        evidence.projectId,

      projectCode:
        evidence.projectCode,

      taskId:
        evidence.taskId ||
        evidence.riskId,

      ...(taskRegisterId
        ? {
            taskRegisterId,
          }
        : {}),

      evidenceType:
        evidence.evidenceType,

      imagePath:
        evidence.imagePath,

      createdAt:
        evidence.createdAt,

      updatedAt:
        evidence.updatedAt,
    };

    await evidence.deleteOne();

    const syncedTask =
      await syncTaskStatusWithEvidence(
        task._id.toString()
      );

    return {
      evidence:
        deletedEvidence,

      imagePath:
        deletedEvidence.imagePath,

      task:
        syncedTask.task ||
        syncedTask.risk,

      evidenceSummary:
        syncedTask.evidenceSummary ||
        syncedTask.evidence,
    };
  };

/* =========================================================
   DELETE ALL EVIDENCE OF ONE TYPE
   ========================================================= */

export const deleteEvidenceTypeService =
  async (
    taskId,
    requestedEvidenceType
  ) => {
    const task =
      await getTaskRecord(
        taskId
      );

    const evidenceType =
      normalizeEvidenceType(
        requestedEvidenceType
      );

    const evidenceRecords =
      await Evidence.find({
        riskId:
          task._id,

        evidenceType,
      })
        .select(
          "imagePath"
        )
        .lean();

    if (
      evidenceRecords.length ===
      0
    ) {
      throw createServiceError(
        404,
        `No ${evidenceType} Evidence images were found.`
      );
    }

    const imagePaths = [
      ...new Set(
        evidenceRecords
          .map(
            (record) =>
              record.imagePath
          )
          .filter(
            (imagePath) =>
              typeof imagePath ===
                "string" &&
              imagePath.trim()
          )
      ),
    ];

    const deleteResult =
      await Evidence.deleteMany({
        riskId:
          task._id,

        evidenceType,
      });

    const syncedTask =
      await syncTaskStatusWithEvidence(
        task._id.toString()
      );

    return {
      evidenceType,

      deletedRecords:
        deleteResult.deletedCount ??
        0,

      imagePaths,

      task:
        syncedTask.task ||
        syncedTask.risk,

      evidenceSummary:
        syncedTask.evidenceSummary ||
        syncedTask.evidence,
    };
  };

