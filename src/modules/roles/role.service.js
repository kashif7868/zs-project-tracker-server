import Role, {
  SYSTEM_ROLE_SLUGS,
} from "../../models/roles/role.model.js";

import User from "../../models/user/user.model.js";

/* =========================================================
   CONSTANTS
   ========================================================= */

const ROLE_SORT_FIELDS = [
  "name",
  "slug",
  "status",
  "isSystemRole",
  "createdAt",
  "updatedAt",
];

/* =========================================================
   ERROR HELPER
   ========================================================= */

const createServiceError = (
  message,
  statusCode = 500
) => {
  const error = new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

/* =========================================================
   STRING HELPERS
   ========================================================= */

const escapeRegExp = (
  value
) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const createRoleSlug = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const normalizeRoleName = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ");
};

const normalizeDescription = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
};

const normalizePermissions = (
  permissions
) => {
  if (
    !Array.isArray(
      permissions
    )
  ) {
    return [];
  }

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
   USER ROLE QUERY

   Current User model mein role string hai.

   Future mein role ObjectId reference ho sakti hai.

   Yeh helper dono structures support karega.
   ========================================================= */

const getAssignedUserQuery = (
  role
) => {
  const rolePath =
    User.schema.path("role");

  if (
    rolePath?.instance ===
    "ObjectId"
  ) {
    return {
      role: role._id,
    };
  }

  return {
    role: {
      $in: [
        role.slug,
        String(role._id),
      ],
    },
  };
};

/* =========================================================
   COUNT ASSIGNED USERS
   ========================================================= */

const countAssignedUsers = async (
  role
) => {
  return User.countDocuments(
    getAssignedUserQuery(role)
  );
};

/* =========================================================
   ROLE RESPONSE NORMALIZER
   ========================================================= */

const attachAssignedUserCount =
  async (
    roleRecord
  ) => {
    const assignedUsersCount =
      await countAssignedUsers(
        roleRecord
      );

    return {
      ...roleRecord,

      assignedUsersCount,
    };
  };

/* =========================================================
   FIND ROLE OR THROW
   ========================================================= */

const findRoleOrThrow = async (
  roleId
) => {
  const role =
    await Role.findById(
      roleId
    );

  if (!role) {
    throw createServiceError(
      "Role not found.",
      404
    );
  }

  return role;
};

/* =========================================================
   CHECK DUPLICATE ROLE

   Slug unique hai.

   Name ko bhi case-insensitive basis par duplicate hone se
   roka gaya hai.
   ========================================================= */

const ensureRoleIsUnique =
  async ({
    name,
    slug,
    excludeRoleId,
  }) => {
    const normalizedName =
      normalizeRoleName(name);

    const normalizedSlug =
      createRoleSlug(slug);

    const duplicateFilters =
      [];

    if (normalizedSlug) {
      duplicateFilters.push({
        slug: normalizedSlug,
      });
    }

    if (normalizedName) {
      duplicateFilters.push({
        name: {
          $regex:
            `^${escapeRegExp(
              normalizedName
            )}$`,

          $options: "i",
        },
      });
    }

    if (
      duplicateFilters.length ===
      0
    ) {
      return;
    }

    const query = {
      $or: duplicateFilters,
    };

    if (excludeRoleId) {
      query._id = {
        $ne: excludeRoleId,
      };
    }

    const duplicateRole =
      await Role.findOne(
        query
      ).lean();

    if (!duplicateRole) {
      return;
    }

    if (
      normalizedSlug &&
      duplicateRole.slug ===
        normalizedSlug
    ) {
      throw createServiceError(
        `Role slug ${normalizedSlug} already exists.`,
        409
      );
    }

    throw createServiceError(
      `Role name ${normalizedName} already exists.`,
      409
    );
  };

/* =========================================================
   CREATE ROLE

   Custom roles dashboard se create honge:

   Accountant
   Sales
   Staff
   Electrical Engineer
   Management Team
   ========================================================= */

export const createRoleService =
  async (
    payload,
    actorUserId
  ) => {
    const name =
      normalizeRoleName(
        payload.name
      );

    const slug =
      createRoleSlug(
        payload.slug ||
          payload.name
      );

    if (
      SYSTEM_ROLE_SLUGS.includes(
        slug
      )
    ) {
      throw createServiceError(
        `${slug} is a protected system role.`,
        409
      );
    }

    await ensureRoleIsUnique({
      name,
      slug,
    });

    const role =
      await Role.create({
        name,

        slug,

        description:
          normalizeDescription(
            payload.description
          ),

        permissions:
          normalizePermissions(
            payload.permissions
          ),

        isSystemRole: false,

        status:
          payload.status ||
          "active",

        createdBy:
          actorUserId ||
          null,

        updatedBy:
          actorUserId ||
          null,
      });

    const roleObject =
      role.toObject();

    return attachAssignedUserCount(
      roleObject
    );
  };

/* =========================================================
   GET ROLE LIST

   Supports:

   page
   limit
   search
   status
   isSystemRole
   sortBy
   sortOrder
   ========================================================= */

export const getRolesService =
  async (
    query = {}
  ) => {
    const page =
      Math.max(
        Number(query.page) ||
          1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(query.limit) ||
            20,
          1
        ),
        100
      );

    const skip =
      (page - 1) * limit;

    const filter = {};

    if (
      typeof query.status ===
        "string" &&
      query.status
    ) {
      filter.status =
        query.status;
    }

    if (
      typeof query.isSystemRole ===
      "boolean"
    ) {
      filter.isSystemRole =
        query.isSystemRole;
    }

    const search =
      typeof query.search ===
      "string"
        ? query.search.trim()
        : "";

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
          slug: searchPattern,
        },

        {
          description:
            searchPattern,
        },

        {
          permissions:
            searchPattern,
        },
      ];
    }

    const sortBy =
      ROLE_SORT_FIELDS.includes(
        query.sortBy
      )
        ? query.sortBy
        : "createdAt";

    const sortOrder =
      query.sortOrder === "asc"
        ? 1
        : -1;

    const [
      roleRecords,
      total,
    ] = await Promise.all([
      Role.find(filter)
        .sort({
          [sortBy]:
            sortOrder,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Role.countDocuments(
        filter
      ),
    ]);

    const roles =
      await Promise.all(
        roleRecords.map(
          attachAssignedUserCount
        )
      );

    const totalPages =
      total > 0
        ? Math.ceil(
            total / limit
          )
        : 0;

    return {
      roles,

      pagination: {
        page,
        limit,

        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },
    };
  };

/* =========================================================
   GET ACTIVE ROLES

   User role assignment dropdown mein use hoga.
   ========================================================= */

export const getActiveRolesService =
  async () => {
    const roleRecords =
      await Role.find({
        status: "active",
      })
        .sort({
          isSystemRole: -1,
          name: 1,
        })
        .lean();

    return Promise.all(
      roleRecords.map(
        attachAssignedUserCount
      )
    );
  };

/* =========================================================
   GET SINGLE ROLE
   ========================================================= */

export const getRoleByIdService =
  async (
    roleId
  ) => {
    const role =
      await findRoleOrThrow(
        roleId
      );

    return attachAssignedUserCount(
      role.toObject()
    );
  };

/* =========================================================
   UPDATE ROLE

   System role protection:

   - slug change nahi ho sakta
   - inactive nahi ho sakta
   - system status remove nahi ho sakta

   Description aur permissions update ki ja sakti hain.
   ========================================================= */

export const updateRoleService =
  async (
    roleId,
    payload,
    actorUserId
  ) => {
    const role =
      await findRoleOrThrow(
        roleId
      );

    const currentSlug =
      role.slug;

    const nextName =
      payload.name !==
      undefined
        ? normalizeRoleName(
            payload.name
          )
        : role.name;

    const nextSlug =
      payload.slug !==
      undefined
        ? createRoleSlug(
            payload.slug
          )
        : role.slug;

    if (
      role.isSystemRole &&
      nextSlug !==
        currentSlug
    ) {
      throw createServiceError(
        "System role slug cannot be changed.",
        403
      );
    }

    if (
      role.isSystemRole &&
      payload.status ===
        "inactive"
    ) {
      throw createServiceError(
        "System roles cannot be made inactive.",
        403
      );
    }

    if (
      !role.isSystemRole &&
      SYSTEM_ROLE_SLUGS.includes(
        nextSlug
      )
    ) {
      throw createServiceError(
        `${nextSlug} is a protected system role.`,
        409
      );
    }

    if (
      !role.isSystemRole &&
      nextSlug !==
        currentSlug
    ) {
      const assignedUsersCount =
        await countAssignedUsers(
          role
        );

      if (
        assignedUsersCount > 0
      ) {
        throw createServiceError(
          "Role slug cannot be changed while users are assigned to this role.",
          409
        );
      }
    }

    await ensureRoleIsUnique({
      name: nextName,
      slug: nextSlug,
      excludeRoleId:
        role._id,
    });

    if (
      payload.name !==
      undefined
    ) {
      role.name =
        nextName;
    }

    if (
      payload.slug !==
      undefined
    ) {
      role.slug =
        nextSlug;
    }

    if (
      payload.description !==
      undefined
    ) {
      role.description =
        normalizeDescription(
          payload.description
        );
    }

    if (
      payload.permissions !==
      undefined
    ) {
      role.permissions =
        normalizePermissions(
          payload.permissions
        );
    }

    if (
      payload.status !==
      undefined
    ) {
      role.status =
        payload.status;
    }

    role.updatedBy =
      actorUserId ||
      null;

    await role.save();

    return attachAssignedUserCount(
      role.toObject()
    );
  };

/* =========================================================
   UPDATE ROLE STATUS
   ========================================================= */

export const updateRoleStatusService =
  async (
    roleId,
    status,
    actorUserId
  ) => {
    const role =
      await findRoleOrThrow(
        roleId
      );

    if (
      role.isSystemRole &&
      status === "inactive"
    ) {
      throw createServiceError(
        "System roles cannot be made inactive.",
        403
      );
    }

    if (
      status === "inactive"
    ) {
      const assignedUsersCount =
        await countAssignedUsers(
          role
        );

      if (
        assignedUsersCount > 0
      ) {
        throw createServiceError(
          "This role cannot be made inactive while users are assigned to it.",
          409
        );
      }
    }

    role.status =
      status;

    role.updatedBy =
      actorUserId ||
      null;

    await role.save();

    return attachAssignedUserCount(
      role.toObject()
    );
  };

/* =========================================================
   DELETE ROLE

   System roles delete nahi hongi.

   Assigned users wali custom role bhi pehle unassign karni
   hogi.
   ========================================================= */

export const deleteRoleService =
  async (
    roleId
  ) => {
    const role =
      await findRoleOrThrow(
        roleId
      );

    if (
      role.isSystemRole ||
      SYSTEM_ROLE_SLUGS.includes(
        role.slug
      )
    ) {
      throw createServiceError(
        "System roles cannot be deleted.",
        403
      );
    }

    const assignedUsersCount =
      await countAssignedUsers(
        role
      );

    if (
      assignedUsersCount > 0
    ) {
      throw createServiceError(
        `This role is assigned to ${assignedUsersCount} user${assignedUsersCount === 1 ? "" : "s"}. Remove or change their role before deleting it.`,
        409
      );
    }

    await role.deleteOne();

    return {
      roleId:
        String(role._id),

      roleName:
        role.name,

      roleSlug:
        role.slug,

      message:
        "Role deleted successfully.",
    };
  };

/* =========================================================
   ENSURE SYSTEM ROLES

   Existing Admin aur Super Admin users ki future migration
   ke liye Role documents automatically ensure kiye ja sakte
   hain.

   Is function ko later database bootstrap se call karenge.
   ========================================================= */

export const ensureSystemRolesService =
  async () => {
    const systemRoles = [
      {
        name:
          "Super Admin",

        slug:
          "super_admin",

        description:
          "Complete system access.",

        permissions: [],

        isSystemRole: true,

        status: "active",
      },

      {
        name: "Admin",

        slug: "admin",

        description:
          "Administrative system access.",

        permissions: [],

        isSystemRole: true,

        status: "active",
      },
    ];

    const ensuredRoles = [];

    for (
      const systemRole of
      systemRoles
    ) {
      const role =
        await Role.findOneAndUpdate(
          {
            slug:
              systemRole.slug,
          },
          {
            $set: {
              name:
                systemRole.name,

              description:
                systemRole.description,

              isSystemRole: true,

              status: "active",
            },

            $setOnInsert: {
              permissions:
                systemRole.permissions,

              createdBy: null,
              updatedBy: null,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert:
              true,
          }
        );

      ensuredRoles.push(
        role
      );
    }

    return ensuredRoles;
  };