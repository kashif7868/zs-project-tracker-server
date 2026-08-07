import {
  body,
  param,
  query,
  validationResult,
} from "express-validator";

/* =========================================================
   CONSTANTS
   ========================================================= */

const ROLE_STATUSES = [
  "active",
  "inactive",
];

const ROLE_SORT_FIELDS = [
  "name",
  "slug",
  "status",
  "isSystemRole",
  "createdAt",
  "updatedAt",
];

const ROLE_SLUG_PATTERN =
  /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const PERMISSION_PATTERN =
  /^[a-z0-9]+(?:[._][a-z0-9]+)*$/;

const ROLE_UPDATE_FIELDS = [
  "name",
  "slug",
  "description",
  "permissions",
  "status",
];

/* =========================================================
   VALIDATION ERROR HANDLER
   ========================================================= */

export const validateRoleRequest = (
  req,
  res,
  next
) => {
  const validationErrors =
    validationResult(req);

  if (
    validationErrors.isEmpty()
  ) {
    return next();
  }

  const errors =
    validationErrors
      .array()
      .map((error) => ({
        field:
          error.path ||
          error.param ||
          "",

        message:
          error.msg ||
          "Invalid value.",
      }));

  return res.status(400).json({
    success: false,

    message:
      errors[0]?.message ||
      "Role validation failed.",

    errors,
  });
};

/* =========================================================
   ROLE ID VALIDATION
   ========================================================= */

export const validateRoleId = [
  param("roleId")
    .trim()
    .notEmpty()
    .withMessage(
      "Role ID is required."
    )
    .isMongoId()
    .withMessage(
      "Role ID is invalid."
    ),

  validateRoleRequest,
];

/* =========================================================
   CREATE ROLE VALIDATION

   Client can provide:

   name
   slug
   description
   permissions
   status

   Client cannot directly provide:

   isSystemRole
   createdBy
   updatedBy
   ========================================================= */

export const validateCreateRole = [
  body("name")
    .exists({
      checkFalsy: true,
    })
    .withMessage(
      "Role name is required."
    )
    .bail()
    .isString()
    .withMessage(
      "Role name must be a string."
    )
    .bail()
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Role name must contain between 2 and 100 characters."
    ),

  body("slug")
    .optional({
      nullable: true,
      checkFalsy: true,
    })
    .isString()
    .withMessage(
      "Role slug must be a string."
    )
    .bail()
    .trim()
    .toLowerCase()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Role slug must contain between 2 and 100 characters."
    )
    .bail()
    .matches(
      ROLE_SLUG_PATTERN
    )
    .withMessage(
      "Role slug can contain lowercase letters, numbers and underscores only."
    ),

  body("description")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Role description must be a string."
    )
    .bail()
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage(
      "Role description cannot exceed 1000 characters."
    ),

  body("permissions")
    .optional()
    .isArray({
      max: 200,
    })
    .withMessage(
      "Permissions must be an array containing no more than 200 permission keys."
    ),

  body("permissions.*")
    .optional()
    .isString()
    .withMessage(
      "Every permission must be a string."
    )
    .bail()
    .trim()
    .toLowerCase()
    .isLength({
      min: 3,
      max: 150,
    })
    .withMessage(
      "Every permission must contain between 3 and 150 characters."
    )
    .bail()
    .matches(
      PERMISSION_PATTERN
    )
    .withMessage(
      "Permission keys can contain lowercase letters, numbers, dots and underscores only."
    ),

  body("status")
    .optional()
    .isIn(
      ROLE_STATUSES
    )
    .withMessage(
      "Role status must be active or inactive."
    ),

  body("isSystemRole")
    .not()
    .exists()
    .withMessage(
      "System role status cannot be assigned manually."
    ),

  body("createdBy")
    .not()
    .exists()
    .withMessage(
      "Role creator cannot be assigned manually."
    ),

  body("updatedBy")
    .not()
    .exists()
    .withMessage(
      "Role updater cannot be assigned manually."
    ),

  validateRoleRequest,
];

/* =========================================================
   UPDATE ROLE VALIDATION
   ========================================================= */

