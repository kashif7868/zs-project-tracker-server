import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   SYSTEM ROLES

   In roles ko dashboard se delete nahi kiya jayega.

   Custom roles:
   Accountant
   Sales
   Staff
   Electrical Engineer
   Management Team

   Dashboard se dynamically create honge.
   ========================================================= */

export const SYSTEM_ROLE_SLUGS = [
  "super_admin",
  "admin",
];

/* =========================================================
   ROLE STATUS
   ========================================================= */

export const ROLE_STATUSES = [
  "active",
  "inactive",
];

/* =========================================================
   CREATE ROLE SLUG

   Example:

   Electrical Engineer
   electrical_engineer
   ========================================================= */

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

/* =========================================================
   ROLE SCHEMA

   Dynamic role structure:

   name
   slug
   description
   permissions
   isSystemRole
   status
   createdBy
   updatedBy
   ========================================================= */

const roleSchema = new Schema(
  {
    /* =====================================================
       DISPLAY NAME

       Examples:

       Super Admin
       Admin
       Electrical Engineer
       Management Team
       Accountant
       Sales Executive
       ===================================================== */

    name: {
      type: String,

      required: [
        true,
        "Role name is required.",
      ],

      trim: true,

      minlength: [
        2,
        "Role name must contain at least 2 characters.",
      ],

      maxlength: [
        100,
        "Role name cannot exceed 100 characters.",
      ],

      index: true,
    },

    /* =====================================================
       UNIQUE SLUG

       Backend authorization mein slug use hoga.

       Examples:

       super_admin
       electrical_engineer
       management_team
       accountant
       sales_executive
       ===================================================== */

    slug: {
      type: String,

      required: [
        true,
        "Role slug is required.",
      ],

      unique: true,

      lowercase: true,

      trim: true,

      minlength: [
        2,
        "Role slug must contain at least 2 characters.",
      ],

      maxlength: [
        100,
        "Role slug cannot exceed 100 characters.",
      ],

      match: [
        /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
        "Role slug can contain lowercase letters, numbers and underscores only.",
      ],

      index: true,
    },

    /* =====================================================
       DESCRIPTION
       ===================================================== */

    description: {
      type: String,

      default: "",

      trim: true,

      maxlength: [
        1000,
        "Role description cannot exceed 1000 characters.",
      ],
    },

    /* =====================================================
       PERMISSIONS

       Permissions dynamic strings hain.

       Role model mein hardcoded enum nahi hai, is liye naye
       employee roles create karne ke liye model update nahi
       karna padega.

       Examples:

       dashboard.view
       projects.view
       risks.create
       risks.update
       evidence.upload
       users.view
       ===================================================== */

    permissions: [
      {
        type: String,

        trim: true,

        lowercase: true,

        maxlength: [
          150,
          "Permission key cannot exceed 150 characters.",
        ],
      },
    ],

    /* =====================================================
       SYSTEM ROLE

       true:
       Super Admin / Admin jaise protected roles.

       false:
       Dashboard se banaye gaye custom roles.
       ===================================================== */

    isSystemRole: {
      type: Boolean,

      default: false,

      index: true,
    },

    /* =====================================================
       STATUS

       inactive role assigned users ko authorization nahi
       milegi.
       ===================================================== */

    status: {
      type: String,

      enum: {
        values: ROLE_STATUSES,

        message:
          "Role status must be active or inactive.",
      },

      default: "active",

      index: true,
    },

    /* =====================================================
       AUDIT REFERENCES
       ===================================================== */

    createdBy: {
      type: Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },
  },
  {
    timestamps: true,

    versionKey: false,

    strict: true,
  }
);

/* =========================================================
   NORMALIZE ROLE VALUES

   Mongoose 9 compatible:

   - no next parameter
   - no next() call
   ========================================================= */

roleSchema.pre(
  "validate",
  function normalizeRoleValues() {
    if (
      typeof this.name ===
      "string"
    ) {
      this.name =
        this.name
          .trim()
          .replace(/\s+/g, " ");
    }

    if (
      typeof this.slug !==
        "string" ||
      !this.slug.trim()
    ) {
      this.slug =
        createRoleSlug(
          this.name
        );
    } else {
      this.slug =
        createRoleSlug(
          this.slug
        );
    }

    if (
      typeof this.description ===
      "string"
    ) {
      this.description =
        this.description.trim();
    }

    if (
      Array.isArray(
        this.permissions
      )
    ) {
      this.permissions = [
        ...new Set(
          this.permissions
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
    }

    if (
      SYSTEM_ROLE_SLUGS.includes(
        this.slug
      )
    ) {
      this.isSystemRole =
        true;
    }
  }
);

/* =========================================================
   ROLE LIST INDEX
   ========================================================= */

roleSchema.index(
  {
    status: 1,
    name: 1,
  },
  {
    name:
      "role_status_name_index",
  }
);

/* =========================================================
   JSON RESPONSE
   ========================================================= */

roleSchema.set("toJSON", {
  transform(
    _document,
    returnedObject
  ) {
    delete returnedObject.__v;

    return returnedObject;
  },
});

/* =========================================================
   MODEL EXPORT
   ========================================================= */

const Role =
  mongoose.models.Role ||
  mongoose.model(
    "Role",
    roleSchema
  );

export default Role;