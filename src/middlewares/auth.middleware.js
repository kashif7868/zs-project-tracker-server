import jwt from "jsonwebtoken";

import User from "../models/user/user.model.js";
import Role from "../models/roles/role.model.js";

/* =========================================================
   SAFE USER FIELDS
   ========================================================= */

const USER_SELECT_FIELDS =
  "-password " +
  "-refreshToken " +
  "-passwordResetToken " +
  "-passwordResetExpires " +
  "-emailVerificationToken " +
  "-emailVerificationExpires " +
  "-phoneVerificationOtp " +
  "-phoneVerificationExpires " +
  "-phoneVerificationAttempts " +
  "-phoneVerificationLastSentAt " +
  "-twoFASecret " +
  "-__v";

/* =========================================================
   ROLE NORMALIZER
   ========================================================= */

const normalizeRoleSlug = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

/* =========================================================
   AUTHENTICATION MIDDLEWARE
   ========================================================= */

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    /* =====================================================
       AUTHORIZATION HEADER
       ===================================================== */

    if (!authHeader) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authorization header is missing.",
        });
    }

    if (
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Authorization format must be Bearer token.",
        });
    }

    const token =
      authHeader
        .slice(7)
        .trim();

    if (!token) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Token is missing.",
        });
    }

    /* =====================================================
       VERIFY ACCESS TOKEN
       ===================================================== */

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    if (
      !decoded ||
      typeof decoded !==
        "object" ||
      !decoded.userId
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Invalid token payload.",
        });
    }

    /* =====================================================
       LOAD USER
       ===================================================== */

    const userDocument =
      await User.findById(
        decoded.userId
      )
        .select(
          USER_SELECT_FIELDS
        )
        .lean();

    if (!userDocument) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "User not found.",
        });
    }

    /* =====================================================
       ACCOUNT STATUS
       ===================================================== */

    if (
      userDocument.status ===
      "blocked"
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Your account has been blocked.",
        });
    }

    if (
      userDocument.status ===
      "inactive"
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Your account is inactive.",
        });
    }

    if (
      userDocument.status !==
      "active"
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "Your account is not active.",
        });
    }

    /* =====================================================
       EMAIL VERIFICATION

       Email verification is intentionally NOT required for
       Project Tracker authentication.

       Existing isVerified database field may remain for
       compatibility or future use, but protected resources
       are not blocked when isVerified is false.
       ===================================================== */

    /* =====================================================
       ROLE RESOLUTION
       ===================================================== */

    const roleSlug =
      normalizeRoleSlug(
        userDocument.role
      ) || "user";

    let roleDetails =
      null;

    let permissions =
      [];

    /* =====================================================
       UNASSIGNED REGISTERED USER

       Admin dashboard se Role assign hone tak protected
       dashboard APIs access nahi hongi.
       ===================================================== */

    if (
      roleSlug ===
      "user"
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "No dashboard Role has been assigned to this account. Please contact an Administrator.",
        });
    }

    /* =====================================================
       SYSTEM ROLES

       Existing Admin/Super Admin full access preserve rahega.
       ===================================================== */

    if (
      roleSlug ===
        "admin" ||
      roleSlug ===
        "super_admin"
    ) {
      roleDetails = {
        name:
          roleSlug ===
          "super_admin"
            ? "Super Admin"
            : "Admin",

        slug:
          roleSlug,

        description:
          roleSlug ===
          "super_admin"
            ? "Complete system access."
            : "Administrative system access.",

        permissions: [
          "*",
        ],

        isSystemRole:
          true,

        status:
          "active",
      };

      permissions = [
        "*",
      ];
    } else {
      /* ===================================================
         DYNAMIC CUSTOM ROLE
         =================================================== */

      const assignedRole =
        await Role.findOne({
          slug:
            roleSlug,
        })
          .select(
            "name slug description permissions isSystemRole status"
          )
          .lean();

      if (
        !assignedRole
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Your assigned Role no longer exists. Please contact an Administrator.",
          });
      }

      if (
        assignedRole.status !==
        "active"
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Your assigned Role is inactive. Please contact an Administrator.",
          });
      }

      roleDetails =
        assignedRole;

      permissions =
        Array.isArray(
          assignedRole.permissions
        )
          ? assignedRole.permissions
          : [];
    }

    /* =====================================================
       ATTACH AUTHENTICATED USER

       Existing properties preserve:

       req.user._id
       req.user.role

       Additional properties:

       req.user.roleDetails
       req.user.permissions
       req.auth
       ===================================================== */

    req.user = {
      ...userDocument,

      role:
        roleSlug,

      roleDetails,

      permissions,
    };

    req.auth = {
      userId:
        String(
          userDocument._id
        ),

      role:
        roleSlug,

      permissions,

      roleDetails,
    };

    return next();
  } catch (error) {
    /* =====================================================
       JWT ERRORS
       ===================================================== */

    if (
      error?.name ===
      "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Token expired.",
        });
    }

    if (
      error?.name ===
      "JsonWebTokenError"
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Invalid token.",
        });
    }

    if (
      error?.name ===
      "NotBeforeError"
    ) {
      return res
        .status(401)
        .json({
          success: false,

          message:
            "Token is not active yet.",
        });
    }

    console.error(
      "Authentication middleware error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Authentication could not be completed.",
      });
  }
};

export default authMiddleware;