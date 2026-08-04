export const notFoundMiddleware = (
  req,
  res,
  next
) => {
  const error = new Error(
    `Route not found - ${req.originalUrl}`
  );

  error.statusCode = 404;

  next(error);
};

/* =========================================================
   DUPLICATE FIELD MESSAGE
   ========================================================= */

const getDuplicateMessage = (
  error
) => {
  const keyValue =
    error?.keyValue &&
    typeof error.keyValue ===
      "object"
      ? error.keyValue
      : {};

  const keyPattern =
    error?.keyPattern &&
    typeof error.keyPattern ===
      "object"
      ? error.keyPattern
      : {};

  const duplicateFields =
    Object.keys(keyValue).length > 0
      ? Object.keys(keyValue)
      : Object.keys(keyPattern);

  const duplicateValue = (
    field
  ) => {
    const value =
      keyValue[field];

    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    return String(value);
  };

  if (
    duplicateFields.includes(
      "serialNo"
    )
  ) {
    const value =
      duplicateValue(
        "serialNo"
      );

    return value
      ? `Serial No. ${value} already exists in the selected Project.`
      : "This Serial No. already exists in the selected Project.";
  }

  if (
    duplicateFields.includes(
      "riskRegisterId"
    )
  ) {
    const value =
      duplicateValue(
        "riskRegisterId"
      );

    return value
      ? `Risk Register ID ${value} already exists in the selected Project.`
      : "This Risk Register ID already exists in the selected Project.";
  }

  if (
    duplicateFields.includes(
      "projectCode"
    )
  ) {
    const value =
      duplicateValue(
        "projectCode"
      );

    return value
      ? `Project Code ${value} already exists.`
      : "This Project Code already exists.";
  }

  if (
    duplicateFields.includes(
      "clientAccessToken"
    )
  ) {
    return "Client access token already exists. Please try again.";
  }

  const duplicateDetails =
    duplicateFields
      .map((field) => {
        const value =
          duplicateValue(field);

        return value
          ? `${field}: ${value}`
          : field;
      })
      .join(", ");

  return duplicateDetails
    ? `A duplicate record already exists for ${duplicateDetails}.`
    : "A duplicate record already exists.";
};

/* =========================================================
   VALIDATION ERROR MESSAGE
   ========================================================= */

const getValidationErrors = (
  error
) => {
  if (
    !error?.errors ||
    typeof error.errors !==
      "object"
  ) {
    return [];
  }

  return Object.values(
    error.errors
  ).map(
    (validationError) => ({
      field:
        validationError?.path ||
        "",

      message:
        validationError?.message ||
        "Invalid value.",
    })
  );
};

/* =========================================================
   GLOBAL ERROR MIDDLEWARE
   ========================================================= */

export const globalErrorMiddleware = (
  error,
  req,
  res,
  _next
) => {
  let statusCode =
    error?.statusCode ||
    error?.status ||
    500;

  let message =
    error?.message ||
    "Internal server error";

  let errors;

  /* MongoDB duplicate-key error */

  if (
    error?.code === 11000
  ) {
    statusCode = 409;

    message =
      getDuplicateMessage(
        error
      );
  }

  /* Mongoose validation error */

  if (
    error?.name ===
    "ValidationError"
  ) {
    statusCode = 400;

    errors =
      getValidationErrors(
        error
      );

    message =
      errors[0]?.message ||
      "Validation failed.";
  }

  /* Invalid MongoDB ObjectId */

  if (
    error?.name ===
    "CastError"
  ) {
    statusCode = 400;

    message =
      error?.path
        ? `Invalid ${error.path}.`
        : "Invalid record ID.";
  }

  /* Multer file errors */

  if (
    error?.name ===
    "MulterError"
  ) {
    statusCode = 400;

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {
      message =
        "Each Evidence image must be 10 MB or smaller.";
    } else if (
      error.code ===
      "LIMIT_FILE_COUNT"
    ) {
      message =
        "Maximum 10 Evidence images can be uploaded at one time.";
    } else if (
      error.code ===
      "LIMIT_UNEXPECTED_FILE"
    ) {
      message =
        "Unexpected upload field. Evidence images must use the images field.";
    } else {
      message =
        error.message ||
        "Evidence upload failed.";
    }
  }

  const response = {
    success: false,
    message,

    ...(errors &&
    errors.length > 0
      ? {
          errors,
        }
      : {}),
  };

  if (
    process.env.NODE_ENV ===
      "development" &&
    statusCode >= 500
  ) {
    response.stack =
      error?.stack;
  }

  return res
    .status(statusCode)
    .json(response);
};