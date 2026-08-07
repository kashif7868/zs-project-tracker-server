import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../../models/user/user.model.js";
import Role from "../../models/roles/role.model.js";

import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateToken.js";

import sendEmail from "../../services/email.service.js";

import passwordResetTemplate from "../../templates/email/passwordReset.template.js";

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  message,
  statusCode = 500
) => {
  const error = new Error(
    message
  );

  error.statusCode =
    statusCode;

  return error;
};

/* =========================================================
   BASIC NORMALIZERS
   ========================================================= */

const normalizeRoleSlug = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );
};

/* =========================================================
   ROLE ACCESS RESOLVER

   System roles:

   admin
   super_admin

   Existing full access is preserved.

   Custom roles are resolved from the Role collection.
   ========================================================= */

const resolveUserRoleAccess =
  async (
    user,
    {
      requireAssignedRole = false,
    } = {}
  ) => {
    const roleSlug =
      normalizeRoleSlug(
        user?.role
      ) || "user";

    /* =====================================================
       NEWLY REGISTERED / UNASSIGNED USER
       ===================================================== */

    if (
      roleSlug ===
      "user"
    ) {
      if (
        requireAssignedRole
      ) {
        throw createServiceError(
          "Your account is registered, but no dashboard Role has been assigned yet. Please contact an Administrator.",
          403
        );
      }

      return {
        roleSlug:
          "user",

        roleDetails:
          null,

        permissions:
          [],
      };
    }

    /* =====================================================
       SYSTEM ROLES
       ===================================================== */

    if (
      roleSlug ===
        "admin" ||
      roleSlug ===
        "super_admin"
    ) {
      return {
        roleSlug,

        roleDetails: {
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
        },

        permissions: [
          "*",
        ],
      };
    }

    /* =====================================================
       DYNAMIC CUSTOM ROLE
       ===================================================== */

    const role =
      await Role.findOne({
        slug:
          roleSlug,
      })
        .select(
          "name slug description permissions isSystemRole status"
        )
        .lean();

    if (!role) {
      if (
        requireAssignedRole
      ) {
        throw createServiceError(
          "Your assigned Role no longer exists. Please contact an Administrator.",
          403
        );
      }

      return {
        roleSlug,

        roleDetails:
          null,

        permissions:
          [],
      };
    }

    if (
      role.status !==
      "active"
    ) {
      if (
        requireAssignedRole
      ) {
        throw createServiceError(
          "Your assigned Role is inactive. Please contact an Administrator.",
          403
        );
      }

      return {
        roleSlug,

        roleDetails:
          role,

        permissions:
          [],
      };
    }

    return {
      roleSlug,

      roleDetails:
        role,

      permissions:
        Array.isArray(
          role.permissions
        )
          ? role.permissions
          : [],
    };
  };

/* =========================================================
   SAFE USER RESPONSE
   ========================================================= */

const getSafeUserData = (
  user,
  roleAccess
) => {
  const roleSlug =
    roleAccess?.roleSlug ||
    normalizeRoleSlug(
      user?.role
    ) ||
    "user";

  return {
    id:
      user._id,

    name:
      user.name,

    email:
      user.email,

    phone:
      user.phone,

    countryCode:
      user.countryCode,

    role:
      roleSlug,

    roleDetails:
      roleAccess?.roleDetails ||
      null,

    permissions:
      roleAccess?.permissions ||
      [],

    roleAssignedBy:
      user.roleAssignedBy ||
      null,

    roleAssignedAt:
      user.roleAssignedAt ||
      null,

    avatar:
      user.avatar,

    provider:
      user.provider,

    /*
      Kept in API response for backward compatibility.

      Email verification is no longer required for
      Project Tracker authentication.
    */
    isVerified:
      user.isVerified,

    isPhoneVerified:
      user.isPhoneVerified,

    is2FAEnabled:
      user.is2FAEnabled,

    status:
      user.status,

    createdAt:
      user.createdAt,

    updatedAt:
      user.updatedAt,
  };
};

/* =========================================================
   TOKEN HASH
   ========================================================= */

const hashToken = (
  token
) => {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      token
    )
    .digest(
      "hex"
    );
};

/* =========================================================
   REGISTER

   Email verification is disabled.

   New users are treated as verified immediately.

   New user remains:

   role: user

   Administrator still assigns a dashboard Role before the
   user can access the protected Project Tracker dashboard.
   ========================================================= */

