import {
  body,
  param,
  query,
  validationResult,
} from "express-validator";

import mongoose from "mongoose";

import {
  DOCUMENT_FORMATS,
  DOCUMENT_LAYOUTS,
  DOCUMENT_RISK_STATUS_FILTERS,
  DOCUMENT_STATUSES,
} from "../../models/documents/document.model.js";

/* =========================================================
   CONSTANTS
   ========================================================= */

const CREATE_ALLOWED_FIELDS = [
  "projectId",
  "title",
  "description",
  "layout",
  "format",
  "filters",
];

const FILTER_ALLOWED_FIELDS = [
  "statusFilter",
  "includeProjectDetails",
  "includeRiskRegisterId",
  "includeBeforeEvidence",
  "includeAfterEvidence",
  "includeEvidenceImages",
  "dateFrom",
  "dateTo",
  "selectedRiskIds",
  "sortBy",
  "sortOrder",
];

const SYSTEM_MANAGED_FIELDS = [
  "projectCode",
  "projectReferenceNo",
  "projectTitle",
  "status",
  "exportedRiskIds",
  "summary",
  "fileName",
  "filePath",
  "mimeType",
  "fileSize",
  "generatedAt",
  "generatedBy",
  "failureReason",
  "createdAt",
  "updatedAt",
];

const DOCUMENT_SORT_FIELDS = [
  "createdAt",
  "generatedAt",
  "title",
  "status",
  "format",
  "layout",
];

const RISK_SORT_FIELDS = [
  "serialNo",
  "createdAt",
  "updatedAt",
  "status",
];

const SORT_ORDERS = [
  "asc",
  "desc",
];

const MAX_SELECTED_RISKS = 5000;

/* =========================================================
   HELPERS
   ========================================================= */

const normalizeText = (
  value
) => {
  return typeof value ===
    "string"
    ? value.trim()
    : value;
};

const normalizeLowercaseText = (
  value
) => {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
    : value;
};

const isPlainObject = (
  value
) => {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
};

const getUnknownFields = (
  objectValue,
  allowedFields
) => {
  if (
    !isPlainObject(
      objectValue
    )
  ) {
    return [];
  }

  return Object.keys(
    objectValue
  ).filter(
    (fieldName) =>
      !allowedFields.includes(
        fieldName
      )
  );
};

const removeDuplicateIds = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return values;
  }

  const uniqueValues =
    new Map();

  values.forEach(
    (value) => {
      const normalizedValue =
        typeof value ===
          "string"
          ? value.trim()
          : value;

      if (
        normalizedValue
      ) {
        uniqueValues.set(
          normalizedValue.toString(),
          normalizedValue
        );
      }
    }
  );

  return [
    ...uniqueValues.values(),
  ];
};

/* =========================================================
   VALIDATION RESULT HANDLER
   ========================================================= */

const handleValidationErrors = (
  req,
  res,
  next
) => {
  const errors =
    validationResult(
      req
    );

  if (
    errors.isEmpty()
  ) {
    return next();
  }

  return res.status(
    400
  ).json({
    success: false,

    message:
      "Document request validation failed.",

    errors:
      errors.array({
        onlyFirstError: true,
      }),
  });
};

/* =========================================================
   ROOT BODY VALIDATION
   ========================================================= */

const validateDocumentBody =
  body().custom(
    (requestBody) => {
      if (
        !isPlainObject(
          requestBody
        )
      ) {
        throw new Error(
          "Request body must be a valid object."
        );
      }

      const unknownFields =
        getUnknownFields(
          requestBody,
          CREATE_ALLOWED_FIELDS
        );

      if (
        unknownFields.length >
        0
      ) {
        throw new Error(
          `Unsupported document field${
            unknownFields.length ===
            1
              ? ""
              : "s"
          }: ${unknownFields.join(", ")}.`
        );
      }

      const protectedFields =
        SYSTEM_MANAGED_FIELDS.filter(
          (fieldName) =>
            Object.prototype.hasOwnProperty.call(
              requestBody,
              fieldName
            )
        );

      if (
        protectedFields.length >
        0
      ) {
        throw new Error(
          `System-managed field${
            protectedFields.length ===
            1
              ? ""
              : "s"
          } cannot be submitted: ${protectedFields.join(", ")}.`
        );
      }

      return true;
    }
  );

