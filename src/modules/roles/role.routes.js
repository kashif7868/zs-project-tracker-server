import express from "express";

import authMiddleware from "../../middlewares/auth.middleware.js";

import {
  createRoleController,
  deleteRoleController,
  ensureSystemRolesController,
  getActiveRolesController,
  getRoleByIdController,
  getRolesController,
  updateRoleController,
  updateRoleStatusController,
} from "./role.controller.js";

import {
  validateCreateRole,
  validateRoleId,
  validateRoleListQuery,
  validateRoleStatus,
  validateUpdateRole,
} from "./role.validation.js";

const router = express.Router();

/* =========================================================
   CURRENT USER ROLE SLUG

   Current structure:

   req.user.role = "admin"

   Future dynamic structure:

   req.user.role = {
     _id,
     name,
     slug,
     permissions
   }

   Dono structures support kiye gaye hain.
   ========================================================= */

const getCurrentRoleSlug = (
  req
) => {
  const userRole =
    req.user?.role;

  if (
    typeof userRole ===
    "string"
  ) {
    return userRole
      .trim()
      .toLowerCase();
  }

  if (
    userRole &&
    typeof userRole ===
      "object" &&
    typeof userRole.slug ===
      "string"
  ) {
    return userRole.slug
      .trim()
      .toLowerCase();
  }

  if (
    typeof req.user?.roleSlug ===
    "string"
  ) {
    return req.user.roleSlug
      .trim()
      .toLowerCase();
  }

  return "";
};

/* =========================================================
   ROLE AUTHORIZATION

   Usage:

   allowRoles(
     "admin",
     "super_admin"
   )
   ========================================================= */

const allowRoles =
  (...allowedRoles) =>
  (
    req,
    res,
    next
  ) => {
    const roleSlug =
      getCurrentRoleSlug(req);

    if (!roleSlug) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "No authorized role is assigned to this account.",
        });
    }

    if (
      !allowedRoles.includes(
        roleSlug
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "You do not have permission to access this resource.",
        });
    }

    return next();
  };

/* =========================================================
   AUTHENTICATION

   Tamam Role routes protected hain.
   ========================================================= */

router.use(
  authMiddleware
);

/* =========================================================
   ACTIVE ROLES

   User role assignment dropdown ke liye.

   GET /api/v1/roles/active
   ========================================================= */

router.get(
  "/active",

  allowRoles(
    "admin",
    "super_admin"
  ),

  getActiveRolesController
);

/* =========================================================
   ENSURE SYSTEM ROLES

   Sirf Super Admin:

   POST /api/v1/roles/system/ensure
   ========================================================= */

router.post(
  "/system/ensure",

  allowRoles(
    "super_admin"
  ),

  ensureSystemRolesController
);

/* =========================================================
   ROLE LIST

   GET /api/v1/roles
   ========================================================= */

router.get(
  "/",

  allowRoles(
    "admin",
    "super_admin"
  ),

  validateRoleListQuery,

  getRolesController
);

/* =========================================================
   CREATE CUSTOM ROLE

   POST /api/v1/roles
   ========================================================= */

router.post(
  "/",

  allowRoles(
    "admin",
    "super_admin"
  ),

  validateCreateRole,

  createRoleController
);

/* =========================================================
   GET SINGLE ROLE

   GET /api/v1/roles/:roleId
   ========================================================= */

router.get(
  "/:roleId",

  allowRoles(
    "admin",
    "super_admin"
  ),

  validateRoleId,

  getRoleByIdController
);

/* =========================================================
   UPDATE ROLE STATUS

   PATCH /api/v1/roles/:roleId/status
   ========================================================= */

router.patch(
  "/:roleId/status",

  allowRoles(
    "admin",
    "super_admin"
  ),

  validateRoleStatus,

  updateRoleStatusController
);

/* =========================================================
   UPDATE ROLE

   PATCH /api/v1/roles/:roleId
   ========================================================= */

router.patch(
  "/:roleId",

  allowRoles(
    "admin",
    "super_admin"
  ),

  validateUpdateRole,

  updateRoleController
);

/* =========================================================
   DELETE CUSTOM ROLE

   DELETE /api/v1/roles/:roleId

   System Role aur assigned-user protection service mein hai.
   ========================================================= */

router.delete(
  "/:roleId",

  allowRoles(
    "admin",
    "super_admin"
  ),

  validateRoleId,

  deleteRoleController
);

export default router;