export const registerService =
  async (
    userData
  ) => {
    const {
      name,
      email,
      password,
      phone,
      countryCode,
    } = userData;

    const normalizedEmail =
      email
        .toLowerCase()
        .trim();

    const existingUser =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (
      existingUser
    ) {
      throw createServiceError(
        "Email already exists.",
        409
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const user =
      await User.create({
        name:
          name.trim(),

        email:
          normalizedEmail,

        password:
          hashedPassword,

        phone:
          phone || "",

        countryCode:
          countryCode || "",

        role:
          "user",

        provider:
          "local",

        /*
          No email verification step is required.

          New local users are considered verified
          immediately.
        */
        isVerified:
          true,

        /*
          Clear legacy verification fields.
        */
        emailVerificationToken:
          "",

        emailVerificationExpires:
          null,
      });

    const roleAccess =
      await resolveUserRoleAccess(
        user
      );

    return {
      success:
        true,

      message:
        "User registered successfully. An Administrator must assign a dashboard Role before login.",

      /*
        Kept so existing frontend code expecting this
        property does not break.
      */
      emailVerification: {
        required:
          false,

        sent:
          false,
      },

      user:
        getSafeUserData(
          user,
          roleAccess
        ),
    };
  };

/* =========================================================
   LOGIN

   Requirements:

   active account
   local provider
   correct password
   assigned active dashboard Role

   Email verification is NOT required.
   ========================================================= */

export const loginService =
  async ({
    email,
    password,
  }) => {
    const normalizedEmail =
      email
        .toLowerCase()
        .trim();

    const user =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (!user) {
      throw createServiceError(
        "Invalid email or password.",
        401
      );
    }

    /* =====================================================
       ACCOUNT STATUS
       ===================================================== */

    if (
      user.status ===
      "blocked"
    ) {
      throw createServiceError(
        "Your account has been blocked.",
        403
      );
    }

    if (
      user.status ===
      "inactive"
    ) {
      throw createServiceError(
        "Your account is inactive.",
        403
      );
    }

    if (
      user.status !==
      "active"
    ) {
      throw createServiceError(
        "Your account is not active.",
        403
      );
    }

    /* =====================================================
       PROVIDER
       ===================================================== */

    if (
      user.provider !==
      "local"
    ) {
      throw createServiceError(
        `Please login with ${user.provider}.`,
        400
      );
    }

    /* =====================================================
       EMAIL VERIFICATION

       Intentionally not checked.

       Both existing isVerified:false users and newly
       registered users may continue to login.
       ===================================================== */

    /* =====================================================
       PASSWORD
       ===================================================== */

    const isPasswordMatched =
      await bcrypt.compare(
        password,
        user.password
      );

    if (
      !isPasswordMatched
    ) {
      throw createServiceError(
        "Invalid email or password.",
        401
      );
    }

    /* =====================================================
       ROLE ACCESS

       User receives tokens only after an active dashboard
       Role has been assigned.
       ===================================================== */

    const roleAccess =
      await resolveUserRoleAccess(
        user,
        {
          requireAssignedRole:
            true,
        }
      );

    /* =====================================================
       TOKENS
       ===================================================== */

    const accessToken =
      generateAccessToken(
        user._id
      );

    const refreshToken =
      generateRefreshToken(
        user._id
      );

    user.refreshToken =
      refreshToken;

    await user.save();

    return {
      success:
        true,

      message:
        "Login successful.",

      accessToken,

      refreshToken,

      user:
        getSafeUserData(
          user,
          roleAccess
        ),
    };
  };

/* =========================================================
   PROFILE
   ========================================================= */

export const profileService =
  async (
    user
  ) => {
    const roleAccess =
      await resolveUserRoleAccess(
        user
      );

    return {
      success:
        true,

      message:
        "Profile fetched successfully.",

      user:
        getSafeUserData(
          user,
          roleAccess
        ),
    };
  };

/* =========================================================
   LOGOUT
   ========================================================= */

export const logoutService =
  async (
    userId
  ) => {
    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw createServiceError(
        "User not found.",
        404
      );
    }

    user.refreshToken =
      "";

    await user.save();

    return {
      success:
        true,

      message:
        "Logout successful.",
    };
  };

/* =========================================================
   REFRESH TOKEN

   Assigned Role is rechecked on every refresh.

   Email verification is NOT required.
   ========================================================= */

export const refreshTokenService =
  async (
    refreshToken
  ) => {
    let decoded;

    try {
      decoded =
        jwt.verify(
          refreshToken,
          process.env
            .JWT_REFRESH_SECRET
        );
    } catch {
      throw createServiceError(
        "Invalid or expired refresh token.",
        401
      );
    }

    if (
      !decoded ||
      typeof decoded !==
        "object" ||
      !decoded.userId
    ) {
      throw createServiceError(
        "Invalid refresh token payload.",
        401
      );
    }

    const user =
      await User.findById(
        decoded.userId
      );

    if (!user) {
      throw createServiceError(
        "User not found.",
        401
      );
    }

    /* =====================================================
       ACCOUNT STATUS
       ===================================================== */

    if (
      user.status !==
      "active"
    ) {
      throw createServiceError(
        "User account is not active.",
        403
      );
    }

    /* =====================================================
       EMAIL VERIFICATION

       Intentionally not checked.
       ===================================================== */

    /* =====================================================
       STORED REFRESH TOKEN
       ===================================================== */

    if (
      !user.refreshToken ||
      user.refreshToken !==
        refreshToken
    ) {
      throw createServiceError(
        "Refresh token is invalid or already used.",
        401
      );
    }

    /* =====================================================
       ROLE ACCESS
       ===================================================== */

    const roleAccess =
      await resolveUserRoleAccess(
        user,
        {
          requireAssignedRole:
            true,
        }
      );

    /* =====================================================
       TOKEN ROTATION
       ===================================================== */

    const newAccessToken =
      generateAccessToken(
        user._id
      );

    const newRefreshToken =
      generateRefreshToken(
        user._id
      );

    user.refreshToken =
      newRefreshToken;

    await user.save();

    return {
      success:
        true,

      message:
        "Token refreshed successfully.",

      accessToken:
        newAccessToken,

      refreshToken:
        newRefreshToken,

      user:
        getSafeUserData(
          user,
          roleAccess
        ),
    };
  };

/* =========================================================
   CHANGE PASSWORD
   ========================================================= */

export const changePasswordService =
  async (
    userId,
    oldPassword,
    newPassword
  ) => {
    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw createServiceError(
        "User not found.",
        404
      );
    }

    if (
      user.provider !==
      "local"
    ) {
      throw createServiceError(
        "Password change is only available for local accounts.",
        400
      );
    }

    const isPasswordMatched =
      await bcrypt.compare(
        oldPassword,
        user.password
      );

    if (
      !isPasswordMatched
    ) {
      throw createServiceError(
        "Old password is incorrect.",
        400
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    user.password =
      hashedPassword;

    /*
      Existing sessions become invalid after password change.
    */
    user.refreshToken =
      "";

    await user.save();

    return {
      success:
        true,

      message:
        "Password changed successfully. Please login again.",
    };
  };

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

export const forgotPasswordService =
  async (
    email
  ) => {
    const normalizedEmail =
      email
        .toLowerCase()
        .trim();

    const user =
      await User.findOne({
        email:
          normalizedEmail,
      });

    /*
      Do not expose whether the email address exists.
    */
    if (!user) {
      return {
        success:
          true,

        message:
          "If an account exists with this email, a password reset link has been sent.",
      };
    }

    if (
      user.provider !==
      "local"
    ) {
      throw createServiceError(
        `Password reset is only available for local accounts. Please login with ${user.provider}.`,
        400
      );
    }

    const resetToken =
      crypto
        .randomBytes(32)
        .toString(
          "hex"
        );

    const hashedResetToken =
      hashToken(
        resetToken
      );

    const expiresInMinutes =
      Number(
        process.env
          .PASSWORD_RESET_EXPIRES_IN_MINUTES ||
          10
      );

    user.passwordResetToken =
      hashedResetToken;

    user.passwordResetExpires =
      Date.now() +
      expiresInMinutes *
        60 *
        1000;

    await user.save();

    const frontendUrl =
      process.env
        .FRONTEND_URL ||
      "http://localhost:5173";

    const resetUrl =
      `${frontendUrl}/reset-password/${resetToken}`;

    const emailTemplate =
      passwordResetTemplate({
        name:
          user.name,

        resetUrl,

        resetToken,

        expiresInMinutes,
      });

    try {
      await sendEmail({
        to:
          user.email,

        subject:
          emailTemplate.subject,

        text:
          emailTemplate.text,

        html:
          emailTemplate.html,
      });
    } catch {
      /*
        Reset invalidation if sending fails.
      */
      user.passwordResetToken =
        "";

      user.passwordResetExpires =
        null;

      await user.save();

      throw createServiceError(
        "Password reset email could not be sent.",
        500
      );
    }

    const response = {
      success:
        true,

      message:
        "Password reset email sent successfully.",
    };

    if (
      process.env
        .NODE_ENV ===
      "development"
    ) {
      response.resetToken =
        resetToken;

      response.resetUrl =
        resetUrl;
    }

    return response;
  };

/* =========================================================
   RESET PASSWORD
   ========================================================= */

export const resetPasswordService =
  async (
    token,
    newPassword
  ) => {
    if (!token) {
      throw createServiceError(
        "Reset token is required.",
        400
      );
    }

    const hashedResetToken =
      hashToken(
        token
      );

    const user =
      await User.findOne({
        passwordResetToken:
          hashedResetToken,

        passwordResetExpires: {
          $gt:
            Date.now(),
        },
      });

    if (!user) {
      throw createServiceError(
        "Invalid or expired reset token.",
        400
      );
    }

    if (
      user.provider !==
      "local"
    ) {
      throw createServiceError(
        "Password reset is only available for local accounts.",
        400
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    user.password =
      hashedPassword;

    user.passwordResetToken =
      "";

    user.passwordResetExpires =
      null;

    /*
      Force existing refresh token/session to expire.
    */
    user.refreshToken =
      "";

    await user.save();

    return {
      success:
        true,

      message:
        "Password reset successfully. Please login with your new password.",
    };
  };

/* =========================================================
   VERIFY EMAIL

   Email verification has been disabled for Project Tracker.

   This service remains exported only so older frontend/API
   references do not break.
   ========================================================= */

export const verifyEmailService =
  async () => {
    return {
      success:
        true,

      message:
        "Email verification is not required for Project Tracker.",
    };
  };

/* =========================================================
   RESEND VERIFICATION EMAIL

   Email verification has been disabled.

   No verification email is sent.

   Kept only for backward API compatibility.
   ========================================================= */

export const resendVerificationEmailService =
  async () => {
    return {
      success:
        true,

      message:
        "Email verification is not required for Project Tracker.",
    };
  };