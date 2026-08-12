import mongoose from "mongoose";

/* =========================================================
   CONSTANTS
   ========================================================= */

const ALLOWED_EVIDENCE_TYPES = [
  "before",
  "after",
];

/* =========================================================
   ERROR RESPONSE
   ========================================================= */

const sendValidationError = (
  res,
  message,
  errors = []
) => {
  return res
    .status(400)
    .json({
      success: false,
      message,
      errors,
    });
};

/* =========================================================
   HELPERS
   ========================================================= */

const normalizeText = (
  value
) =>
  typeof value === "string"
    ? value.trim()
    : "";

const isValidObjectId = (
  value
) =>
  typeof value === "string" &&
  mongoose.isValidObjectId(
    value.trim()
  );

/* =========================================================
   TASK ID PARAM

   Canonical routes:

   /api/v1/evidences/task/:taskId
   /api/v1/evidences/task/:taskId/before
   /api/v1/evidences/task/:taskId/after
   /api/v1/evidences/task/:taskId/:evidenceId
   ========================================================= */

export const validateTaskIdParam = (
  req,
  res,
  next
) => {
  const taskId =
    normalizeText(
      req.params.taskId
    );

  if (
    !isValidObjectId(
      taskId
    )
  ) {
    return sendValidationError(
      res,
      "Task ID is invalid.",
      [
        {
          field: "taskId",

          message:
            "A valid MongoDB Task ID is required.",
        },
      ]
    );
  }

  req.params.taskId =
    taskId;

  return next();
};

/* =========================================================
   EVIDENCE ID PARAM
   ========================================================= */

export const validateEvidenceIdParam = (
  req,
  res,
  next
) => {
  const evidenceId =
    normalizeText(
      req.params.evidenceId
    );

  if (
    !isValidObjectId(
      evidenceId
    )
  ) {
    return sendValidationError(
      res,
      "Evidence ID is invalid.",
      [
        {
          field:
            "evidenceId",

          message:
            "A valid MongoDB Evidence ID is required.",
        },
      ]
    );
  }

  req.params.evidenceId =
    evidenceId;

  return next();
};

/* =========================================================
   TASK + EVIDENCE ID PARAMS
   ========================================================= */

export const validateTaskEvidenceParams = (
  req,
  res,
  next
) => {
  const taskId =
    normalizeText(
      req.params.taskId
    );

  const evidenceId =
    normalizeText(
      req.params.evidenceId
    );

  const errors = [];

  if (
    !isValidObjectId(
      taskId
    )
  ) {
    errors.push({
      field:
        "taskId",

      message:
        "A valid MongoDB Task ID is required.",
    });
  }

  if (
    !isValidObjectId(
      evidenceId
    )
  ) {
    errors.push({
      field:
        "evidenceId",

      message:
        "A valid MongoDB Evidence ID is required.",
    });
  }

  if (errors.length) {
    return sendValidationError(
      res,
      "Evidence request validation failed.",
      errors
    );
  }

  req.params.taskId =
    taskId;

  req.params.evidenceId =
    evidenceId;

  return next();
};

/* =========================================================
   EVIDENCE TYPE PARAM

   Optional reusable validator.
   ========================================================= */

export const validateEvidenceTypeParam = (
  req,
  res,
  next
) => {
  const evidenceType =
    normalizeText(
      req.params.evidenceType
    ).toLowerCase();

  if (
    !ALLOWED_EVIDENCE_TYPES.includes(
      evidenceType
    )
  ) {
    return sendValidationError(
      res,
      "Evidence type is invalid.",
      [
        {
          field:
            "evidenceType",

          message:
            "Evidence type must be before or after.",
        },
      ]
    );
  }

  req.params.evidenceType =
    evidenceType;

  return next();
};

/* =========================================================
   UPLOAD VALIDATION

   Multer runs before this middleware.

   Multipart field:
   images

   New uploads must come through canonical Task routes and
   Multer stores them only in:

   /uploads/tasks/before/
   /uploads/tasks/after/
   ========================================================= */

export const validateEvidenceUpload = (
  req,
  res,
  next
) => {
  let files = [];

  if (
    Array.isArray(
      req.files
    )
  ) {
    files =
      req.files;
  } else if (
    req.file
  ) {
    files = [
      req.file,
    ];
  } else if (
    req.files &&
    typeof req.files ===
      "object"
  ) {
    files =
      Object.values(
        req.files
      ).flat();
  }

  if (
    files.length === 0
  ) {
    return sendValidationError(
      res,
      "At least one Evidence image is required.",
      [
        {
          field:
            "images",

          message:
            "Upload at least one Evidence image using the images field.",
        },
      ]
    );
  }

  const taskId =
    normalizeText(
      req.params.taskId
    );

  if (
    !isValidObjectId(
      taskId
    )
  ) {
    return sendValidationError(
      res,
      "Task ID is invalid.",
      [
        {
          field:
            "taskId",

          message:
            "Evidence upload requires a valid Task ID.",
        },
      ]
    );
  }

  return next();
};

/* =========================================================
   EMPTY BODY VALIDATION
   ========================================================= */

export const validateEmptyBody = (
  req,
  res,
  next
) => {
  const body =
    req.body;

  if (
    body &&
    typeof body ===
      "object" &&
    !Array.isArray(
      body
    ) &&
    Object.keys(
      body
    ).length > 0
  ) {
    return sendValidationError(
      res,
      "Request body is not allowed for this operation."
    );
  }

  return next();
};
