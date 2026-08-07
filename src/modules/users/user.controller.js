import {
  assignUserRoleService,
  deleteUserService,
  getAllUsersService,
  getUserByIdService,
  removeUserAvatarService,
  removeUserRoleService,
  updateUserService,
  updateUserStatusService,
  uploadUserAvatarService,
} from "./user.service.js";

import {
  validateMongoId,
  validateUpdateUserInput,
} from "./user.validation.js";

import {
  deleteUploadedAvatar,
  getUploadedAvatarPath,
} from "../../utils/multer.js";

/* =========================================================
   ROLE HELPERS
   ========================================================= */

const getUserRoleSlug = (
  user
) => {
  if (
    typeof user?.role ===
    "string"
  ) {
    return user.role
      .trim()
      .toLowerCase();
  }

  if (
    user?.role &&
    typeof user.role ===
      "object" &&
    typeof user.role.slug ===
      "string"
  ) {
    return user.role.slug
      .trim()
      .toLowerCase();
  }

  if (
    typeof user?.roleSlug ===
    "string"
  ) {
    return user.roleSlug
      .trim()
      .toLowerCase();
  }

  return "";
};

const isAdminUser = (
  user
) => {
  return [
    "admin",
    "super_admin",
  ].includes(
    getUserRoleSlug(user)
  );
};

/* =========================================================
   CURRENT USER ID
   ========================================================= */

const getLoggedInUserId = (
  user
) => {
  return String(
    user?._id ||
      user?.id ||
      user?.userId ||
      ""
  );
};

/* =========================================================
   USER ACCESS CHECK
   ========================================================= */

const canAccessUserAccount = (
  req,
  userId
) => {
  const loggedInUserId =
    getLoggedInUserId(
      req.user
    );

  const isOwnAccount =
    loggedInUserId ===
    String(userId);

  return (
    isOwnAccount ||
    isAdminUser(req.user)
  );
};

/* =========================================================
   USER ID VALIDATION
   ========================================================= */

const validateUserIdOrRespond = (
  userId,
  res
) => {
  const validationError =
    validateMongoId(userId);

  if (!validationError) {
    return true;
  }

  res.status(400).json({
    success: false,
    message:
      validationError,
  });

  return false;
};

/* =========================================================
   CLEAN TEMPORARY AVATAR

   Multer file save kar chuka ho aur controller validation
   fail ho jaye to orphan image remove hogi.
   ========================================================= */

const cleanupRequestAvatar =
  async (
    req
  ) => {
    const avatarPath =
      getUploadedAvatarPath(
        req
      );

    if (!avatarPath) {
      return false;
    }

    return deleteUploadedAvatar(
      avatarPath
    );
  };

/* =========================================================
   GET ALL USERS

   GET /api/v1/users
   ========================================================= */

