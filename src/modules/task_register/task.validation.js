import mongoose from "mongoose";

/* =========================================================
   CONSTANTS
   ========================================================= */

const ALLOWED_TASK_STATUSES = [
  "in_progress",
  "complete",
];

const ALLOWED_SORT_FIELDS = [
  "serialNo",
  "taskRegisterId",
  "riskRegisterId",
  "projectCode",
  "description",
  "status",
  "createdAt",
  "updatedAt",
];

const ALLOWED_SORT_ORDERS = [
  "asc",
  "desc",
];

/* =========================================================
   ERROR RESPONSE
   ========================================================= */

const sendValidationError = (
  res,
  message,
  errors = []
) => {
  return res.status(400).json({
    success: false,
    message,
    errors,
  });
};

/* =========================================================
   GENERAL HELPERS
   ========================================================= */

const isPlainObject = (value) =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);

const isValidObjectId = (value) =>
  typeof value === "string" &&
  mongoose.isValidObjectId(
    value.trim()
  );

const normalizeText = (value) =>
  typeof value === "string"
    ? value.trim()
    : "";

const hasOwnField = (
  object,
  field
) =>
  Object.prototype.hasOwnProperty.call(
    object,
    field
  );

const getInvalidFields = (
  body,
  allowedFields
) =>
  Object.keys(body).filter(
    (field) =>
      !allowedFields.includes(
        field
      )
  );

/* =========================================================
   TEXT VALIDATION
   ========================================================= */

const validateRequiredText = ({
  value,
  field,
  label,
  minLength,
  maxLength,
}) => {
  const errors = [];

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    errors.push({
      field,
      message:
        `${label} is required.`,
    });

    return errors;
  }

  const normalized =
    value.trim();

  if (
    normalized.length <
    minLength
  ) {
    errors.push({
      field,
      message:
        `${label} must contain at least ${minLength} characters.`,
    });
  }

  if (
    normalized.length >
    maxLength
  ) {
    errors.push({
      field,
      message:
        `${label} cannot exceed ${maxLength} characters.`,
    });
  }

  return errors;
};

const validateOptionalText = ({
  value,
  field,
  label,
  maxLength,
  allowNull = false,
}) => {
  const errors = [];

  if (value === undefined) {
    return errors;
  }

  if (
    allowNull &&
    value === null
  ) {
    return errors;
  }

  if (
    typeof value !== "string"
  ) {
    errors.push({
      field,
      message:
        `${label} must be a string.`,
    });

    return errors;
  }

  if (
    value.trim().length >
    maxLength
  ) {
    errors.push({
      field,
      message:
        `${label} cannot exceed ${maxLength} characters.`,
    });
  }

  return errors;
};

/* =========================================================
   EXPRESS 5 QUERY REPLACEMENT
   ========================================================= */

const setValidatedQuery = (
  req,
  normalizedQuery
) => {
  Object.defineProperty(
    req,
    "query",
    {
      value: Object.freeze({
        ...normalizedQuery,
      }),
      writable: false,
      enumerable: true,
      configurable: true,
    }
  );
};

/* =========================================================
   TASK ID PARAM
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
   PROJECT ID PARAM
   ========================================================= */

export const validateProjectIdParam = (
  req,
  res,
  next
) => {
  const projectId =
    normalizeText(
      req.params.projectId
    );

  if (
    !isValidObjectId(
      projectId
    )
  ) {
    return sendValidationError(
      res,
      "Project ID is invalid.",
      [
        {
          field: "projectId",
          message:
            "A valid MongoDB Project ID is required.",
        },
      ]
    );
  }

  req.params.projectId =
    projectId;

  return next();
};

/* =========================================================
   CREATE TASK

   Current Task Register input:

   projectId
   description
   taskRegisterId optional

   Legacy riskRegisterId temporarily accepted.

   Backend automatically handles:
   serialNo
   projectCode
   status = in_progress
   createdAt
   updatedAt
   ========================================================= */