export const validateUpdateRole = [
  param("roleId")
    .trim()
    .notEmpty()
    .withMessage(
      "Role ID is required."
    )
    .bail()
    .isMongoId()
    .withMessage(
      "Role ID is invalid."
    ),

  body()
    .custom(
      (_value, { req }) => {
        const hasUpdateField =
          ROLE_UPDATE_FIELDS.some(
            (field) =>
              Object.prototype.hasOwnProperty.call(
                req.body,
                field
              )
          );

        if (!hasUpdateField) {
          throw new Error(
            "At least one Role field is required for update."
          );
        }

        return true;
      }
    ),

  body("name")
    .optional()
    .isString()
    .withMessage(
      "Role name must be a string."
    )
    .bail()
    .trim()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Role name must contain between 2 and 100 characters."
    ),

  body("slug")
    .optional()
    .isString()
    .withMessage(
      "Role slug must be a string."
    )
    .bail()
    .trim()
    .toLowerCase()
    .isLength({
      min: 2,
      max: 100,
    })
    .withMessage(
      "Role slug must contain between 2 and 100 characters."
    )
    .bail()
    .matches(
      ROLE_SLUG_PATTERN
    )
    .withMessage(
      "Role slug can contain lowercase letters, numbers and underscores only."
    ),

  body("description")
    .optional({
      nullable: true,
    })
    .isString()
    .withMessage(
      "Role description must be a string."
    )
    .bail()
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage(
      "Role description cannot exceed 1000 characters."
    ),

  body("permissions")
    .optional()
    .isArray({
      max: 200,
    })
    .withMessage(
      "Permissions must be an array containing no more than 200 permission keys."
    ),

  body("permissions.*")
    .optional()
    .isString()
    .withMessage(
      "Every permission must be a string."
    )
    .bail()
    .trim()
    .toLowerCase()
    .isLength({
      min: 3,
      max: 150,
    })
    .withMessage(
      "Every permission must contain between 3 and 150 characters."
    )
    .bail()
    .matches(
      PERMISSION_PATTERN
    )
    .withMessage(
      "Permission keys can contain lowercase letters, numbers, dots and underscores only."
    ),

  body("status")
    .optional()
    .isIn(
      ROLE_STATUSES
    )
    .withMessage(
      "Role status must be active or inactive."
    ),

  body("isSystemRole")
    .not()
    .exists()
    .withMessage(
      "System role status cannot be changed manually."
    ),

  body("createdBy")
    .not()
    .exists()
    .withMessage(
      "Role creator cannot be changed manually."
    ),

  body("updatedBy")
    .not()
    .exists()
    .withMessage(
      "Role updater cannot be assigned manually."
    ),

  validateRoleRequest,
];

/* =========================================================
   ROLE LIST QUERY VALIDATION

   Supported query:

   page
   limit
   search
   status
   isSystemRole
   sortBy
   sortOrder
   ========================================================= */

export const validateRoleListQuery = [
  query("page")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Page must be a positive integer."
    )
    .toInt(),

  query("limit")
    .optional()
    .isInt({
      min: 1,
      max: 100,
    })
    .withMessage(
      "Limit must be between 1 and 100."
    )
    .toInt(),

  query("search")
    .optional()
    .isString()
    .withMessage(
      "Search must be a string."
    )
    .bail()
    .trim()
    .isLength({
      max: 100,
    })
    .withMessage(
      "Search cannot exceed 100 characters."
    ),

  query("status")
    .optional()
    .isIn(
      ROLE_STATUSES
    )
    .withMessage(
      "Role status must be active or inactive."
    ),

  query("isSystemRole")
    .optional()
    .isBoolean()
    .withMessage(
      "isSystemRole must be true or false."
    )
    .toBoolean(),

  query("sortBy")
    .optional()
    .isIn(
      ROLE_SORT_FIELDS
    )
    .withMessage(
      `sortBy must be one of: ${ROLE_SORT_FIELDS.join(", ")}.`
    ),

  query("sortOrder")
    .optional()
    .isIn([
      "asc",
      "desc",
    ])
    .withMessage(
      "sortOrder must be asc or desc."
    ),

  validateRoleRequest,
];

/* =========================================================
   ROLE STATUS VALIDATION
   ========================================================= */

export const validateRoleStatus = [
  param("roleId")
    .trim()
    .notEmpty()
    .withMessage(
      "Role ID is required."
    )
    .bail()
    .isMongoId()
    .withMessage(
      "Role ID is invalid."
    ),

  body("status")
    .exists({
      checkFalsy: true,
    })
    .withMessage(
      "Role status is required."
    )
    .bail()
    .isIn(
      ROLE_STATUSES
    )
    .withMessage(
      "Role status must be active or inactive."
    ),

  validateRoleRequest,
];