/* =========================================================
   FILTER OBJECT VALIDATION
   ========================================================= */

const validateFiltersObject =
  body("filters")
    .optional()
    .custom(
      (filters) => {
        if (
          !isPlainObject(
            filters
          )
        ) {
          throw new Error(
            "Filters must be a valid object."
          );
        }

        const unknownFields =
          getUnknownFields(
            filters,
            FILTER_ALLOWED_FIELDS
          );

        if (
          unknownFields.length >
          0
        ) {
          throw new Error(
            `Unsupported filter field${
              unknownFields.length ===
              1
                ? ""
                : "s"
            }: ${unknownFields.join(", ")}.`
          );
        }

        return true;
      }
    );

/* =========================================================
   PROJECT ID
   ========================================================= */

const validateProjectIdBody =
  body("projectId")
    .exists({
      checkFalsy: true,
    })
    .withMessage(
      "Project ID is required."
    )
    .bail()
    .isMongoId()
    .withMessage(
      "Project ID is invalid."
    )
    .customSanitizer(
      normalizeText
    );

/* =========================================================
   CUSTOM REPORT TITLE
   ========================================================= */

const validateTitle =
  body("title")
    .exists({
      checkFalsy: true,
    })
    .withMessage(
      "Report title is required."
    )
    .bail()
    .isString()
    .withMessage(
      "Report title must be text."
    )
    .bail()
    .trim()
    .isLength({
      min: 3,
      max: 250,
    })
    .withMessage(
      "Report title must contain between 3 and 250 characters."
    );

/* =========================================================
   OPTIONAL DESCRIPTION
   ========================================================= */

const validateDescription =
  body("description")
    .optional({
      nullable: true,
    })
    .customSanitizer(
      (value) => {
        if (
          value === null ||
          value ===
            undefined
        ) {
          return undefined;
        }

        const normalizedValue =
          normalizeText(
            value
          );

        return (
          normalizedValue ||
          undefined
        );
      }
    )
    .custom(
      (value) => {
        if (
          value ===
            undefined
        ) {
          return true;
        }

        if (
          typeof value !==
          "string"
        ) {
          throw new Error(
            "Report description must be text."
          );
        }

        if (
          value.length >
          2000
        ) {
          throw new Error(
            "Report description cannot exceed 2000 characters."
          );
        }

        return true;
      }
    );

/* =========================================================
   REPORT LAYOUT
   ========================================================= */

const validateLayout =
  body("layout")
    .optional()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      DOCUMENT_LAYOUTS
    )
    .withMessage(
      "Report layout must be risk_register, detailed_evidence or summary."
    )
    .default(
      "risk_register"
    );

/* =========================================================
   EXPORT FORMAT
   ========================================================= */

const validateFormat =
  body("format")
    .exists({
      checkFalsy: true,
    })
    .withMessage(
      "Export format is required."
    )
    .bail()
    .isString()
    .withMessage(
      "Export format must be text."
    )
    .bail()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      DOCUMENT_FORMATS
    )
    .withMessage(
      "Export format must be pdf, docx or xlsx."
    );

/* =========================================================
   STATUS FILTER
   ========================================================= */

const validateStatusFilter =
  body(
    "filters.statusFilter"
  )
    .optional()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      DOCUMENT_RISK_STATUS_FILTERS
    )
    .withMessage(
      "Status filter must be all, in_progress or complete."
    )
    .default(
      "all"
    );

/* =========================================================
   BOOLEAN FILTERS
   ========================================================= */

const validateBooleanFilter = (
  fieldName,
  label
) => {
  return body(
    fieldName
  )
    .optional()
    .isBoolean()
    .withMessage(
      `${label} must be true or false.`
    )
    .toBoolean();
};

