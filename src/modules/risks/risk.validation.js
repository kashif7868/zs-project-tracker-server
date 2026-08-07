import mongoose from "mongoose";

/* =========================================================
   CONSTANTS
   ========================================================= */

const ALLOWED_RISK_STATUSES = [
  "in_progress",
  "complete",
];

const ALLOWED_SORT_FIELDS = [
  "serialNo",
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

const isPlainObject = (value) => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
};

const isValidObjectId = (value) => {
  return (
    typeof value === "string" &&
    mongoose.isValidObjectId(
      value.trim()
    )
  );
};

const normalizeText = (value) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const getInvalidFields = (
  body,
  allowedFields
) => {
  return Object.keys(body).filter(
    (field) =>
      !allowedFields.includes(
        field
      )
  );
};

const hasOwnField = (
  object,
  field
) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    field
  );
};

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
    typeof value !== "string"
  ) {
    errors.push({
      field,
      message:
        `${label} is required.`,
    });

    return errors;
  }

  const normalizedValue =
    value.trim();

  if (!normalizedValue) {
    errors.push({
      field,
      message:
        `${label} is required.`,
    });

    return errors;
  }

  if (
    normalizedValue.length <
    minLength
  ) {
    errors.push({
      field,
      message:
        `${label} must contain at least ${minLength} characters.`,
    });
  }

  if (
    normalizedValue.length >
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

  if (
    value === undefined
  ) {
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

   Express 5 mein req.query read-only getter ho sakti hai.
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
   RISK ID PARAM VALIDATION
   ========================================================= */

export const validateRiskIdParam = (
  req,
  res,
  next
) => {
  const riskId =
    normalizeText(
      req.params.riskId
    );

  if (
    !isValidObjectId(
      riskId
    )
  ) {
    return sendValidationError(
      res,
      "Risk ID is invalid.",
      [
        {
          field: "riskId",
          message:
            "A valid MongoDB Risk ID is required.",
        },
      ]
    );
  }

  req.params.riskId =
    riskId;

  return next();
};

/* =========================================================
   PROJECT ID PARAM VALIDATION
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
   CREATE RISK VALIDATION

   Allowed:

   projectId
   riskRegisterId optional
   description

   serialNo model automatically generate karega.
   status automatically in_progress hoga.
   ========================================================= */

export const validateCreateRisk = (
  req,
  res,
  next
) => {
  if (
    !isPlainObject(
      req.body
    )
  ) {
    return sendValidationError(
      res,
      "A valid request body is required."
    );
  }

  const allowedFields = [
    "projectId",
    "riskRegisterId",
    "description",
  ];

  const invalidFields =
    getInvalidFields(
      req.body,
      allowedFields
    );

  if (
    invalidFields.length > 0
  ) {
    return sendValidationError(
      res,
      "Request contains invalid fields.",
      invalidFields.map(
        (field) => {
          if (
            field === "serialNo"
          ) {
            return {
              field,
              message:
                "Serial number is generated automatically and cannot be supplied.",
            };
          }

          if (
            field === "status"
          ) {
            return {
              field,
              message:
                "New risks automatically start with in_progress status.",
            };
          }

          return {
            field,
            message:
              `${field} is not allowed while creating a risk.`,
          };
        }
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

      field:
        "description",

      label:
        "Description",

      minLength: 3,
      maxLength: 3000,
    })
  );

  errors.push(
    ...validateOptionalText({
      value:
        req.body.riskRegisterId,

      field:
        "riskRegisterId",

      label:
        "Risk Register ID",

      maxLength: 100,
    })
  );

  if (
    errors.length > 0
  ) {
    return sendValidationError(
      res,
      "Risk validation failed.",
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

  const riskRegisterId =
    normalizeText(
      req.body.riskRegisterId
    );

  if (riskRegisterId) {
    normalizedBody.riskRegisterId =
      riskRegisterId.toUpperCase();
  }

  req.body =
    normalizedBody;

  return next();
};

/* =========================================================
   UPDATE RISK VALIDATION

   Editable:

   description
   riskRegisterId optional

   Protected:

   projectId
   projectCode
   serialNo
   status
   ========================================================= */

export const validateUpdateRisk = (
  req,
  res,
  next
) => {
  if (
    !isPlainObject(
      req.body
    )
  ) {
    return sendValidationError(
      res,
      "A valid request body is required."
    );
  }

  const allowedFields = [
    "riskRegisterId",
    "description",
  ];

  const receivedFields =
    Object.keys(
      req.body
    );

  if (
    receivedFields.length === 0
  ) {
    return sendValidationError(
      res,
      "At least one risk field is required.",
      [
        {
          field: "body",
          message:
            "Provide description or riskRegisterId.",
        },
      ]
    );
  }

  const invalidFields =
    getInvalidFields(
      req.body,
      allowedFields
    );

  if (
    invalidFields.length > 0
  ) {
    return sendValidationError(
      res,
      "Request contains invalid fields.",
      invalidFields.map(
        (field) => {
          if (
            field === "serialNo"
          ) {
            return {
              field,
              message:
                "Serial number is generated automatically and cannot be updated.",
            };
          }

          if (
            field === "projectId" ||
            field === "projectCode"
          ) {
            return {
              field,
              message:
                "A risk cannot be moved to another project.",
            };
          }

          if (
            field === "status"
          ) {
            return {
              field,
              message:
                "Use the dedicated risk status endpoint to update status.",
            };
          }

          return {
            field,
            message:
              `${field} is not allowed while updating a risk.`,
          };
        }
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
          "Description",

        minLength: 3,
        maxLength: 3000,
      })
    );
  }

  if (
    hasOwnField(
      req.body,
      "riskRegisterId"
    )
  ) {
    errors.push(
      ...validateOptionalText({
        value:
          req.body.riskRegisterId,

        field:
          "riskRegisterId",

        label:
          "Risk Register ID",

        maxLength: 100,
        allowNull: true,
      })
    );
  }

  if (
    errors.length > 0
  ) {
    return sendValidationError(
      res,
      "Risk update validation failed.",
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

  if (
    hasOwnField(
      req.body,
      "riskRegisterId"
    )
  ) {
    const riskRegisterId =
      normalizeText(
        req.body.riskRegisterId
      );

    /*
      null ya blank string existing Risk Register ID
      remove karne ki request represent karegi.

      Project setting enabled/disabled service verify karegi.
    */

    normalizedBody.riskRegisterId =
      riskRegisterId
        ? riskRegisterId.toUpperCase()
        : null;
  }

  req.body =
    normalizedBody;

  return next();
};

/* =========================================================
   STATUS UPDATE VALIDATION
   ========================================================= */

export const validateRiskStatusUpdate = (
  req,
  res,
  next
) => {
  if (
    !isPlainObject(
      req.body
    )
  ) {
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
    !ALLOWED_RISK_STATUSES.includes(
      status
    )
  ) {
    return sendValidationError(
      res,
      "Risk status is invalid.",
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
   RISK LIST QUERY VALIDATION

   Supported:

   projectId
   search
   status
   page
   limit
   sortBy
   sortOrder
   ========================================================= */

export const validateRiskListQuery = (
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

  if (
    invalidFields.length > 0
  ) {
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

  /* PROJECT ID */

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

  /* SEARCH */

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

  /* STATUS */

  if (
    originalQuery.status !==
    undefined
  ) {
    const status =
      normalizeText(
        originalQuery.status
      ).toLowerCase();

    if (
      !ALLOWED_RISK_STATUSES.includes(
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

  /* PAGE */

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

  /* LIMIT */

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

  /* SORT FIELD */

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
      normalizedQuery.sortBy =
        sortBy;
    }
  }

  /* SORT ORDER */

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

  if (
    errors.length > 0
  ) {
    return sendValidationError(
      res,
      "Risk query validation failed.",
      errors
    );
  }

  setValidatedQuery(
    req,
    normalizedQuery
  );

  return next();
};