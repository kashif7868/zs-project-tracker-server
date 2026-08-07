import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   USER SCHEMA

   Role architecture:

   user
   admin
   super_admin
   accountant
   sales
   electrical_engineer
   management_team
   staff

   Custom role slugs Role collection se dashboard par
   dynamically create hongi.

   User model dobara update karne ki zarurat nahi hogi.
   ========================================================= */

const userSchema = new Schema(
  {
    name: {
      type: String,

      required: [
        true,
        "Name is required",
      ],

      trim: true,

      maxlength: [
        150,
        "Name cannot exceed 150 characters",
      ],
    },

    email: {
      type: String,

      required: [
        true,
        "Email is required",
      ],

      unique: true,

      lowercase: true,

      trim: true,

      index: true,
    },

    password: {
      type: String,

      required: function () {
        return (
          this.provider ===
          "local"
        );
      },

      minlength: [
        6,
        "Password must contain at least 6 characters",
      ],
    },

    phone: {
      type: String,

      default: "",

      trim: true,
    },

    countryCode: {
      type: String,

      default: "",

      trim: true,
    },

    /* =====================================================
       DYNAMIC ROLE SLUG

       New registration:
       user

       Admin assignment examples:
       accountant
       sales
       electrical_engineer
       management_team

       Role permissions separate roles collection mein hain.
       ===================================================== */

    role: {
      type: String,

      required: [
        true,
        "User role is required",
      ],

      default: "user",

      lowercase: true,

      trim: true,

      match: [
        /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
        "Role must contain lowercase letters, numbers and underscores only",
      ],

      index: true,
    },

    /* =====================================================
       ROLE ASSIGNMENT AUDIT
       ===================================================== */

    roleAssignedBy: {
      type: Schema.Types.ObjectId,

      ref: "User",

      default: null,
    },

    roleAssignedAt: {
      type: Date,

      default: null,
    },

    avatar: {
      type: String,

      default: "",

      trim: true,
    },

    provider: {
      type: String,

      enum: [
        "local",
        "google",
        "facebook",
        "github",
      ],

      default: "local",
    },

    isVerified: {
      type: Boolean,

      default: false,

      index: true,
    },

    isPhoneVerified: {
      type: Boolean,

      default: false,
    },

    is2FAEnabled: {
      type: Boolean,

      default: false,
    },

    twoFASecret: {
      type: String,

      default: "",
    },

    refreshToken: {
      type: String,

      default: "",
    },

    passwordResetToken: {
      type: String,

      default: "",
    },

    passwordResetExpires: {
      type: Date,

      default: null,
    },

    emailVerificationToken: {
      type: String,

      default: "",
    },

    emailVerificationExpires: {
      type: Date,

      default: null,
    },

    phoneVerificationOtp: {
      type: String,

      default: "",
    },

    phoneVerificationExpires: {
      type: Date,

      default: null,
    },

    phoneVerificationAttempts: {
      type: Number,

      default: 0,

      min: 0,
    },

    phoneVerificationLastSentAt: {
      type: Date,

      default: null,
    },

    status: {
      type: String,

      enum: [
        "active",
        "inactive",
        "blocked",
      ],

      default: "active",

      index: true,
    },
  },
  {
    timestamps: true,

    versionKey: false,

    strict: true,
  }
);

/* =========================================================
   USER MANAGEMENT INDEX
   ========================================================= */

userSchema.index(
  {
    role: 1,
    status: 1,
    createdAt: -1,
  },
  {
    name:
      "user_role_status_index",
  }
);

/* =========================================================
   NORMALIZE USER VALUES

   Mongoose 9 compatible:
   no next parameter and no next() call.
   ========================================================= */

userSchema.pre(
  "validate",
  function normalizeUserValues() {
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
      typeof this.email ===
      "string"
    ) {
      this.email =
        this.email
          .trim()
          .toLowerCase();
    }

    if (
      typeof this.role ===
      "string"
    ) {
      this.role =
        this.role
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
    }

    if (
      typeof this.phone ===
      "string"
    ) {
      this.phone =
        this.phone.trim();
    }

    if (
      typeof this.countryCode ===
      "string"
    ) {
      this.countryCode =
        this.countryCode.trim();
    }

    if (
      typeof this.avatar ===
      "string"
    ) {
      this.avatar =
        this.avatar.trim();
    }
  }
);

/* =========================================================
   SAFE JSON RESPONSE
   ========================================================= */

userSchema.set("toJSON", {
  transform(
    _document,
    returnedObject
  ) {
    delete returnedObject.password;
    delete returnedObject.refreshToken;

    delete returnedObject.twoFASecret;

    delete returnedObject.passwordResetToken;
    delete returnedObject.passwordResetExpires;

    delete returnedObject.emailVerificationToken;
    delete returnedObject.emailVerificationExpires;

    delete returnedObject.phoneVerificationOtp;
    delete returnedObject.phoneVerificationExpires;
    delete returnedObject.phoneVerificationAttempts;
    delete returnedObject.phoneVerificationLastSentAt;

    delete returnedObject.__v;

    return returnedObject;
  },
});

/* =========================================================
   MODEL EXPORT
   ========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema
  );

export default User;