/* =========================================================
   DATE FILTERS
   ========================================================= */

const validateDateFrom =
  body(
    "filters.dateFrom"
  )
    .optional({
      nullable: true,
    })
    .customSanitizer(
      (value) => {
        const normalizedValue =
          normalizeText(
            value
          );

        return (
          normalizedValue ||
          undefined
        );
      }
    )
    .custom(
      (value) => {
        if (
          value ===
            undefined
        ) {
          return true;
        }

        const date =
          new Date(
            value
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          throw new Error(
            "Date From is invalid."
          );
        }

        return true;
      }
    );

const validateDateTo =
  body(
    "filters.dateTo"
  )
    .optional({
      nullable: true,
    })
    .customSanitizer(
      (value) => {
        const normalizedValue =
          normalizeText(
            value
          );

        return (
          normalizedValue ||
          undefined
        );
      }
    )
    .custom(
      (value) => {
        if (
          value ===
            undefined
        ) {
          return true;
        }

        const date =
          new Date(
            value
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          throw new Error(
            "Date To is invalid."
          );
        }

        return true;
      }
    )
    .custom(
      (
        dateTo,
        {
          req,
        }
      ) => {
        const dateFrom =
          req.body?.filters
            ?.dateFrom;

        if (
          !dateFrom ||
          !dateTo
        ) {
          return true;
        }

        if (
          new Date(
            dateTo
          ) <
          new Date(
            dateFrom
          )
        ) {
          throw new Error(
            "Date To must be equal to or later than Date From."
          );
        }

        return true;
      }
    );

/* =========================================================
   SELECTED RISK IDS
   ========================================================= */

const validateSelectedRiskIds = [
  body(
    "filters.selectedRiskIds"
  )
    .optional()
    .isArray({
      max:
        MAX_SELECTED_RISKS,
    })
    .withMessage(
      `Selected Risk IDs must be an array containing no more than ${MAX_SELECTED_RISKS} records.`
    )
    .customSanitizer(
      removeDuplicateIds
    ),

  body(
    "filters.selectedRiskIds.*"
  )
    .optional()
    .custom(
      (riskId) => {
        if (
          typeof riskId !==
            "string" ||
          !mongoose.isValidObjectId(
            riskId.trim()
          )
        ) {
          throw new Error(
            "One or more selected Risk IDs are invalid."
          );
        }

        return true;
      }
    )
    .customSanitizer(
      normalizeText
    ),
];

/* =========================================================
   RISK SORTING OPTIONS
   ========================================================= */

const validateRiskSortBy =
  body(
    "filters.sortBy"
  )
    .optional()
    .customSanitizer(
      normalizeText
    )
    .isIn(
      RISK_SORT_FIELDS
    )
    .withMessage(
      "Risk sort field must be serialNo, createdAt, updatedAt or status."
    )
    .default(
      "serialNo"
    );

const validateRiskSortOrder =
  body(
    "filters.sortOrder"
  )
    .optional()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      SORT_ORDERS
    )
    .withMessage(
      "Risk sort order must be asc or desc."
    )
    .default(
      "asc"
    );

/* =========================================================
   GENERATE DOCUMENT VALIDATION

   POST /api/v1/documents/generate
   ========================================================= */

export const validateGenerateDocument = [
  validateDocumentBody,
  validateFiltersObject,

  validateProjectIdBody,
  validateTitle,
  validateDescription,
  validateLayout,
  validateFormat,

  validateStatusFilter,

  validateBooleanFilter(
    "filters.includeProjectDetails",
    "Include Project Details"
  ),

  validateBooleanFilter(
    "filters.includeRiskRegisterId",
    "Include Risk Register ID"
  ),

  validateBooleanFilter(
    "filters.includeBeforeEvidence",
    "Include Before Evidence"
  ),

  validateBooleanFilter(
    "filters.includeAfterEvidence",
    "Include After Evidence"
  ),

  validateBooleanFilter(
    "filters.includeEvidenceImages",
    "Include Evidence Images"
  ),

  validateDateFrom,
  validateDateTo,

  ...validateSelectedRiskIds,

  validateRiskSortBy,
  validateRiskSortOrder,

  handleValidationErrors,
];

