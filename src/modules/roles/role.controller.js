import {
  createRoleService,
  deleteRoleService,
  ensureSystemRolesService,
  getActiveRolesService,
  getRoleByIdService,
  getRolesService,
  updateRoleService,
  updateRoleStatusService,
} from "./role.service.js";

/* =========================================================
   ACTOR USER ID

   Existing authentication middleware ke different possible
   user ID response structures support karta hai.
   ========================================================= */

const getActorUserId = (
  req
) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    null
  );
};

/* =========================================================
   CREATE ROLE

   POST /api/v1/roles
   ========================================================= */

export const createRoleController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const role =
        await createRoleService(
          req.body,
          getActorUserId(req)
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Role created successfully.",

          data: {
            role,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET ROLE LIST

   GET /api/v1/roles
   ========================================================= */

export const getRolesController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getRolesService(
          req.query
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Roles fetched successfully.",

          data: {
            roles:
              result.roles,

            pagination:
              result.pagination,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET ACTIVE ROLES

   User role assignment dropdown mein use hoga.

   GET /api/v1/roles/active
   ========================================================= */

export const getActiveRolesController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const roles =
        await getActiveRolesService();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Active roles fetched successfully.",

          data: {
            roles,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET SINGLE ROLE

   GET /api/v1/roles/:roleId
   ========================================================= */

export const getRoleByIdController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const role =
        await getRoleByIdService(
          req.params.roleId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Role fetched successfully.",

          data: {
            role,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE ROLE

   PATCH /api/v1/roles/:roleId
   ========================================================= */

export const updateRoleController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const role =
        await updateRoleService(
          req.params.roleId,
          req.body,
          getActorUserId(req)
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Role updated successfully.",

          data: {
            role,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE ROLE STATUS

   PATCH /api/v1/roles/:roleId/status
   ========================================================= */

export const updateRoleStatusController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const role =
        await updateRoleStatusService(
          req.params.roleId,
          req.body.status,
          getActorUserId(req)
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            `Role status changed to ${role.status}.`,

          data: {
            role,
          },
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE ROLE

   DELETE /api/v1/roles/:roleId
   ========================================================= */

export const deleteRoleController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await deleteRoleService(
          req.params.roleId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            result.message ||
            "Role deleted successfully.",

          data: result,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   ENSURE SYSTEM ROLES

   Super Admin aur Admin role documents create/repair karega.

   Is endpoint ko routes mein Super Admin protection ke
   baghair expose nahi karna.

   POST /api/v1/roles/system/ensure
   ========================================================= */

export const ensureSystemRolesController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const roles =
        await ensureSystemRolesService();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "System roles ensured successfully.",

          data: {
            roles,
          },
        });
    } catch (error) {
      return next(error);
    }
  };