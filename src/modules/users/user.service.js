import mongoose from "mongoose";

import User from "../../models/user/user.model.js";
import Role from "../../models/roles/role.model.js";

import {
  deleteUploadedAvatar,
} from "../../utils/multer.js";

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
   CONSTANTS
   ========================================================= */

const USER_STATUSES = [
  "active",
  "inactive",
  "blocked",
];

/*
  Avatar generic profile update se change nahi hogi.

  Actual avatar upload ke liye dedicated service aur endpoint
  use hoga.
*/

const ALLOWED_USER_UPDATE_FIELDS = [
  "name",
  "email",
  "phone",
  "countryCode",
];

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  message,
  statusCode = 500
) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

/* =========================================================
   STRING HELPERS
   ========================================================= */

const normalizeString = (
  value
) => {
  return typeof value === "string"
    ? value.trim()
    : "";
};

const normalizeRoleSlug = (
  value
) => {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const escapeRegExp = (
  value
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

/* =========================================================
   CURRENT ACTOR HELPERS
   ========================================================= */

const getActorUserId = (
  actorUser
) => {
  return (
    actorUser?._id ||
    actorUser?.id ||
    actorUser?.userId ||
    null
  );
};

const getActorRoleSlug = (
  actorUser
) => {
  const role = actorUser?.role;

  if (
    typeof role === "string"
  ) {
    return normalizeRoleSlug(
      role
    );
  }

  if (
    role &&
    typeof role === "object" &&
    typeof role.slug === "string"
  ) {
    return normalizeRoleSlug(
      role.slug
    );
  }

  if (
    typeof actorUser?.roleSlug ===
    "string"
  ) {
    return normalizeRoleSlug(
      actorUser.roleSlug
    );
  }

  return "";
};

const ensureUserManager = (
  actorUser
) => {
  const actorRole =
    getActorRoleSlug(
      actorUser
    );

  if (
    ![
      "admin",
      "super_admin",
    ].includes(actorRole)
  ) {
    throw createServiceError(
      "Only Admin or Super Admin can manage users.",
      403
    );
  }

  return actorRole;
};

/* =========================================================
   USER RESPONSE WITH ROLE DETAILS
   ========================================================= */

const attachRoleDetails = async (
  userRecord
) => {
  const user =
    typeof userRecord?.toObject ===
    "function"
      ? userRecord.toObject()
      : {
          ...userRecord,
        };

  const roleSlug =
    normalizeRoleSlug(
      user.role
    );

  if (
    !roleSlug ||
    roleSlug === "user"
  ) {
    return {
      ...user,

      role:
        roleSlug || "user",

      roleDetails: null,

      permissions: [],
    };
  }

  const role =
    await Role.findOne({
      slug: roleSlug,
    })
      .select(
        "name slug description permissions isSystemRole status"
      )
      .lean();

  /*
    Existing system-role accounts ko wildcard access response
    mein bhi preserve karna hai, even when Role collection
    document abhi create na hua ho.
  */

  if (
    !role &&
    (
      roleSlug === "admin" ||
      roleSlug === "super_admin"
    )
  ) {
    return {
      ...user,

      role: roleSlug,

      roleDetails: {
        name:
          roleSlug === "super_admin"
            ? "Super Admin"
            : "Admin",

        slug: roleSlug,

        description:
          roleSlug === "super_admin"
            ? "Complete system access."
            : "Administrative system access.",

        permissions: ["*"],

        isSystemRole: true,

        status: "active",
      },

      permissions: ["*"],
    };
  }

  return {
    ...user,

    role: roleSlug,

    roleDetails:
      role || null,

    permissions:
      role?.status === "active"
        ? role.permissions || []
        : [],
  };
};

/* =========================================================
   ATTACH ROLE DETAILS TO USER LIST
   ========================================================= */

const attachRolesToUsers = async (
  userRecords
) => {
  const users =
    userRecords.map(
      (userRecord) =>
        typeof userRecord?.toObject ===
        "function"
          ? userRecord.toObject()
          : {
              ...userRecord,
            }
    );

  const roleSlugs = [
    ...new Set(
      users
        .map((user) =>
          normalizeRoleSlug(
            user.role
          )
        )
        .filter(
          (roleSlug) =>
            roleSlug &&
            roleSlug !== "user"
        )
    ),
  ];

  const roles =
    roleSlugs.length > 0
      ? await Role.find({
          slug: {
            $in: roleSlugs,
          },
        })
          .select(
            "name slug description permissions isSystemRole status"
          )
          .lean()
      : [];

  const roleMap =
    new Map(
      roles.map((role) => [
        role.slug,
        role,
      ])
    );

  return users.map((user) => {
    const roleSlug =
      normalizeRoleSlug(
        user.role
      ) || "user";

    let roleDetails =
      roleMap.get(roleSlug) ||
      null;

    let permissions =
      roleDetails?.status === "active"
        ? roleDetails.permissions || []
        : [];

    if (
      !roleDetails &&
      (
        roleSlug === "admin" ||
        roleSlug === "super_admin"
      )
    ) {
      roleDetails = {
        name:
          roleSlug === "super_admin"
            ? "Super Admin"
            : "Admin",

        slug: roleSlug,

        description:
          roleSlug === "super_admin"
            ? "Complete system access."
            : "Administrative system access.",

        permissions: ["*"],

        isSystemRole: true,

        status: "active",
      };

      permissions = ["*"];
    }

    return {
      ...user,

      role: roleSlug,

      roleDetails,

      permissions,
    };
  });
};

/* =========================================================
   FIND USER OR THROW
   ========================================================= */

const findUserOrThrow = async (
  userId
) => {
  if (
    !mongoose.isValidObjectId(
      userId
    )
  ) {
    throw createServiceError(
      "User ID is invalid.",
      400
    );
  }

  const user =
    await User.findById(
      userId
    ).select(
      USER_SELECT_FIELDS
    );

  if (!user) {
    throw createServiceError(
      "User not found.",
      404
    );
  }

  return user;
};

/* =========================================================
   FIND ACTIVE ROLE
   ========================================================= */

const findActiveRoleOrThrow =
  async (
    roleIdentifier
  ) => {
    const normalizedIdentifier =
      normalizeString(
        roleIdentifier
      );

    if (!normalizedIdentifier) {
      throw createServiceError(
        "Role is required.",
        400
      );
    }

    const roleQuery =
      mongoose.isValidObjectId(
        normalizedIdentifier
      )
        ? {
            _id:
              normalizedIdentifier,
          }
        : {
            slug:
              normalizeRoleSlug(
                normalizedIdentifier
              ),
          };

    const role =
      await Role.findOne(
        roleQuery
      );

    if (!role) {
      throw createServiceError(
        "Selected Role was not found.",
        404
      );
    }

    if (
      role.status !== "active"
    ) {
      throw createServiceError(
        "Selected Role is inactive.",
        409
      );
    }

    return role;
  };

/* =========================================================
   CLEAN PROFILE UPDATE

   Avatar dedicated upload endpoint se manage hogi.
   ========================================================= */

const cleanUpdateData = (
  updateData = {}
) => {
  const cleanedData = {};

  ALLOWED_USER_UPDATE_FIELDS.forEach(
    (field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          field
        )
      ) {
        cleanedData[field] =
          updateData[field];
      }
    }
  );

  if (
    typeof cleanedData.name ===
    "string"
  ) {
    cleanedData.name =
      cleanedData.name
        .trim()
        .replace(/\s+/g, " ");
  }

  if (
    typeof cleanedData.email ===
    "string"
  ) {
    cleanedData.email =
      cleanedData.email
        .trim()
        .toLowerCase();
  }

  if (
    typeof cleanedData.phone ===
    "string"
  ) {
    cleanedData.phone =
      cleanedData.phone.trim();
  }

  if (
    typeof cleanedData.countryCode ===
    "string"
  ) {
    cleanedData.countryCode =
      cleanedData.countryCode.trim();
  }

  return cleanedData;
};