export const validateCreateTask = (
  req,
  res,
  next
) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(
      res,
      "A valid request body is required."
    );
  }

  const allowedFields = [
    "projectId",
    "taskRegisterId",
    "riskRegisterId",
    "description",
  ];

  const invalidFields =
    getInvalidFields(
      req.body,
      allowedFields
    );

  if (invalidFields.length) {
    return sendValidationError(
      res,
      "Request contains invalid fields.",
      invalidFields.map(
        (field) => ({
          field,
          message:
            field === "serialNo"
              ? "Serial number is generated automatically and cannot be supplied."
              : field === "status"
                ? "New tasks automatically start with in_progress status."
                : `${field} is not allowed while creating a task.`,
        })
      )
    );
  }

  const errors = [];

  const projectId =
    normalizeText(
      req.body.projectId
    );

  if (
    !isValidObjectId(
      projectId
    )
  ) {
    errors.push({
      field: "projectId",
      message:
        "A valid Project ID is required.",
    });
  }

  errors.push(
    ...validateRequiredText({
      value:
        req.body.description,
      field: "description",
      label:
        "Task description",
      minLength: 3,
      maxLength: 3000,
    })
  );

  const taskRegisterSource =
    hasOwnField(
      req.body,
      "taskRegisterId"
    )
      ? req.body.taskRegisterId
      : req.body.riskRegisterId;

  errors.push(
    ...validateOptionalText({
      value:
        taskRegisterSource,
      field:
        "taskRegisterId",
      label:
        "Task Register ID",
      maxLength: 100,
      allowNull: true,
    })
  );

  if (errors.length) {
    return sendValidationError(
      res,
      "Task validation failed.",
      errors
    );
  }

  const normalizedBody = {
    projectId,
    description:
      normalizeText(
        req.body.description
      ),
  };

  const taskRegisterId =
    normalizeText(
      taskRegisterSource
    );

  if (taskRegisterId) {
    normalizedBody.taskRegisterId =
      taskRegisterId.toUpperCase();
  }

  req.body =
    normalizedBody;

  return next();
};

/* =========================================================
   UPDATE TASK

   Editable:
   description
   taskRegisterId optional

   Protected:
   projectId
   projectCode
   serialNo
   status
   ========================================================= */

export const validateUpdateTask = (
  req,
  res,
  next
) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(
      res,
      "A valid request body is required."
    );
  }

  const allowedFields = [
    "taskRegisterId",
    "riskRegisterId",
    "description",
  ];

  const receivedFields =
    Object.keys(req.body);

  if (!receivedFields.length) {
    return sendValidationError(
      res,
      "At least one task field is required."
    );
  }

  const invalidFields =
    getInvalidFields(
      req.body,
      allowedFields
    );

  if (invalidFields.length) {
    return sendValidationError(
      res,
      "Request contains invalid fields.",
      invalidFields.map(
        (field) => ({
          field,
          message:
            field === "serialNo"
              ? "Serial number is generated automatically and cannot be updated."
              : field === "projectId" ||
                  field === "projectCode"
                ? "A task cannot be moved to another project."
                : field === "status"
                  ? "Use the dedicated task status endpoint to update status."
                  : `${field} is not allowed while updating a task.`,
        })
      )
    );
  }

  const errors = [];

  if (
    hasOwnField(
      req.body,
      "description"
    )
  ) {
    errors.push(
      ...validateRequiredText({
        value:
          req.body.description,
        field:
          "description",
        label:
          "Task description",
        minLength: 3,
        maxLength: 3000,
      })
    );
  }

  const taskRegisterFieldProvided =
    hasOwnField(
      req.body,
      "taskRegisterId"
    ) ||
    hasOwnField(
      req.body,
      "riskRegisterId"
    );

  const taskRegisterSource =
    hasOwnField(
      req.body,
      "taskRegisterId"
    )
      ? req.body.taskRegisterId
      : req.body.riskRegisterId;

  if (taskRegisterFieldProvided) {
    errors.push(
      ...validateOptionalText({
        value:
          taskRegisterSource,
        field:
          "taskRegisterId",
        label:
          "Task Register ID",
        maxLength: 100,
        allowNull: true,
      })
    );
  }

  if (errors.length) {
    return sendValidationError(
      res,
      "Task update validation failed.",
      errors
    );
  }

  const normalizedBody = {};

  if (
    hasOwnField(
      req.body,
      "description"
    )
  ) {
    normalizedBody.description =
      normalizeText(
        req.body.description
      );
  }

  if (taskRegisterFieldProvided) {
    const value =
      normalizeText(
        taskRegisterSource
      );

    normalizedBody.taskRegisterId =
      value
        ? value.toUpperCase()
        : null;
  }

  req.body =
    normalizedBody;

  return next();
};

/* =========================================================
   TASK STATUS UPDATE

   Only:
   in_progress
   complete
   ========================================================= */

export const validateTaskStatusUpdate = (
  req,
  res,
  next
) => {
  if (!isPlainObject(req.body)) {
    return sendValidationError(
      res,
      "A valid request body is required."
    );
  }

  const receivedFields =
    Object.keys(
      req.body
    );

  if (
    receivedFields.length !== 1 ||
    receivedFields[0] !==
      "status"
  ) {
    return sendValidationError(
      res,
      "Only the status field is allowed.",
      [
        {
          field: "status",
          message:
            "Request body must contain only status.",
        },
      ]
    );
  }

  const status =
    normalizeText(
      req.body.status
    ).toLowerCase();

  if (
    !ALLOWED_TASK_STATUSES.includes(
      status
    )
  ) {
    return sendValidationError(
      res,
      "Task status is invalid.",
      [
        {
          field: "status",
          message:
            "Status must be in_progress or complete.",
        },
      ]
    );
  }

  req.body = {
    status,
  };

  return next();
};

