/* =========================================================
   ROLE NORMALIZER

   Supported structures:

   req.user.role = "admin"

   req.user.role = {
     slug: "admin"
   }

   req.auth.role = "admin"
   ========================================================= */

const getUserRoleSlug = (
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
    typeof req.user
      ?.roleDetails?.slug ===
    "string"
  ) {
    return req.user
      .roleDetails.slug
      .trim()
      .toLowerCase();
  }

  if (
    typeof req.auth?.role ===
    "string"
  ) {
    return req.auth.role
      .trim()
      .toLowerCase();
  }

  return "";
};

/* =========================================================
   PERMISSION NORMALIZER
   ========================================================= */

const getUserPermissions = (
  req
) => {
  const permissions =
    Array.isArray(
      req.user?.permissions
    )
      ? req.user.permissions
      : Array.isArray(
            req.auth?.permissions
          )
        ? req.auth.permissions
        : [];

  return [
    ...new Set(
      permissions
        .filter(
          (permission) =>
            typeof permission ===
            "string"
        )
        .map(
          (permission) =>
            permission
              .trim()
              .toLowerCase()
        )
        .filter(Boolean)
    ),
  ];
};

/* =========================================================
   ROLE MIDDLEWARE

   Existing usage remains valid:

   roleMiddleware(
     "admin",
     "super_admin"
   )
   ========================================================= */

const roleMiddleware =
  (...allowedRoles) =>
  (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication required.",
        });
    }

    const roleSlug =
      getUserRoleSlug(req);

    if (!roleSlug) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "No authorized Role is assigned to this account.",
        });
    }

    const normalizedAllowedRoles =
      allowedRoles
        .filter(
          (role) =>
            typeof role ===
            "string"
        )
        .map(
          (role) =>
            role
              .trim()
              .toLowerCase()
        );

    if (
      !normalizedAllowedRoles.includes(
        roleSlug
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Access denied. You do not have permission to perform this action.",
        });
    }

    return next();
  };

/* =========================================================
   PERMISSION MIDDLEWARE

   Dynamic custom roles ke liye use hoga.

   Example:

   permissionMiddleware(
     "risks.create"
   )

   Multiple permissions dene par user ke paas tamam required
   permissions honi chahiye.

   Admin aur Super Admin ke paas "*" permission hogi,
   is liye unhein full access milega.
   ========================================================= */

export const permissionMiddleware =
  (...requiredPermissions) =>
  (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication required.",
        });
    }

    const permissions =
      getUserPermissions(req);

    if (
      permissions.includes("*")
    ) {
      return next();
    }

    const normalizedRequiredPermissions =
      requiredPermissions
        .filter(
          (permission) =>
            typeof permission ===
            "string"
        )
        .map(
          (permission) =>
            permission
              .trim()
              .toLowerCase()
        )
        .filter(Boolean);

    if (
      normalizedRequiredPermissions
        .length === 0
    ) {
      return next();
    }

    const missingPermissions =
      normalizedRequiredPermissions.filter(
        (permission) =>
          !permissions.includes(
            permission
          )
      );

    if (
      missingPermissions.length >
      0
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Access denied. Your assigned Role does not include the required permission.",

          requiredPermissions:
            normalizedRequiredPermissions,

          missingPermissions,
        });
    }

    return next();
  };

/* =========================================================
   ANY PERMISSION MIDDLEWARE

   User ke paas supplied permissions mein se kam az kam ek
   permission honi chahiye.

   Example:

   anyPermissionMiddleware(
     "risks.update",
     "risks.complete"
   )
   ========================================================= */

export const anyPermissionMiddleware =
  (...acceptedPermissions) =>
  (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authentication required.",
        });
    }

    const permissions =
      getUserPermissions(req);

    if (
      permissions.includes("*")
    ) {
      return next();
    }

    const normalizedPermissions =
      acceptedPermissions
        .filter(
          (permission) =>
            typeof permission ===
            "string"
        )
        .map(
          (permission) =>
            permission
              .trim()
              .toLowerCase()
        )
        .filter(Boolean);

    const hasPermission =
      normalizedPermissions.some(
        (permission) =>
          permissions.includes(
            permission
          )
      );

    if (!hasPermission) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Access denied. Your assigned Role does not include any accepted permission.",

          acceptedPermissions:
            normalizedPermissions,
        });
    }

    return next();
  };

export default roleMiddleware;