/* =========================================================
   GET ALL USERS
   ========================================================= */

export const getAllUsersService =
  async (
    query = {}
  ) => {
    const filter = {};

    const search =
      normalizeString(
        query.search
      );

    const role =
      normalizeRoleSlug(
        query.role
      );

    const status =
      normalizeString(
        query.status
      ).toLowerCase();

    if (role) {
      filter.role = role;
    }

    if (
      USER_STATUSES.includes(
        status
      )
    ) {
      filter.status = status;
    }

    if (
      query.isVerified === true ||
      query.isVerified === "true"
    ) {
      filter.isVerified = true;
    }

    if (
      query.isVerified === false ||
      query.isVerified === "false"
    ) {
      filter.isVerified = false;
    }

    if (search) {
      const searchPattern =
        new RegExp(
          escapeRegExp(search),
          "i"
        );

      filter.$or = [
        {
          name: searchPattern,
        },
        {
          email: searchPattern,
        },
        {
          phone: searchPattern,
        },
        {
          role: searchPattern,
        },
      ];
    }

    const userRecords =
      await User.find(filter)
        .select(
          USER_SELECT_FIELDS
        )
        .sort({
          createdAt: -1,
        });

    const users =
      await attachRolesToUsers(
        userRecords
      );

    return {
      success: true,

      message:
        "Users fetched successfully.",

      count:
        users.length,

      users,
    };
  };