/*
  Alternative export name for route compatibility.
*/

export const validateCreateDocument =
  validateGenerateDocument;

/* =========================================================
   DOCUMENT ID PARAMETER

   GET /api/v1/documents/:documentId
   DELETE /api/v1/documents/:documentId
   GET /api/v1/documents/:documentId/download
   ========================================================= */

export const validateDocumentIdParam = [
  param(
    "documentId"
  )
    .exists({
      checkFalsy: true,
    })
    .withMessage(
      "Document ID is required."
    )
    .bail()
    .isMongoId()
    .withMessage(
      "Document ID is invalid."
    )
    .customSanitizer(
      normalizeText
    ),

  handleValidationErrors,
];

/* =========================================================
   PROJECT ID PARAMETER

   GET /api/v1/documents/project/:projectId
   ========================================================= */

export const validateProjectIdParam = [
  param(
    "projectId"
  )
    .exists({
      checkFalsy: true,
    })
    .withMessage(
      "Project ID is required."
    )
    .bail()
    .isMongoId()
    .withMessage(
      "Project ID is invalid."
    )
    .customSanitizer(
      normalizeText
    ),

  handleValidationErrors,
];

/* =========================================================
   DOCUMENT HISTORY LIST QUERY

   GET /api/v1/documents
   GET /api/v1/documents/project/:projectId
   ========================================================= */

export const validateDocumentListQuery = [
  query(
    "projectId"
  )
    .optional()
    .isMongoId()
    .withMessage(
      "Project ID is invalid."
    )
    .customSanitizer(
      normalizeText
    ),

  query(
    "search"
  )
    .optional()
    .isString()
    .withMessage(
      "Search must be text."
    )
    .bail()
    .trim()
    .isLength({
      max: 250,
    })
    .withMessage(
      "Search cannot exceed 250 characters."
    ),

  query(
    "layout"
  )
    .optional()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      DOCUMENT_LAYOUTS
    )
    .withMessage(
      "Document layout is invalid."
    ),

  query(
    "format"
  )
    .optional()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      DOCUMENT_FORMATS
    )
    .withMessage(
      "Document format is invalid."
    ),

  query(
    "status"
  )
    .optional()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      DOCUMENT_STATUSES
    )
    .withMessage(
      "Document status must be generating, completed or failed."
    ),

  query(
    "generatedBy"
  )
    .optional()
    .isMongoId()
    .withMessage(
      "Generated By user ID is invalid."
    )
    .customSanitizer(
      normalizeText
    ),

  query(
    "dateFrom"
  )
    .optional()
    .isISO8601()
    .withMessage(
      "Date From is invalid."
    ),

  query(
    "dateTo"
  )
    .optional()
    .isISO8601()
    .withMessage(
      "Date To is invalid."
    )
    .custom(
      (
        dateTo,
        {
          req,
        }
      ) => {
        const dateFrom =
          req.query?.dateFrom;

        if (
          !dateFrom ||
          !dateTo
        ) {
          return true;
        }

        if (
          new Date(
            dateTo
          ) <
          new Date(
            dateFrom
          )
        ) {
          throw new Error(
            "Date To must be equal to or later than Date From."
          );
        }

        return true;
      }
    ),

  query(
    "page"
  )
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Page must be a positive integer."
    )
    .toInt(),

  query(
    "limit"
  )
    .optional()
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Limit must be between 1 and 100."
    )
    .toInt(),

  query(
    "sortBy"
  )
    .optional()
    .isIn(
      DOCUMENT_SORT_FIELDS
    )
    .withMessage(
      "Document sort field is invalid."
    ),

  query(
    "sortOrder"
  )
    .optional()
    .customSanitizer(
      normalizeLowercaseText
    )
    .isIn(
      SORT_ORDERS
    )
    .withMessage(
      "Sort order must be asc or desc."
    ),

  handleValidationErrors,
];