/* =========================================================
   TASK LIST QUERY

   Supported:
   projectId
   search
   status
   page
   limit
   sortBy
   sortOrder
   ========================================================= */

export const validateTaskListQuery = (
  req,
  res,
  next
) => {
  const originalQuery =
    req.query ?? {};

  const allowedQueryFields = [
    "projectId",
    "search",
    "status",
    "page",
    "limit",
    "sortBy",
    "sortOrder",
  ];

  const invalidFields =
    Object.keys(
      originalQuery
    ).filter(
      (field) =>
        !allowedQueryFields.includes(
          field
        )
    );

  if (invalidFields.length) {
    return sendValidationError(
      res,
      "Invalid query parameters.",
      invalidFields.map(
        (field) => ({
          field,
          message:
            `${field} query parameter is not supported.`,
        })
      )
    );
  }

  const errors = [];
  const normalizedQuery = {};

  if (
    originalQuery.projectId !==
    undefined
  ) {
    const projectId =
      normalizeText(
        originalQuery.projectId
      );

    if (
      !isValidObjectId(
        projectId
      )
    ) {
      errors.push({
        field: "projectId",
        message:
          "Project ID query must be a valid MongoDB Object ID.",
      });
    } else {
      normalizedQuery.projectId =
        projectId;
    }
  }

  if (
    originalQuery.search !==
    undefined
  ) {
    const search =
      normalizeText(
        originalQuery.search
      );

    if (
      search.length > 200
    ) {
      errors.push({
        field: "search",
        message:
          "Search query cannot exceed 200 characters.",
      });
    } else if (search) {
      normalizedQuery.search =
        search;
    }
  }

  if (
    originalQuery.status !==
    undefined
  ) {
    const status =
      normalizeText(
        originalQuery.status
      ).toLowerCase();

    if (
      !ALLOWED_TASK_STATUSES.includes(
        status
      )
    ) {
      errors.push({
        field: "status",
        message:
          "Status query must be in_progress or complete.",
      });
    } else {
      normalizedQuery.status =
        status;
    }
  }

  if (
    originalQuery.page !==
    undefined
  ) {
    const page =
      Number.parseInt(
        normalizeText(
          originalQuery.page
        ),
        10
      );

    if (
      !Number.isInteger(
        page
      ) ||
      page < 1
    ) {
      errors.push({
        field: "page",
        message:
          "Page must be a positive integer.",
      });
    } else {
      normalizedQuery.page =
        String(page);
    }
  }

  if (
    originalQuery.limit !==
    undefined
  ) {
    const limit =
      Number.parseInt(
        normalizeText(
          originalQuery.limit
        ),
        10
      );

    if (
      !Number.isInteger(
        limit
      ) ||
      limit < 1 ||
      limit > 100
    ) {
      errors.push({
        field: "limit",
        message:
          "Limit must be between 1 and 100.",
      });
    } else {
      normalizedQuery.limit =
        String(limit);
    }
  }

  if (
    originalQuery.sortBy !==
    undefined
  ) {
    const sortBy =
      normalizeText(
        originalQuery.sortBy
      );

    if (
      !ALLOWED_SORT_FIELDS.includes(
        sortBy
      )
    ) {
      errors.push({
        field: "sortBy",
        message:
          `Sort field must be one of: ${ALLOWED_SORT_FIELDS.join(
            ", "
          )}.`,
      });
    } else {
      /*
        taskRegisterId is an application alias. Existing physical
        MongoDB field remains riskRegisterId during migration.
      */
      normalizedQuery.sortBy =
        sortBy ===
        "taskRegisterId"
          ? "riskRegisterId"
          : sortBy;
    }
  }

  if (
    originalQuery.sortOrder !==
    undefined
  ) {
    const sortOrder =
      normalizeText(
        originalQuery.sortOrder
      ).toLowerCase();

    if (
      !ALLOWED_SORT_ORDERS.includes(
        sortOrder
      )
    ) {
      errors.push({
        field: "sortOrder",
        message:
          "Sort order must be asc or desc.",
      });
    } else {
      normalizedQuery.sortOrder =
        sortOrder;
    }
  }

  if (errors.length) {
    return sendValidationError(
      res,
      "Task query validation failed.",
      errors
    );
  }

  setValidatedQuery(
    req,
    normalizedQuery
  );

  return next();
};

/* =========================================================
   TEMPORARY LEGACY EXPORTS

   Remove after controller/routes/dashboard migration finishes.
   ========================================================= */

export const validateRiskIdParam = (
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

  return validateTaskIdParam(
    req,
    res,
    next
  );
};

export const validateCreateRisk =
  validateCreateTask;

export const validateUpdateRisk =
  validateUpdateTask;

export const validateRiskStatusUpdate =
  validateTaskStatusUpdate;

export const validateRiskListQuery =
  validateTaskListQuery;