/* =========================================================
   GET USER BY ID
   ========================================================= */

export const getUserByIdService =
  async (
    userId
  ) => {
    const user =
      await findUserOrThrow(
        userId
      );

    const normalizedUser =
      await attachRoleDetails(
        user
      );

    return {
      success: true,

      message:
        "User fetched successfully.",

      user:
        normalizedUser,
    };
  };

/* =========================================================
   UPDATE USER PROFILE
   ========================================================= */

export const updateUserService =
  async (
    userId,
    updateData
  ) => {
    const cleanedData =
      cleanUpdateData(
        updateData
      );

    if (
      Object.keys(
        cleanedData
      ).length === 0
    ) {
      throw createServiceError(
        "No valid user fields were provided for update.",
        400
      );
    }

    if (
      cleanedData.email
    ) {
      const existingUser =
        await User.findOne({
          email:
            cleanedData.email,

          _id: {
            $ne: userId,
          },
        }).select("_id");

      if (existingUser) {
        throw createServiceError(
          "Email already exists.",
          409
        );
      }
    }

    const user =
      await User.findByIdAndUpdate(
        userId,
        {
          $set:
            cleanedData,
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(
        USER_SELECT_FIELDS
      );

    if (!user) {
      throw createServiceError(
        "User not found.",
        404
      );
    }

    const normalizedUser =
      await attachRoleDetails(
        user
      );

    return {
      success: true,

      message:
        "User updated successfully.",

      user:
        normalizedUser,
    };
  };

/* =========================================================
   UPLOAD OR REPLACE USER AVATAR

   avatarPath example:

   /uploads/users/avatars/avatar-USER_ID-UUID.webp
   ========================================================= */

export const uploadUserAvatarService =
  async (
    userId,
    avatarPath
  ) => {
    const normalizedAvatarPath =
      normalizeString(
        avatarPath
      );

    if (!normalizedAvatarPath) {
      throw createServiceError(
        "Profile picture is required.",
        400
      );
    }

    const user =
      await findUserOrThrow(
        userId
      );

    const previousAvatar =
      normalizeString(
        user.avatar
      );

    try {
      user.avatar =
        normalizedAvatarPath;

      await user.save();
    } catch (error) {
      /*
        Database update fail ho to newly uploaded avatar
        orphan file nahi banegi.
      */

      await deleteUploadedAvatar(
        normalizedAvatarPath
      );

      throw error;
    }

    /*
      Database successfully update hone ke baad purani local
      avatar remove hogi.
    */

    if (
      previousAvatar &&
      previousAvatar !==
        normalizedAvatarPath
    ) {
      await deleteUploadedAvatar(
        previousAvatar
      );
    }

    const normalizedUser =
      await attachRoleDetails(
        user
      );

    return {
      success: true,

      message:
        previousAvatar
          ? "Profile picture replaced successfully."
          : "Profile picture uploaded successfully.",

      user:
        normalizedUser,
    };
  };

/* =========================================================
   REMOVE USER AVATAR
   ========================================================= */

export const removeUserAvatarService =
  async (
    userId
  ) => {
    const user =
      await findUserOrThrow(
        userId
      );

    const previousAvatar =
      normalizeString(
        user.avatar
      );

    if (!previousAvatar) {
      const normalizedUser =
        await attachRoleDetails(
          user
        );

      return {
        success: true,

        message:
          "Profile picture is already removed.",

        user:
          normalizedUser,
      };
    }

    user.avatar = "";

    await user.save();

    await deleteUploadedAvatar(
      previousAvatar
    );

    const normalizedUser =
      await attachRoleDetails(
        user
      );

    return {
      success: true,

      message:
        "Profile picture removed successfully.",

      user:
        normalizedUser,
    };
  };

/* =========================================================
   ASSIGN ROLE TO USER
   ========================================================= */

export const assignUserRoleService =
  async (
    userId,
    roleIdentifier,
    actorUser
  ) => {
    const actorRole =
      ensureUserManager(
        actorUser
      );

    const user =
      await findUserOrThrow(
        userId
      );

    const selectedRole =
      await findActiveRoleOrThrow(
        roleIdentifier
      );

    if (
      selectedRole.slug ===
        "super_admin" &&
      actorRole !==
        "super_admin"
    ) {
      throw createServiceError(
        "Only Super Admin can assign the Super Admin Role.",
        403
      );
    }

    if (
      user.role ===
        "super_admin" &&
      actorRole !==
        "super_admin"
    ) {
      throw createServiceError(
        "Admin cannot change a Super Admin account.",
        403
      );
    }

    user.role =
      selectedRole.slug;

    user.roleAssignedBy =
      getActorUserId(
        actorUser
      );

    user.roleAssignedAt =
      new Date();

    user.refreshToken = "";

    await user.save();

    const normalizedUser =
      await attachRoleDetails(
        user
      );

    return {
      success: true,

      message:
        `${selectedRole.name} Role assigned successfully.`,

      user:
        normalizedUser,

      role:
        selectedRole.toJSON(),
    };
  };

/* =========================================================
   REMOVE ASSIGNED ROLE
   ========================================================= */

export const removeUserRoleService =
  async (
    userId,
    actorUser
  ) => {
    const actorRole =
      ensureUserManager(
        actorUser
      );

    const user =
      await findUserOrThrow(
        userId
      );

    if (
      user.role ===
      "super_admin"
    ) {
      if (
        actorRole !==
        "super_admin"
      ) {
        throw createServiceError(
          "Admin cannot remove a Super Admin Role.",
          403
        );
      }

      const superAdminCount =
        await User.countDocuments({
          role:
            "super_admin",

          status:
            "active",
        });

      if (
        superAdminCount <= 1
      ) {
        throw createServiceError(
          "The last active Super Admin Role cannot be removed.",
          409
        );
      }
    }

    user.role = "user";

    user.roleAssignedBy =
      getActorUserId(
        actorUser
      );

    user.roleAssignedAt =
      new Date();

    user.refreshToken = "";

    await user.save();

    const normalizedUser =
      await attachRoleDetails(
        user
      );

    return {
      success: true,

      message:
        "Assigned Role removed successfully.",

      user:
        normalizedUser,
    };
  };

/* =========================================================
   UPDATE USER STATUS
   ========================================================= */

export const updateUserStatusService =
  async (
    userId,
    status,
    actorUser
  ) => {
    const actorRole =
      ensureUserManager(
        actorUser
      );

    const normalizedStatus =
      normalizeString(
        status
      ).toLowerCase();

    if (
      !USER_STATUSES.includes(
        normalizedStatus
      )
    ) {
      throw createServiceError(
        "User status must be active, inactive or blocked.",
        400
      );
    }

    const user =
      await findUserOrThrow(
        userId
      );

    if (
      user.role ===
        "super_admin" &&
      actorRole !==
        "super_admin"
    ) {
      throw createServiceError(
        "Admin cannot change a Super Admin account status.",
        403
      );
    }

    const actorUserId =
      getActorUserId(
        actorUser
      );

    if (
      actorUserId &&
      String(actorUserId) ===
        String(user._id) &&
      normalizedStatus !==
        "active"
    ) {
      throw createServiceError(
        "You cannot deactivate or block your own account.",
        409
      );
    }

    if (
      user.role ===
        "super_admin" &&
      normalizedStatus !==
        "active"
    ) {
      const activeSuperAdmins =
        await User.countDocuments({
          role:
            "super_admin",

          status:
            "active",
        });

      if (
        activeSuperAdmins <= 1
      ) {
        throw createServiceError(
          "The last active Super Admin account cannot be deactivated or blocked.",
          409
        );
      }
    }

    user.status =
      normalizedStatus;

    if (
      normalizedStatus !==
      "active"
    ) {
      user.refreshToken = "";
    }

    await user.save();

    const normalizedUser =
      await attachRoleDetails(
        user
      );

    return {
      success: true,

      message:
        `User status changed to ${normalizedStatus}.`,

      user:
        normalizedUser,
    };
  };

/* =========================================================
   DELETE USER
   ========================================================= */

export const deleteUserService =
  async (
    userId,
    actorUser
  ) => {
    const actorRole =
      actorUser
        ? ensureUserManager(
            actorUser
          )
        : "";

    const user =
      await findUserOrThrow(
        userId
      );

    const actorUserId =
      getActorUserId(
        actorUser
      );

    if (
      actorUserId &&
      String(actorUserId) ===
        String(user._id)
    ) {
      throw createServiceError(
        "You cannot delete your own account.",
        409
      );
    }

    if (
      user.role ===
      "super_admin"
    ) {
      if (
        actorRole !==
        "super_admin"
      ) {
        throw createServiceError(
          "Admin cannot delete a Super Admin account.",
          403
        );
      }

      const superAdminCount =
        await User.countDocuments({
          role:
            "super_admin",
        });

      if (
        superAdminCount <= 1
      ) {
        throw createServiceError(
          "The last Super Admin account cannot be deleted.",
          409
        );
      }
    }

    const avatarPath =
      normalizeString(
        user.avatar
      );

    await user.deleteOne();

    if (avatarPath) {
      await deleteUploadedAvatar(
        avatarPath
      );
    }

    return {
      success: true,

      message:
        "User deleted successfully.",

      userId:
        String(user._id),
    };
  };