export const getAllUsersController =
  async (
    req,
    res,
    next
  ) => {
    try {
      if (
        !isAdminUser(
          req.user
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "Only Admin or Super Admin can view registered users.",
          });
      }

      const response =
        await getAllUsersService(
          req.query
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   GET USER BY ID

   Own account or Admin/Super Admin.

   GET /api/v1/users/:id
   ========================================================= */

export const getUserByIdController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        return;
      }

      if (
        !canAccessUserAccount(
          req,
          id
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Access denied.",
          });
      }

      const response =
        await getUserByIdService(
          id
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE USER PROFILE

   Own account or Admin/Super Admin.

   Role, status and avatar separate endpoints se manage
   honge.

   PATCH /api/v1/users/:id
   ========================================================= */

export const updateUserController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        return;
      }

      const bodyValidationError =
        validateUpdateUserInput(
          req.body
        );

      if (
        bodyValidationError
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              bodyValidationError,
          });
      }

      if (
        !canAccessUserAccount(
          req,
          id
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "Access denied.",
          });
      }

      const isAdmin =
        isAdminUser(
          req.user
        );

      const updateData = {
        ...req.body,
      };

      /*
        Role management
      */

      delete updateData.role;
      delete updateData.roleSlug;
      delete updateData.roleId;

      /*
        Status and verification
      */

      delete updateData.status;

      delete updateData.isVerified;
      delete updateData.isPhoneVerified;
      delete updateData.is2FAEnabled;

      /*
        Authentication fields
      */

      delete updateData.password;
      delete updateData.refreshToken;

      delete updateData.twoFASecret;

      delete updateData.passwordResetToken;
      delete updateData.passwordResetExpires;

      delete updateData.emailVerificationToken;
      delete updateData.emailVerificationExpires;

      /*
        Avatar dedicated multipart endpoint se upload hogi.
      */

      delete updateData.avatar;

      /*
        Normal user apna email generic profile endpoint se
        update nahi kar sakta.
      */

      if (!isAdmin) {
        delete updateData.email;
      }

      const response =
        await updateUserService(
          id,
          updateData
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPLOAD OR REPLACE USER AVATAR

   multipart/form-data

   Field name:

   avatar

   Own account or Admin/Super Admin.

   PATCH /api/v1/users/:id/avatar
   ========================================================= */

export const uploadUserAvatarController =
  async (
    req,
    res,
    next
  ) => {
    let avatarServiceStarted =
      false;

    try {
      const { id } =
        req.params;

      /*
        Multer controller se pehle file disk par save karta hai.
        Invalid ID par uploaded file cleanup karna zaroori hai.
      */

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        await cleanupRequestAvatar(
          req
        );

        return;
      }

      if (
        !canAccessUserAccount(
          req,
          id
        )
      ) {
        await cleanupRequestAvatar(
          req
        );

        return res
          .status(403)
          .json({
            success: false,
            message:
              "You are not allowed to update this profile picture.",
          });
      }

      const avatarPath =
        getUploadedAvatarPath(
          req
        );

      if (!avatarPath) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              'Profile picture is required using the field name "avatar".',
          });
      }

      /*
        Pehle user confirm karte hain taake non-existing user ke
        liye uploaded file orphan na rahe.
      */

      try {
        await getUserByIdService(
          id
        );
      } catch (userError) {
        await cleanupRequestAvatar(
          req
        );

        throw userError;
      }

      avatarServiceStarted =
        true;

      const response =
        await uploadUserAvatarService(
          id,
          avatarPath
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      /*
        Service start hone se pehle failure hua ho to controller
        temporary upload cleanup karega.

        Service database failure par apni uploaded file khud
        cleanup karti hai.
      */

      if (
        !avatarServiceStarted
      ) {
        await cleanupRequestAvatar(
          req
        );
      }

      return next(error);
    }
  };

/* =========================================================
   REMOVE USER AVATAR

   Own account or Admin/Super Admin.

   DELETE /api/v1/users/:id/avatar
   ========================================================= */

export const removeUserAvatarController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        return;
      }

      if (
        !canAccessUserAccount(
          req,
          id
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,

            message:
              "You are not allowed to remove this profile picture.",
          });
      }

      const response =
        await removeUserAvatarService(
          id
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   ASSIGN DYNAMIC ROLE

   PATCH /api/v1/users/:id/role
   ========================================================= */

export const assignUserRoleController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        return;
      }

      const roleIdentifier =
        req.body?.roleId ||
        req.body?.roleSlug ||
        req.body?.role;

      if (
        typeof roleIdentifier !==
          "string" ||
        !roleIdentifier.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Role ID or Role slug is required.",
          });
      }

      const response =
        await assignUserRoleService(
          id,
          roleIdentifier,
          req.user
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   REMOVE ASSIGNED ROLE

   DELETE /api/v1/users/:id/role
   ========================================================= */

export const removeUserRoleController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        return;
      }

      const response =
        await removeUserRoleService(
          id,
          req.user
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   UPDATE USER STATUS

   PATCH /api/v1/users/:id/status
   ========================================================= */

export const updateUserStatusController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        return;
      }

      const status =
        typeof req.body?.status ===
          "string"
          ? req.body.status
              .trim()
              .toLowerCase()
          : "";

      if (
        ![
          "active",
          "inactive",
          "blocked",
        ].includes(status)
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "User status must be active, inactive or blocked.",
          });
      }

      const response =
        await updateUserStatusService(
          id,
          status,
          req.user
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };

/* =========================================================
   DELETE USER

   DELETE /api/v1/users/:id
   ========================================================= */

export const deleteUserController =
  async (
    req,
    res,
    next
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !validateUserIdOrRespond(
          id,
          res
        )
      ) {
        return;
      }

      const response =
        await deleteUserService(
          id,
          req.user
        );

      return res
        .status(200)
        .json(response);
    } catch (error) {
      return next(error);
    }
  };